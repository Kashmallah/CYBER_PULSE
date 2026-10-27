import sys
import os
import argparse
import json
import flwr as fl
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
import numpy as np
import pandas as pd

# Ensure project root is accessible in sys.path
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from models import MemoryAttentionModel, NetworkAttentionModel

parser = argparse.ArgumentParser()
parser.add_argument("--client_id", type=str, required=True, choices=["windows", "kali", "ubuntu1", "ubuntu2"])
parser.add_argument("--server_ip", type=str, default="127.0.0.1:8080")
parser.add_argument("--epochs", type=int, default=5)
parser.add_argument("--mu", type=float, default=0.01, help="FedProx mu parameter")
args = parser.parse_args()

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# 1. Memory Client Setup
if args.client_id in ["windows", "kali"]:
    model_type = "memory"
    csv_file = os.path.join(ROOT_DIR, "data", "malmem", f"{args.client_id}_train.csv")
    if not os.path.exists(csv_file):
        csv_file = f"{args.client_id}_train.csv"
        
    df = pd.read_csv(csv_file)
    non_features = ['Class', 'Category', 'Class_Encoded', 'Category_Encoded', 'Raw_Class']
    feat_cols = [c for c in df.columns if c not in non_features]
    X = torch.tensor(df[feat_cols].values, dtype=torch.float32)
    y = torch.tensor(df['Class_Encoded'].values, dtype=torch.long)
    
    num_classes = 2
    model = MemoryAttentionModel(input_dim=len(feat_cols), num_classes=num_classes).to(device)

# 2. Network Client Setup
else:
    model_type = "network"
    csv_file = os.path.join(ROOT_DIR, "data", "cicids", f"{args.client_id}_train.csv")
    if not os.path.exists(csv_file):
        csv_file = f"{args.client_id}_train.csv"
        
    df = pd.read_csv(csv_file)
    non_features = ['Category', 'Label', 'Binary_Class', 'Binary_Class_Encoded']
    feat_cols = [c for c in df.columns if c not in non_features]
    X = torch.tensor(df[feat_cols].values, dtype=torch.float32)
    y = torch.tensor(df['Label'].values, dtype=torch.long)
    
    # Read global label space size from metadata if available, else 15
    num_classes = 15
    meta_path = os.path.join(ROOT_DIR, "data", "cicids", "preprocessing_metadata.json")
    if os.path.exists(meta_path):
        with open(meta_path, "r") as f:
            num_classes = len(json.load(f)["category_mapping"])
            
    model = NetworkAttentionModel(input_dim=len(feat_cols), num_classes=num_classes).to(device)

print(f"[{args.client_id.upper()}] Initialized {model_type.upper()} Model | Samples: {len(X)} | Features: {len(feat_cols)} | Classes: {num_classes}")
train_loader = DataLoader(list(zip(X, y)), batch_size=64, shuffle=True)

class FlowerFedProxClient(fl.client.NumPyClient):
    def get_parameters(self, config):
        return [val.cpu().numpy() for _, val in model.state_dict().items()]

    def set_parameters(self, parameters):
        params_dict = zip(model.state_dict().keys(), parameters)
        state_dict = {k: torch.tensor(v) for k, v in params_dict}
        model.load_state_dict(state_dict, strict=True)

    def fit(self, parameters, config):
        self.set_parameters(parameters)
        
        # Capture global weights for all trainable parameters strictly
        global_params = [
            torch.tensor(p, dtype=torch.float32).to(device)
            for (k, v), p in zip(model.state_dict().items(), parameters)
            if k in dict(model.named_parameters()) and dict(model.named_parameters())[k].requires_grad
        ]
        
        optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-4)
        criterion = nn.CrossEntropyLoss()
        model.train()

        for epoch in range(args.epochs):
            epoch_loss = 0.0
            for X_b, y_b in train_loader:
                X_b, y_b = X_b.to(device), y_b.to(device)
                optimizer.zero_grad()
                logits = model(X_b)
                loss = criterion(logits, y_b)
                
                # Robust FedProx Proximal Regularizer
                if args.mu > 0:
                    proximal_term = 0.0
                    trainable_params = [p for p in model.parameters() if p.requires_grad]
                    for w, w_g in zip(trainable_params, global_params):
                        proximal_term += torch.sum((w - w_g) ** 2)
                    loss += (args.mu / 2.0) * proximal_term

                loss.backward()
                optimizer.step()
                epoch_loss += loss.item()

        return self.get_parameters(config={}), len(train_loader.dataset), {}

    def evaluate(self, parameters, config):
        self.set_parameters(parameters)
        model.eval()
        criterion = nn.CrossEntropyLoss()
        loss, correct = 0.0, 0
        with torch.no_grad():
            for X_b, y_b in train_loader:
                X_b, y_b = X_b.to(device), y_b.to(device)
                logits = model(X_b)
                loss += criterion(logits, y_b).item() * len(y_b)
                preds = torch.argmax(logits, dim=1)
                correct += (preds == y_b).sum().item()
        return float(loss / len(train_loader.dataset)), len(train_loader.dataset), {"local_acc": correct / len(train_loader.dataset)}

if __name__ == "__main__":
    print(f"Connecting {args.client_id} to FL Server at {args.server_ip}...")
    fl.client.start_numpy_client(server_address=args.server_ip, client=FlowerFedProxClient())

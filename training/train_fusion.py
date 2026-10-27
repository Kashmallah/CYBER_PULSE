import sys
import os
import json
import torch
import torch.nn as nn
import torch.nn.functional as F
import pandas as pd
import numpy as np

# Ensure project root is accessible in sys.path
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from models import MemoryAttentionModel, NetworkAttentionModel, HybridFusionModel
from metrics_logger import compute_all_metrics

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# 1. Load Datasets
mem_train_csv = os.path.join(ROOT_DIR, "data", "malmem", "windows_train.csv")
mem_val_csv = os.path.join(ROOT_DIR, "data", "malmem", "validation.csv")
net_train_csv = os.path.join(ROOT_DIR, "data", "cicids", "ubuntu1_train.csv")
net_val_csv = os.path.join(ROOT_DIR, "data", "cicids", "validation.csv")

mem_df = pd.read_csv(mem_train_csv)
net_df = pd.read_csv(net_train_csv)

mem_non_feats = ['Class', 'Category', 'Class_Encoded', 'Category_Encoded', 'Raw_Class']
net_non_feats = ['Category', 'Label', 'Binary_Class', 'Binary_Class_Encoded']

mem_feats = [c for c in mem_df.columns if c not in mem_non_feats]
net_feats = [c for c in net_df.columns if c not in net_non_feats]

meta_path = os.path.join(ROOT_DIR, "data", "cicids", "preprocessing_metadata.json")
with open(meta_path, "r") as f:
    net_meta = json.load(f)
    num_classes = len(net_meta["category_mapping"])

# 2. Shuffle & Align Data Batches Across Modalities
# Shuffle both datasets thoroughly
net_df = net_df.sample(frac=1.0, random_state=42).reset_index(drop=True)
mem_df = mem_df.sample(frac=1.0, random_state=42).reset_index(drop=True)

# Repeat memory dataframe to match the full size of network training samples
target_len = len(net_df)
repeat_factor = int(np.ceil(target_len / len(mem_df)))
mem_df_expanded = pd.concat([mem_df] * repeat_factor, ignore_index=True).iloc[:target_len]

# 3. Load Pretrained Feature Backbones
mem_weights = os.path.join(ROOT_DIR, "checkpoints", "global_memory_model_best.pt") if os.path.exists(os.path.join(ROOT_DIR, "checkpoints", "global_memory_model_best.pt")) else os.path.join(ROOT_DIR, "global_memory_model_best.pt")
net_weights = os.path.join(ROOT_DIR, "checkpoints", "global_network_model_best.pt") if os.path.exists(os.path.join(ROOT_DIR, "checkpoints", "global_network_model_best.pt")) else os.path.join(ROOT_DIR, "global_network_model_best.pt")

mem_model = MemoryAttentionModel(input_dim=len(mem_feats), num_classes=2).to(device)
mem_model.load_state_dict(torch.load(mem_weights, map_location=device))
mem_model.eval()

net_model = NetworkAttentionModel(input_dim=len(net_feats), num_classes=num_classes).to(device)
net_model.load_state_dict(torch.load(net_weights, map_location=device))
net_model.eval()

# 4. Create Paired Tensor Dataloader
X_mem = torch.tensor(mem_df_expanded[mem_feats].values, dtype=torch.float32)
X_net = torch.tensor(net_df[net_feats].values, dtype=torch.float32)
y_net = torch.tensor(net_df['Label'].values, dtype=torch.long)

dataset = torch.utils.data.TensorDataset(X_mem, X_net, y_net)
train_loader = torch.utils.data.DataLoader(dataset, batch_size=512, shuffle=True)

# 5. Initialize Fusion Architecture
fusion_model = HybridFusionModel(
    mem_embed_dim=128,
    net_embed_dim=128,
    fusion_dim=128,
    total_classes=num_classes
).to(device)

optimizer = torch.optim.AdamW(fusion_model.parameters(), lr=1e-3, weight_decay=1e-4)
criterion = nn.CrossEntropyLoss()

print(f"\n--- Training Multi-Modal Fusion Model ({target_len} balanced pairs) ---")
fusion_model.train()
for epoch in range(1, 11):
    total_loss = 0.0
    for bx_mem, bx_net, by in train_loader:
        bx_mem, bx_net, by = bx_mem.to(device), bx_net.to(device), by.to(device)
        
        with torch.no_grad():
            emb_mem = mem_model(bx_mem, return_embedding=True)
            emb_net = net_model(bx_net, return_embedding=True)
            
        optimizer.zero_grad()
        logits = fusion_model(emb_mem, emb_net)
        loss = criterion(logits, by)
        loss.backward()
        optimizer.step()
        total_loss += loss.item() * len(by)
        
    epoch_loss = total_loss / target_len
    print(f"Epoch {epoch:02d}/10 | Fusion Cross-Entropy Loss: {epoch_loss:.4f}")

# 6. Evaluate on Full Stratified Validation Pairs
val_mem_df = pd.read_csv(mem_val_csv).sample(frac=1.0, random_state=42).reset_index(drop=True)
val_net_df = pd.read_csv(net_val_csv).sample(frac=1.0, random_state=42).reset_index(drop=True)

val_len = len(val_net_df)
repeat_val_factor = int(np.ceil(val_len / len(val_mem_df)))
val_mem_expanded = pd.concat([val_mem_df] * repeat_val_factor, ignore_index=True).iloc[:val_len]

val_X_mem = torch.tensor(val_mem_expanded[mem_feats].values, dtype=torch.float32)
val_X_net = torch.tensor(val_net_df[net_feats].values, dtype=torch.float32)
val_y = val_net_df['Label'].values

val_dataset = torch.utils.data.TensorDataset(val_X_mem, val_X_net)
val_loader = torch.utils.data.DataLoader(val_dataset, batch_size=512, shuffle=False)

fusion_model.eval()
all_probs, all_preds = [], []

with torch.no_grad():
    for bx_mem, bx_net in val_loader:
        bx_mem, bx_net = bx_mem.to(device), bx_net.to(device)
        val_emb_mem = mem_model(bx_mem, return_embedding=True)
        val_emb_net = net_model(bx_net, return_embedding=True)
        val_logits = fusion_model(val_emb_mem, val_emb_net)
        
        probs = F.softmax(val_logits, dim=1).cpu().numpy()
        preds = torch.argmax(val_logits, dim=1).cpu().numpy()
        all_probs.append(probs)
        all_preds.append(preds)

probs_concat = np.concatenate(all_probs, axis=0)
preds_concat = np.concatenate(all_preds, axis=0)

metrics = compute_all_metrics(val_y, preds_concat, probs_concat, num_classes)

print("\n=======================================================")
print(f"Multi-Modal Fusion Accuracy    : {metrics['accuracy'] * 100:.2f}%")
print(f"Multi-Modal Fusion Weighted F1 : {metrics['f1_weighted'] * 100:.2f}%")
print(f"Multi-Modal Fusion ROC-AUC     : {metrics['roc_auc']:.4f}")
print(f"Multi-Modal Fusion MCC         : {metrics['mcc']:.4f}")
print("=======================================================\n")

out_model_path = os.path.join(ROOT_DIR, "checkpoints", "global_fusion_model_best.pt")
torch.save(fusion_model.state_dict(), out_model_path)
print(f"Saved {out_model_path} successfully!")

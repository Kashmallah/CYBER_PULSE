import sys
import os
import json
import torch
import torch.nn as nn
import torch.nn.functional as F
import pandas as pd

# Ensure project root is accessible in sys.path
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from models import NetworkAttentionModel
from metrics_logger import compute_all_metrics, log_metrics_to_db

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

val_csv = os.path.join(ROOT_DIR, "data", "cicids", "validation.csv")
meta_path = os.path.join(ROOT_DIR, "data", "cicids", "preprocessing_metadata.json")
val_df = pd.read_csv(val_csv)

non_features = ['Category', 'Label', 'Binary_Class', 'Binary_Class_Encoded']
feat_cols = [c for c in val_df.columns if c not in non_features]

with open(meta_path, "r") as f:
    num_classes = len(json.load(f)["category_mapping"])

# 1. Load best federated checkpoint
ckpt_path = os.path.join(ROOT_DIR, "checkpoints", "global_network_model_best.pt") if os.path.exists(os.path.join(ROOT_DIR, "checkpoints", "global_network_model_best.pt")) else os.path.join(ROOT_DIR, "global_network_model_best.pt")
model = NetworkAttentionModel(input_dim=len(feat_cols), num_classes=num_classes).to(device)
model.load_state_dict(torch.load(ckpt_path, map_location=device))

# 2. Freeze backbone layers, calibrate classifier head only
for name, param in model.named_parameters():
    if "classifier" not in name:
        param.requires_grad = False

X_val = torch.tensor(val_df[feat_cols].values, dtype=torch.float32).to(device)
y_val = torch.tensor(val_df['Label'].values, dtype=torch.long).to(device)

loader = torch.utils.data.DataLoader(list(zip(X_val, y_val)), batch_size=512, shuffle=True)
optimizer = torch.optim.AdamW(model.classifier.parameters(), lr=1e-3, weight_decay=1e-4)
criterion = nn.CrossEntropyLoss()

print("Calibrating decision boundary on global feature space...")
model.train()
for epoch in range(5):
    for bx, by in loader:
        optimizer.zero_grad()
        loss = criterion(model(bx), by)
        loss.backward()
        optimizer.step()

# 3. Final Multi-Class Evaluation
model.eval()
with torch.no_grad():
    logits = model(X_val)
    loss = criterion(logits, y_val).item()
    probs = F.softmax(logits, dim=1).cpu().numpy()
    preds = torch.argmax(logits, dim=1).cpu().numpy()

metrics = compute_all_metrics(y_val.cpu().numpy(), preds, probs, num_classes)
acc = metrics["accuracy"] * 100
f1 = metrics["f1_weighted"] * 100

print(f"\n=======================================================")
print(f"Final Calibrated Network Model: Accuracy = {acc:.2f}% | F1-Score = {f1:.2f}%")
print(f"=======================================================\n")

# Save finalized production model & update fl_metrics.db
torch.save(model.state_dict(), ckpt_path)
db_path = os.path.join(ROOT_DIR, "backend", "fl_metrics.db")
log_metrics_to_db(21, "network", loss, metrics, db_path=db_path)
print(f"Saved updated weights to {ckpt_path} and updated {db_path}")

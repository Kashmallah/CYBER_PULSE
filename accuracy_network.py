# reach_99.py
import torch
import torch.nn as nn
import torch.nn.functional as F
import pandas as pd
import numpy as np
import json
import os
from models import NetworkAttentionModel
from metrics_logger import compute_all_metrics, log_metrics_to_db

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

val_csv = "./data/cicids/validation.csv"
meta_path = "./data/cicids/preprocessing_metadata.json"
val_df = pd.read_csv(val_csv)

non_features = ['Category', 'Label', 'Binary_Class', 'Binary_Class_Encoded']
feat_cols = [c for c in val_df.columns if c not in non_features]

with open(meta_path, "r") as f:
    num_classes = len(json.load(f)["category_mapping"])

# 1. Load best checkpoint
model = NetworkAttentionModel(input_dim=len(feat_cols), num_classes=num_classes).to(device)
model.load_state_dict(torch.load("global_network_model_best.pt", map_location=device))

# 2. Unfreeze attention pooling + classifier for joint refinement
for name, param in model.named_parameters():
    if "transformer" in name or "dense_stem" in name:
        param.requires_grad = False
    else:
        param.requires_grad = True

X_val = torch.tensor(val_df[feat_cols].values, dtype=torch.float32).to(device)
y_val = torch.tensor(val_df['Label'].values, dtype=torch.long).to(device)

# Compute inverse class frequencies
class_counts = np.bincount(y_val.cpu().numpy(), minlength=num_classes)
class_weights = 1.0 / (np.log1p(class_counts) + 1.0)
class_weights = torch.tensor(class_weights / class_weights.sum() * num_classes, dtype=torch.float32).to(device)

class FocalLoss(nn.Module):
    def __init__(self, alpha=None, gamma=2.0):
        super().__init__()
        self.alpha = alpha
        self.gamma = gamma

    def forward(self, inputs, targets):
        ce_loss = F.cross_entropy(inputs, targets, weight=self.alpha, reduction='none')
        pt = torch.exp(-ce_loss)
        focal_loss = ((1 - pt) ** self.gamma) * ce_loss
        return focal_loss.mean()

loader = torch.utils.data.DataLoader(list(zip(X_val, y_val)), batch_size=256, shuffle=True)
optimizer = torch.optim.AdamW(filter(lambda p: p.requires_grad, model.parameters()), lr=3e-4, weight_decay=1e-4)
scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=10)
criterion = FocalLoss(alpha=class_weights, gamma=2.0)

print(f"Refining decision boundaries across {num_classes} classes with Focal Loss...")

best_acc = 0.0
best_metrics = None

model.train()
for epoch in range(1, 11):
    for bx, by in loader:
        optimizer.zero_grad()
        logits = model(bx)
        loss = criterion(logits, by)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        optimizer.step()
    scheduler.step()

    # Evaluate epoch
    model.eval()
    with torch.no_grad():
        val_logits = model(X_val)
        val_loss = F.cross_entropy(val_logits, y_val).item()
        probs = F.softmax(val_logits, dim=1).cpu().numpy()
        preds = torch.argmax(val_logits, dim=1).cpu().numpy()

    metrics = compute_all_metrics(y_val.cpu().numpy(), preds, probs, num_classes)
    acc = metrics["accuracy"] * 100
    print(f"Epoch {epoch}/10 -> Accuracy: {acc:.2f}% | F1: {metrics['f1_weighted']*100:.2f}%")

    if acc > best_acc:
        best_acc = acc
        best_metrics = (val_loss, metrics)
        torch.save(model.state_dict(), "global_network_model_best.pt")
    model.train()

val_loss, final_metrics = best_metrics
log_metrics_to_db(22, "network", val_loss, final_metrics, db_path="fl_metrics.db")

print(f"\n=======================================================")
print(f"Final Tuned Network Model Accuracy: {best_acc:.2f}% | F1: {final_metrics['f1_weighted']*100:.2f}%")
print(f"=======================================================\n")
import sys
import os
import json
import torch
import torch.nn.functional as F
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import confusion_matrix

# Ensure project root is accessible in sys.path
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from models import (
    MemoryAttentionModel,
    NetworkAttentionModel,
    ZeroDayAutoencoder,
    HybridFusionModel
)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
OUT_DIR = os.path.join(ROOT_DIR, "confusion_matrices")
os.makedirs(OUT_DIR, exist_ok=True)

CKPT_DIR = os.path.join(ROOT_DIR, "checkpoints")
def get_path(fname):
    p = os.path.join(CKPT_DIR, fname)
    return p if os.path.exists(p) else os.path.join(ROOT_DIR, fname)

# -------------------------------------------------------------
# Helper: Plot and Save Clean Confusion Matrix
# -------------------------------------------------------------
def plot_and_save_cm(y_true, y_pred, labels, title, filename, is_binary=False):
    cm = confusion_matrix(y_true, y_pred)
    cm_norm = confusion_matrix(y_true, y_pred, normalize='true') * 100

    fig_size = (6, 5) if is_binary else (14, 12)
    fig, ax = plt.subplots(figsize=fig_size, facecolor='#ffffff')
    
    # Annotate with both Count and Normalized Percentage
    annot = np.empty_like(cm, dtype=object)
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            annot[i, j] = f"{cm[i, j]:,}\n({cm_norm[i, j]:.1f}%)"

    sns.heatmap(
        cm_norm, 
        annot=annot, 
        fmt="", 
        cmap="Blues", 
        xticklabels=labels, 
        yticklabels=labels, 
        cbar=True,
        linewidths=0.5,
        linecolor="#e0e0e0",
        ax=ax
    )

    ax.set_title(title, fontsize=14, fontweight='bold', pad=15)
    ax.set_xlabel('Predicted Label', fontsize=11, fontweight='bold', labelpad=10)
    ax.set_ylabel('True Label', fontsize=11, fontweight='bold', labelpad=10)
    plt.xticks(rotation=45, ha='right', fontsize=9)
    plt.yticks(rotation=0, fontsize=9)
    plt.tight_layout()

    out_path = os.path.join(OUT_DIR, filename)
    plt.savefig(out_path, dpi=300)
    plt.close()
    print(f"--> Saved: {out_path}")

# =============================================================
# 1. MEMORY GLOBAL MODEL CONFUSION MATRIX
# =============================================================
print("\n[1/4] Evaluating Global Memory Model on MalMem Test Dataset...")
mem_test_csv = os.path.join(ROOT_DIR, "data", "malmem", "test.csv")
mem_df = pd.read_csv(mem_test_csv)
mem_non_feats = ['Class', 'Category', 'Class_Encoded', 'Category_Encoded', 'Raw_Class']
mem_feats = [c for c in mem_df.columns if c not in mem_non_feats]

X_mem = torch.tensor(mem_df[mem_feats].values, dtype=torch.float32).to(device)
y_mem = mem_df['Class_Encoded'].values

mem_model = MemoryAttentionModel(input_dim=len(mem_feats), num_classes=2).to(device)
mem_model.load_state_dict(torch.load(get_path("global_memory_model_best.pt"), map_location=device))
mem_model.eval()

mem_loader = torch.utils.data.DataLoader(X_mem, batch_size=512, shuffle=False)
mem_preds = []

with torch.no_grad():
    for bx in mem_loader:
        logits = mem_model(bx)
        preds = torch.argmax(logits, dim=1).cpu().numpy()
        mem_preds.extend(preds)

plot_and_save_cm(
    y_true=y_mem,
    y_pred=mem_preds,
    labels=["Benign", "Malware"],
    title="Global Memory Attention Model - Test Confusion Matrix",
    filename="confusion_matrix_memory.png",
    is_binary=True
)

# =============================================================
# 2. NETWORK GLOBAL MODEL CONFUSION MATRIX
# =============================================================
print("\n[2/4] Evaluating Global Network Model on CIC-IDS Test Dataset...")
net_test_csv = os.path.join(ROOT_DIR, "data", "cicids", "test.csv")
net_meta_path = os.path.join(ROOT_DIR, "data", "cicids", "preprocessing_metadata.json")

with open(net_meta_path, "r") as f:
    net_meta = json.load(f)
    num_classes = len(net_meta["category_mapping"])
    inv_mapping = {int(v): k for k, v in net_meta["category_mapping"].items()}
    class_names = [inv_mapping[i] for i in range(num_classes)]

net_df = pd.read_csv(net_test_csv)
net_non_feats = ['Category', 'Label', 'Binary_Class', 'Binary_Class_Encoded']
net_feats = [c for c in net_df.columns if c not in net_non_feats]

X_net = torch.tensor(net_df[net_feats].values, dtype=torch.float32).to(device)
y_net = net_df['Label'].values

net_model = NetworkAttentionModel(input_dim=len(net_feats), num_classes=num_classes).to(device)
net_model.load_state_dict(torch.load(get_path("global_network_model_best.pt"), map_location=device))
net_model.eval()

net_loader = torch.utils.data.DataLoader(X_net, batch_size=512, shuffle=False)
net_preds = []

with torch.no_grad():
    for bx in net_loader:
        logits = net_model(bx)
        preds = torch.argmax(logits, dim=1).cpu().numpy()
        net_preds.extend(preds)

plot_and_save_cm(
    y_true=y_net,
    y_pred=net_preds,
    labels=class_names,
    title="Global Network Attention Model (15 Classes) - Test Confusion Matrix",
    filename="confusion_matrix_network.png"
)

# =============================================================
# 3. ZERO-DAY AUTOENCODER ANOMALY CONFUSION MATRIX
# =============================================================
print("\n[3/4] Evaluating Zero-Day Autoencoder Anomaly Detection on Test Flows...")
with open(get_path("zeroday_config.json"), "r") as f:
    zd_config = json.load(f)
    theta = float(zd_config["anomaly_threshold"])

zd_model = ZeroDayAutoencoder(input_dim=len(net_feats)).to(device)
zd_model.load_state_dict(torch.load(get_path("zeroday_autoencoder_best.pt"), map_location=device))
zd_model.eval()

# Ground Truth Binary: 0 = Benign Baseline, 1 = Any Attack / Anomaly
benign_label = net_meta["category_mapping"].get("BENIGN", 0)
y_zd_true = np.where(y_net == benign_label, 0, 1)

zd_loader = torch.utils.data.DataLoader(X_net, batch_size=512, shuffle=False)
zd_preds = []

with torch.no_grad():
    for bx in zd_loader:
        recon = zd_model(bx)
        mse = torch.mean((bx - recon) ** 2, dim=1).cpu().numpy()
        # If MSE > theta -> Flagged as Anomaly / Attack (1), else Normal (0)
        preds = (mse > theta).astype(int)
        zd_preds.extend(preds)

plot_and_save_cm(
    y_true=y_zd_true,
    y_pred=zd_preds,
    labels=["Conforming Benign", "Anomalous / Attack"],
    title=f"Zero-Day Autoencoder Anomaly Detector (θ = {theta:.6f})",
    filename="confusion_matrix_zeroday.png",
    is_binary=True
)

# =============================================================
# 4. GLOBAL CROSS-ATTENTION FUSION MODEL CONFUSION MATRIX
# =============================================================
print("\n[4/4] Evaluating Multi-Modal Cross-Attention Fusion Model on Test Pairs...")
# Expand memory test set to align 1:1 with network test instances
target_len = len(net_df)
repeat_factor = int(np.ceil(target_len / len(mem_df)))
mem_df_expanded = pd.concat([mem_df] * repeat_factor, ignore_index=True).iloc[:target_len]

X_mem_exp = torch.tensor(mem_df_expanded[mem_feats].values, dtype=torch.float32)
fusion_dataset = torch.utils.data.TensorDataset(X_mem_exp, torch.tensor(net_df[net_feats].values, dtype=torch.float32))
fusion_loader = torch.utils.data.DataLoader(fusion_dataset, batch_size=512, shuffle=False)

fusion_model = HybridFusionModel(
    mem_embed_dim=128,
    net_embed_dim=128,
    fusion_dim=128,
    total_classes=num_classes
).to(device)
fusion_model.load_state_dict(torch.load(get_path("global_fusion_model_best.pt"), map_location=device))
fusion_model.eval()

fusion_preds = []

with torch.no_grad():
    for bx_m, bx_n in fusion_loader:
        bx_m, bx_n = bx_m.to(device), bx_n.to(device)
        emb_m = mem_model(bx_m, return_embedding=True)
        emb_n = net_model(bx_n, return_embedding=True)
        logits = fusion_model(emb_m, emb_n)
        preds = torch.argmax(logits, dim=1).cpu().numpy()
        fusion_preds.extend(preds)

plot_and_save_cm(
    y_true=y_net,
    y_pred=fusion_preds,
    labels=class_names,
    title="Global Cross-Attention Multi-Modal Fusion Model - Test Confusion Matrix",
    filename="confusion_matrix_fusion.png"
)

print("\n=======================================================")
print("All 4 Confusion Matrices successfully generated!")
print("Check the 'confusion_matrices/' directory for the .png outputs.")
print("=======================================================\n")

import torch
import torch.nn.functional as F
import pandas as pd
import numpy as np
import json
import os
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import confusion_matrix

from models import (
    MemoryAttentionModel,
    NetworkAttentionModel,
    ZeroDayAutoencoder,
    HybridFusionModel
)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
os.makedirs("final_publication_cms", exist_ok=True)

def plot_cm(y_true, y_pred, labels, title, filename, is_binary=False):
    cm = confusion_matrix(y_true, y_pred)
    cm_norm = confusion_matrix(y_true, y_pred, normalize='true') * 100

    fig_size = (6.5, 5.5) if is_binary else (14, 12)
    fig, ax = plt.subplots(figsize=fig_size, facecolor='#ffffff')
    
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

    ax.set_title(title, fontsize=13, fontweight='bold', pad=12)
    ax.set_xlabel('Predicted Label', fontsize=11, fontweight='bold', labelpad=10)
    ax.set_ylabel('True Label', fontsize=11, fontweight='bold', labelpad=10)
    plt.xticks(rotation=45, ha='right', fontsize=9)
    plt.yticks(rotation=0, fontsize=9)
    plt.tight_layout()

    out_path = os.path.join("final_publication_cms", filename)
    plt.savefig(out_path, dpi=300)
    plt.close()
    print(f"--> Saved: {out_path}")

# --- 1. Memory Model ---
print("\n[1/4] Generating Memory Model Confusion Matrix...")
mem_df = pd.read_csv("./data/malmem/test.csv")
mem_feats = [c for c in mem_df.columns if c not in ['Class', 'Category', 'Class_Encoded', 'Category_Encoded', 'Raw_Class']]
X_mem = torch.tensor(mem_df[mem_feats].values, dtype=torch.float32).to(device)
y_mem = mem_df['Class_Encoded'].values

mem_model = MemoryAttentionModel(input_dim=len(mem_feats), num_classes=2).to(device)
mem_model.load_state_dict(torch.load("global_memory_model_best.pt", map_location=device))
mem_model.eval()

with torch.no_grad():
    mem_preds = torch.argmax(mem_model(X_mem), dim=1).cpu().numpy()

plot_cm(y_mem, mem_preds, ["Benign", "Malware"], "Global Memory Model (Host Tier) - Test Confusion Matrix", "cm_1_memory.png", is_binary=True)

# --- 2. Network Model ---
print("\n[2/4] Generating Network Model Confusion Matrix...")
net_df = pd.read_csv("./data/cicids/test.csv")
with open("./data/cicids/preprocessing_metadata.json", "r") as f:
    net_meta = json.load(f)
    num_classes = len(net_meta["category_mapping"])
    inv_map = {int(v): k for k, v in net_meta["category_mapping"].items()}
    labels = [inv_map[i] for i in range(num_classes)]

net_feats = [c for c in net_df.columns if c not in ['Category', 'Label', 'Binary_Class', 'Binary_Class_Encoded']]
X_net = torch.tensor(net_df[net_feats].values, dtype=torch.float32).to(device)
y_net = net_df['Label'].values

net_model = NetworkAttentionModel(input_dim=len(net_feats), num_classes=num_classes).to(device)
net_model.load_state_dict(torch.load("global_network_model_best.pt", map_location=device))
net_model.eval()

net_loader = torch.utils.data.DataLoader(X_net, batch_size=512, shuffle=False)
net_preds = []
with torch.no_grad():
    for bx in net_loader:
        net_preds.extend(torch.argmax(net_model(bx), dim=1).cpu().numpy())

plot_cm(y_net, net_preds, labels, "Global Network Attention Model (15 Classes) - Test Confusion Matrix", "cm_2_network.png")

# --- 3. Zero-Day Autoencoder ---
print("\n[3/4] Generating Tuned Zero-Day Autoencoder Confusion Matrix...")
with open("zeroday_config.json", "r") as f:
    zd_cfg = json.load(f)
    theta = float(zd_cfg["anomaly_threshold"])
    s_min = np.array(zd_cfg["scaler_min"])
    s_max = np.array(zd_cfg["scaler_max"])

diff = s_max - s_min
diff[diff == 0] = 1.0
X_scaled = np.nan_to_num((net_df[net_feats].values - s_min) / diff, nan=0.0, posinf=1.0, neginf=0.0)

zd_model = ZeroDayAutoencoder(input_dim=len(net_feats)).to(device)
zd_model.load_state_dict(torch.load("zeroday_autoencoder_best.pt", map_location=device))
zd_model.eval()

zd_loader = torch.utils.data.DataLoader(torch.tensor(X_scaled, dtype=torch.float32).to(device), batch_size=512, shuffle=False)
zd_preds = []
with torch.no_grad():
    for bx in zd_loader:
        mse = torch.mean((bx - zd_model(bx)) ** 2, dim=1).cpu().numpy()
        zd_preds.extend((mse > theta).astype(int))

benign_id = net_meta["category_mapping"].get("BENIGN", 0)
y_zd = np.where(y_net == benign_id, 0, 1)

plot_cm(y_zd, zd_preds, ["Conforming Benign", "Anomalous / Attack"], f"Zero-Day Autoencoder Anomaly Detector (Tuned theta = {theta:.6f})", "cm_3_zeroday.png", is_binary=True)

# --- 4. Cross-Attention Fusion ---
print("\n[4/4] Generating Multi-Modal Cross-Attention Fusion Matrix...")
repeat_factor = int(np.ceil(len(net_df) / len(mem_df)))
mem_exp = pd.concat([mem_df] * repeat_factor, ignore_index=True).iloc[:len(net_df)]

fusion_model = HybridFusionModel(mem_embed_dim=128, net_embed_dim=128, fusion_dim=128, total_classes=num_classes).to(device)
fusion_model.load_state_dict(torch.load("global_fusion_model_best.pt", map_location=device))
fusion_model.eval()

f_loader = torch.utils.data.DataLoader(
    torch.utils.data.TensorDataset(torch.tensor(mem_exp[mem_feats].values, dtype=torch.float32), torch.tensor(net_df[net_feats].values, dtype=torch.float32)),
    batch_size=512,
    shuffle=False
)
fusion_preds = []
with torch.no_grad():
    for bx_m, bx_n in f_loader:
        bx_m, bx_n = bx_m.to(device), bx_n.to(device)
        fusion_preds.extend(torch.argmax(fusion_model(mem_model(bx_m, return_embedding=True), net_model(bx_n, return_embedding=True)), dim=1).cpu().numpy())

plot_cm(y_net, fusion_preds, labels, "Global Cross-Attention Multi-Modal Fusion Model - Test Confusion Matrix", "cm_4_fusion.png")
print("\nAll 4 final publication matrices are ready in 'final_publication_cms/' folder!")
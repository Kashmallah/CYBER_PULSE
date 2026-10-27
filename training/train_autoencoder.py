import sys
import os
import json
import torch
import torch.nn as nn
import pandas as pd
import numpy as np
from sklearn.preprocessing import RobustScaler, MinMaxScaler

# Ensure project root is accessible in sys.path
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from models import ZeroDayAutoencoder

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

train_csv = os.path.join(ROOT_DIR, "data", "cicids", "ubuntu1_train.csv")
meta_path = os.path.join(ROOT_DIR, "data", "cicids", "preprocessing_metadata.json")

df = pd.read_csv(train_csv)
non_features = ['Category', 'Label', 'Binary_Class', 'Binary_Class_Encoded']
feat_cols = [c for c in df.columns if c not in non_features]

with open(meta_path, "r") as f:
    meta = json.load(f)
    benign_label = meta["category_mapping"].get("BENIGN", 0)

# Filter exclusively clean BENIGN flows
df_benign = df[df['Label'] == benign_label]
print(f"Training Autoencoder on {len(df_benign)} clean BENIGN flow samples...")

# Fit Scaler strictly on clean benign baseline to bound values to [0, 1]
scaler = MinMaxScaler()
X_benign_scaled = scaler.fit_transform(df_benign[feat_cols].values)

# Replace any lingering NaNs or Infinities safely
X_benign_scaled = np.nan_to_num(X_benign_scaled, nan=0.0, posinf=1.0, neginf=0.0)

X_benign_tensor = torch.tensor(X_benign_scaled, dtype=torch.float32).to(device)
train_loader = torch.utils.data.DataLoader(X_benign_tensor, batch_size=256, shuffle=True)

model = ZeroDayAutoencoder(input_dim=len(feat_cols)).to(device)
criterion = nn.MSELoss()
optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-5)

print("\n--- Training Zero-Day Autoencoder ---")
model.train()
for epoch in range(1, 16):
    total_loss = 0.0
    for bx in train_loader:
        optimizer.zero_grad()
        recon = model(bx)
        loss = criterion(recon, bx)
        loss.backward()
        optimizer.step()
        total_loss += loss.item() * len(bx)
    
    epoch_loss = total_loss / len(X_benign_tensor)
    if epoch % 3 == 0 or epoch == 15:
        print(f"Epoch {epoch:02d}/15 | Reconstruction MSE: {epoch_loss:.6f}")

# Calculate anomaly threshold: theta = mu + 3*sigma on normalized manifold
model.eval()
with torch.no_grad():
    recon_benign = model(X_benign_tensor)
    mse_errors = torch.mean((X_benign_tensor - recon_benign) ** 2, dim=1).cpu().numpy()

mean_mse = float(np.mean(mse_errors))
std_mse = float(np.std(mse_errors))
threshold_theta = float(mean_mse + 3.0 * std_mse)

print("\n=======================================================")
print(f"Autoencoder Reconstruction Mean (mu)   : {mean_mse:.6f}")
print(f"Autoencoder Reconstruction Std (sigma) : {std_mse:.6f}")
print(f"Zero-Day Anomaly Threshold (theta)     : {threshold_theta:.6f}")
print("=======================================================\n")

out_model_path = os.path.join(ROOT_DIR, "checkpoints", "zeroday_autoencoder_best.pt")
torch.save(model.state_dict(), out_model_path)

config_data = {
    "feature_count": len(feat_cols),
    "scaler_min": scaler.data_min_.tolist(),
    "scaler_max": scaler.data_max_.tolist(),
    "mean_mse": mean_mse,
    "std_mse": std_mse,
    "anomaly_threshold": threshold_theta
}

out_config_path = os.path.join(ROOT_DIR, "checkpoints", "zeroday_config.json")
with open(out_config_path, "w") as f:
    json.dump(config_data, f, indent=4)

print(f"Saved calibrated {out_model_path} and {out_config_path} successfully!")

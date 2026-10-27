import sys
import os
import torch
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np

# Ensure project root is accessible in sys.path
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from models import MemoryAttentionModel

device = torch.device("cpu")
val_csv = os.path.join(ROOT_DIR, "data", "malmem", "validation.csv")
val_df = pd.read_csv(val_csv)
non_features = ['Class', 'Category', 'Class_Encoded', 'Category_Encoded', 'Raw_Class']
feat_cols = [c for c in val_df.columns if c not in non_features]

X_sample = torch.tensor(val_df[feat_cols].values[:200], dtype=torch.float32)

ckpt_dir = os.path.join(ROOT_DIR, "checkpoints")
ckpt_path = os.path.join(ckpt_dir, "global_memory_model_best.pt") if os.path.exists(os.path.join(ckpt_dir, "global_memory_model_best.pt")) else os.path.join(ROOT_DIR, "global_memory_model_best.pt")

model = MemoryAttentionModel(input_dim=len(feat_cols), num_classes=2)
model.load_state_dict(torch.load(ckpt_path, map_location=device))
model.eval()

def model_forward(numpy_array):
    tensor_input = torch.tensor(numpy_array, dtype=torch.float32)
    with torch.no_grad():
        logits = model(tensor_input)
        probs = torch.softmax(logits, dim=1)
    return probs.numpy()

try:
    import shap
    # Initialize KernelExplainer with background distribution
    explainer = shap.KernelExplainer(model_forward, X_sample.numpy()[:50])
    shap_values = explainer.shap_values(X_sample.numpy()[50:100])

    # Generate Summary Plot
    plt.figure()
    shap.summary_plot(shap_values, X_sample.numpy()[50:100], feature_names=feat_cols, show=False)
    plt.tight_layout()
    out_img = os.path.join(ROOT_DIR, "shap_memory_summary.png")
    plt.savefig(out_img, dpi=300)
    print(f"SHAP Summary plot saved to {out_img}")
except ImportError:
    print("SHAP package not installed. Skipping plot generation.")

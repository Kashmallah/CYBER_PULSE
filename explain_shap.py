import shap
import torch
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
from models import MemoryAttentionModel

device = torch.device("cpu")
val_df = pd.read_csv("./data/malmem/validation.csv")
non_features = ['Class', 'Category', 'Class_Encoded', 'Category_Encoded', 'Raw_Class']
feat_cols = [c for c in val_df.columns if c not in non_features]

X_sample = torch.tensor(val_df[feat_cols].values[:200], dtype=torch.float32)

model = MemoryAttentionModel(input_dim=len(feat_cols), num_classes=2)
model.load_state_dict(torch.load("global_memory_model_latest.pt", map_location=device))
model.eval()

def model_forward(numpy_array):
    tensor_input = torch.tensor(numpy_array, dtype=torch.float32)
    with torch.no_grad():
        logits = model(tensor_input)
        probs = torch.softmax(logits, dim=1)
    return probs.numpy()

# Initialize KernelExplainer with background distribution
explainer = shap.KernelExplainer(model_forward, X_sample.numpy()[:50])
shap_values = explainer.shap_values(X_sample.numpy()[50:100])

# Generate Summary Plot
plt.figure()
shap.summary_plot(shap_values, X_sample.numpy()[50:100], feature_names=feat_cols, show=False)
plt.tight_layout()
plt.savefig("shap_memory_summary.png", dpi=300)
print("SHAP Summary plot saved to shap_memory_summary.png")
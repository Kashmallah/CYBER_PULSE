import sys
import os
import json
import torch
import torch.nn.functional as F
import pandas as pd
import numpy as np

# Ensure project root is accessible in sys.path
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from models import MemoryAttentionModel, NetworkAttentionModel
from metrics_logger import compute_all_metrics

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

def evaluate_modality(model_type):
    print(f"\n=======================================================")
    print(f"   Evaluating {model_type.upper()} Model on Unseen TEST Dataset")
    print(f"=======================================================")
    
    ckpt_dir = os.path.join(ROOT_DIR, "checkpoints")

    if model_type == "memory":
        test_csv = os.path.join(ROOT_DIR, "data", "malmem", "test.csv")
        meta_path = os.path.join(ROOT_DIR, "data", "malmem", "preprocessing_metadata.json")
        target_col = "Class_Encoded"
        non_features = ['Class', 'Category', 'Class_Encoded', 'Category_Encoded', 'Raw_Class']
        num_classes = 2
        ckpt_path = os.path.join(ckpt_dir, "global_memory_model_best.pt") if os.path.exists(os.path.join(ckpt_dir, "global_memory_model_best.pt")) else os.path.join(ROOT_DIR, "global_memory_model_best.pt")
    else:
        test_csv = os.path.join(ROOT_DIR, "data", "cicids", "test.csv")
        meta_path = os.path.join(ROOT_DIR, "data", "cicids", "preprocessing_metadata.json")
        target_col = "Label"
        non_features = ['Category', 'Label', 'Binary_Class', 'Binary_Class_Encoded']
        with open(meta_path, "r") as f:
            num_classes = len(json.load(f)["category_mapping"])
        ckpt_path = os.path.join(ckpt_dir, "global_network_model_best.pt") if os.path.exists(os.path.join(ckpt_dir, "global_network_model_best.pt")) else os.path.join(ROOT_DIR, "global_network_model_best.pt")

    if not os.path.exists(test_csv):
        print(f"Error: {test_csv} not found.")
        return

    df_test = pd.read_csv(test_csv)
    feat_cols = [c for c in df_test.columns if c not in non_features]
    
    X_test = torch.tensor(df_test[feat_cols].values, dtype=torch.float32).to(device)
    y_test = torch.tensor(df_test[target_col].values, dtype=torch.long).to(device)
    
    # Initialize Architecture & Load Weights
    if model_type == "memory":
        model = MemoryAttentionModel(input_dim=len(feat_cols), num_classes=num_classes).to(device)
    else:
        model = NetworkAttentionModel(input_dim=len(feat_cols), num_classes=num_classes).to(device)
        
    model.load_state_dict(torch.load(ckpt_path, map_location=device))
    model.eval()

    # Batch Inference
    test_loader = torch.utils.data.DataLoader(list(zip(X_test, y_test)), batch_size=512, shuffle=False)
    all_preds, all_probs = [], []

    with torch.no_grad():
        for bx, _ in test_loader:
            logits = model(bx)
            probs = F.softmax(logits, dim=1).cpu().numpy()
            preds = torch.argmax(logits, dim=1).cpu().numpy()
            all_probs.append(probs)
            all_preds.append(preds)

    probs_concat = np.concatenate(all_probs, axis=0)
    preds_concat = np.concatenate(all_preds, axis=0)
    y_true_np = y_test.cpu().numpy()

    metrics = compute_all_metrics(y_true_np, preds_concat, probs_concat, num_classes)

    print(f"Samples Evaluated : {len(y_true_np)}")
    print(f"Accuracy          : {metrics['accuracy'] * 100:.2f}%")
    print(f"F1-Score (Weighted): {metrics['f1_weighted'] * 100:.2f}%")
    print(f"F1-Score (Macro)  : {metrics['f1_macro'] * 100:.2f}%")
    print(f"Precision (Macro) : {metrics['precision_macro'] * 100:.2f}%")
    print(f"Recall (Macro)    : {metrics['recall_macro'] * 100:.2f}%")
    print(f"ROC-AUC           : {metrics['roc_auc']:.4f}")
    print(f"Matthews Corr (MCC): {metrics['mcc']:.4f}")

if __name__ == "__main__":
    evaluate_modality("memory")
    evaluate_modality("network")

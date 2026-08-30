import sqlite3
import numpy as np
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    matthews_corrcoef,
    confusion_matrix
)

def compute_all_metrics(y_true, y_pred, y_probs, num_classes):
    """
    Computes all 16 evaluation metrics safely for both Binary and Multi-Class settings.
    """
    y_true = np.asarray(y_true)
    y_pred = np.asarray(y_pred)
    y_probs = np.asarray(y_probs)

    # 1. Base Classification Metrics
    acc = accuracy_score(y_true, y_pred)
    
    prec_macro = precision_score(y_true, y_pred, average='macro', zero_division=0)
    prec_micro = precision_score(y_true, y_pred, average='micro', zero_division=0)
    prec_weighted = precision_score(y_true, y_pred, average='weighted', zero_division=0)
    
    rec_macro = recall_score(y_true, y_pred, average='macro', zero_division=0)
    rec_micro = recall_score(y_true, y_pred, average='micro', zero_division=0)
    rec_weighted = recall_score(y_true, y_pred, average='weighted', zero_division=0)
    
    f1_mac = f1_score(y_true, y_pred, average='macro', zero_division=0)
    f1_mic = f1_score(y_true, y_pred, average='micro', zero_division=0)
    f1_w = f1_score(y_true, y_pred, average='weighted', zero_division=0)
    
    mcc = matthews_corrcoef(y_true, y_pred)

    # 2. Robust ROC-AUC (Binary vs. Multi-Class One-vs-Rest)
    try:
        if num_classes == 2:
            # For binary: pass 1D probabilities of positive class
            pos_probs = y_probs[:, 1] if y_probs.ndim == 2 else y_probs
            auc = roc_auc_score(y_true, pos_probs)
        else:
            # For multi-class: pass full matrix with explicit labels & OvR
            all_labels = list(range(num_classes))
            auc = roc_auc_score(
                y_true,
                y_probs,
                multi_class='ovr',
                average='weighted',
                labels=all_labels
            )
    except Exception as e:
        auc = 0.5  # Fallback baseline on unresolvable degenerate slices

    # 3. Sensitivity & Specificity
    try:
        cm = confusion_matrix(y_true, y_pred, labels=list(range(num_classes)))
        if num_classes == 2:
            tn, fp, fn, tp = cm.ravel()
            sensitivity = tp / (tp + fn) if (tp + fn) > 0 else 0.0
            specificity = tn / (tn + fp) if (tn + fp) > 0 else 0.0
        else:
            # Macro-averaged one-vs-all Specificity & Sensitivity
            sens_list, spec_list = [], []
            for i in range(num_classes):
                tp = cm[i, i]
                fn = np.sum(cm[i, :]) - tp
                fp = np.sum(cm[:, i]) - tp
                tn = np.sum(cm) - (tp + fp + fn)
                
                sens = tp / (tp + fn) if (tp + fn) > 0 else 0.0
                spec = tn / (tn + fp) if (tn + fp) > 0 else 0.0
                sens_list.append(sens)
                spec_list.append(spec)
            sensitivity = float(np.mean(sens_list))
            specificity = float(np.mean(spec_list))
    except Exception:
        sensitivity = rec_macro
        specificity = 0.0

    return {
        "accuracy": float(acc),
        "precision_macro": float(prec_macro),
        "precision_micro": float(prec_micro),
        "precision_weighted": float(prec_weighted),
        "recall_macro": float(rec_macro),
        "recall_micro": float(rec_micro),
        "recall_weighted": float(rec_weighted),
        "f1_macro": float(f1_mac),
        "f1_micro": float(f1_mic),
        "f1_weighted": float(f1_w),
        "roc_auc": float(auc),
        "sensitivity": float(sensitivity),
        "specificity": float(specificity),
        "mcc": float(mcc)
    }
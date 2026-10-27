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

def log_metrics_to_db(server_round, model_type, loss, metrics, db_path=None):
    """
    Persists evaluation metrics for a federated learning round to the SQLite metrics database.
    """
    if db_path is None or db_path == "fl_metrics.db":
        root_dir = os.path.dirname(os.path.abspath(__file__))
        backend_db = os.path.join(root_dir, "backend", "fl_metrics.db")
        db_path = backend_db if os.path.exists(os.path.dirname(backend_db)) else "fl_metrics.db"
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS round_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            round INTEGER,
            model_type TEXT,
            loss REAL,
            accuracy REAL,
            precision_macro REAL,
            precision_micro REAL,
            precision_weighted REAL,
            recall_macro REAL,
            recall_micro REAL,
            recall_weighted REAL,
            f1_macro REAL,
            f1_micro REAL,
            f1_weighted REAL,
            roc_auc REAL,
            sensitivity REAL,
            specificity REAL,
            mcc REAL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    c.execute("""
        INSERT INTO round_metrics (
            round, model_type, loss, accuracy, precision_macro, precision_micro, precision_weighted,
            recall_macro, recall_micro, recall_weighted, f1_macro, f1_micro, f1_weighted,
            roc_auc, sensitivity, specificity, mcc
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        server_round, model_type, float(loss),
        metrics.get("accuracy", 0.0),
        metrics.get("precision_macro", 0.0),
        metrics.get("precision_micro", 0.0),
        metrics.get("precision_weighted", 0.0),
        metrics.get("recall_macro", 0.0),
        metrics.get("recall_micro", 0.0),
        metrics.get("recall_weighted", 0.0),
        metrics.get("f1_macro", 0.0),
        metrics.get("f1_micro", 0.0),
        metrics.get("f1_weighted", 0.0),
        metrics.get("roc_auc", 0.0),
        metrics.get("sensitivity", 0.0),
        metrics.get("specificity", 0.0),
        metrics.get("mcc", 0.0)
    ))
    conn.commit()
    conn.close()
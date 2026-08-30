import flwr as fl
from flwr.common import (
    Parameters,
    Scalar,
    parameters_to_ndarrays,
    ndarrays_to_parameters,
    Metrics
)
from typing import List, Tuple, Union, Dict, Optional
import torch
import torch.nn.functional as F
import numpy as np
import pandas as pd
import argparse
import json
import os
import sqlite3

from models import MemoryAttentionModel, NetworkAttentionModel
from metrics_logger import compute_all_metrics, log_metrics_to_db

# ==========================================
# 1. Argument Parsing & Environment Setup
# ==========================================
parser = argparse.ArgumentParser(description="CYBER PULSE Central Federated Server")
parser.add_argument("--model", type=str, required=True, choices=["memory", "network"], help="Target model modality")
parser.add_argument("--rounds", type=int, default=15, help="Number of federated training rounds")
parser.add_argument("--mu", type=float, default=0.01, help="FedProx proximal regularizer parameter")
parser.add_argument("--port", type=str, default="8080", help="Server listening port")
args = parser.parse_args()

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ==========================================
# 2. Load Evaluation / Validation Set
# ==========================================
if args.model == "memory":
    val_csv = "./data/malmem/validation.csv"
    meta_path = "./data/malmem/preprocessing_metadata.json"
    target_col = "Class_Encoded"
    non_features = ['Class', 'Category', 'Class_Encoded', 'Category_Encoded', 'Raw_Class']
else:
    val_csv = "./data/cicids/validation.csv"
    meta_path = "./data/cicids/preprocessing_metadata.json"
    target_col = "Label"
    non_features = ['Category', 'Label', 'Binary_Class', 'Binary_Class_Encoded']

if not os.path.exists(val_csv):
    raise FileNotFoundError(f"Validation dataset not found at {val_csv}")

val_df = pd.read_csv(val_csv)
feat_cols = [c for c in val_df.columns if c not in non_features]
X_val = torch.tensor(val_df[feat_cols].values, dtype=torch.float32).to(device)
y_val = torch.tensor(val_df[target_col].values, dtype=torch.long).to(device)

if os.path.exists(meta_path):
    with open(meta_path, "r") as f:
        meta = json.load(f)
        if args.model == "memory":
            num_classes = 2
        else:
            num_classes = len(meta["category_mapping"])
else:
    num_classes = len(np.unique(val_df[target_col].values))

# Initialize Global Architecture
if args.model == "memory":
    global_model = MemoryAttentionModel(input_dim=len(feat_cols), num_classes=num_classes).to(device)
else:
    global_model = NetworkAttentionModel(input_dim=len(feat_cols), num_classes=num_classes).to(device)

print(f"\n=======================================================")
print(f"[{args.model.upper()} Server] Model Initialized | Features: {len(feat_cols)} | Classes: {num_classes}")
print(f"=======================================================\n")

# ==========================================
# 3. Custom Balanced FedProx Strategy
# ==========================================
class FedBalanceProx(fl.server.strategy.FedProx):
    """
    Equalized Non-IID Weight Aggregation Strategy.
    Prevents majority client sample dominance (e.g. 1.7M vs 9K samples)
    from suppressing minority attack representations.
    """
    def aggregate_fit(
        self,
        server_round: int,
        results: List[Tuple[fl.server.client_proxy.ClientProxy, fl.common.FitRes]],
        failures: List[Union[Tuple[fl.server.client_proxy.ClientProxy, fl.common.FitRes], BaseException]],
    ) -> Tuple[Optional[Parameters], Dict[str, Scalar]]:
        if not results:
            return None, {}
        if not self.accept_failures and failures:
            return None, {}

        # Extract weights from participating clients
        weights_results = [
            parameters_to_ndarrays(fit_res.parameters)
            for _, fit_res in results
        ]

        # Equal weighting across heterogeneous client partitions
        averaged_weights = [
            np.mean([layer[i] for layer in weights_results], axis=0)
            for i in range(len(weights_results[0]))
        ]

        parameters_aggregated = ndarrays_to_parameters(averaged_weights)
        return parameters_aggregated, {}

# ==========================================
# 4. Centralized Evaluation Callback
# ==========================================
best_accuracy = 0.0

def get_evaluate_fn(model, model_type, num_classes):
    def evaluate(server_round: int, parameters: fl.common.NDArrays, config: Dict[str, Scalar]):
        global best_accuracy
        
        # Load weights into global server model
        params_dict = zip(model.state_dict().keys(), parameters)
        state_dict = {k: torch.tensor(v) for k, v in params_dict}
        model.load_state_dict(state_dict, strict=True)
        model.eval()

        with torch.no_grad():
            logits = model(X_val)
            loss = F.cross_entropy(logits, y_val).item()
            probs = F.softmax(logits, dim=1).cpu().numpy()
            preds = torch.argmax(logits, dim=1).cpu().numpy()

        y_true_np = y_val.cpu().numpy()
        metrics = compute_all_metrics(y_true_np, preds, probs, num_classes)

        # Log metrics to SQLite database
        log_metrics_to_db(server_round, model_type, loss, metrics, db_path="fl_metrics.db")

        acc = metrics.get("accuracy", 0.0)
        f1_w = metrics.get("f1_weighted", 0.0)
        auc = metrics.get("roc_auc", 0.0)

        print(f"\n--- [Round {server_round}] Global {model_type.upper()} Evaluation ---")
        print(f"Loss: {loss:.4f} | Accuracy: {acc * 100:.2f}% | F1-Weighted: {f1_w * 100:.2f}% | AUC: {auc:.4f}")

        # Checkpoint Best Model Weights
        if acc > best_accuracy:
            best_accuracy = acc
            ckpt_name = f"global_{model_type}_model_best.pt"
            torch.save(model.state_dict(), ckpt_name)
            print(f"--> [NEW BEST MODEL] Saved {ckpt_name} with Accuracy: {acc * 100:.2f}%")

        return loss, {"accuracy": acc, "f1_weighted": f1_w}

    return evaluate

# ==========================================
# 5. Flower Server Startup
# ==========================================
def weighted_average(metrics: List[Tuple[int, Metrics]]) -> Metrics:
    accuracies = [num_examples * m["local_acc"] for num_examples, m in metrics if "local_acc" in m]
    examples = [num_examples for num_examples, _ in metrics if "local_acc" in _]
    return {"aggregated_local_acc": sum(accuracies) / sum(examples)} if examples else {}

if __name__ == "__main__":
    strategy = FedBalanceProx(
        fraction_fit=1.0,
        fraction_evaluate=1.0,
        min_fit_clients=2,
        min_evaluate_clients=2,
        min_available_clients=2,
        proximal_mu=args.mu,
        evaluate_fn=get_evaluate_fn(global_model, args.model, num_classes),
        fit_metrics_aggregation_fn=weighted_average,
        evaluate_metrics_aggregation_fn=weighted_average,
        initial_parameters=ndarrays_to_parameters([val.cpu().numpy() for _, val in global_model.state_dict().items()])
    )

    grpc_max_message_length = 512 * 1024 * 1024  # 512 MB

    print(f"Starting Flower FedProx Central Server for {args.model.upper()} on port {args.port}...")
    fl.server.start_server(
        server_address=f"0.0.0.0:{args.port}",
        config=fl.server.ServerConfig(num_rounds=args.rounds, round_timeout=3600.0),
        strategy=strategy,
        grpc_max_message_length=grpc_max_message_length
    )
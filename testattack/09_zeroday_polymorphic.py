#!/usr/bin/env python3
"""
Test Attack 09: Polymorphic Zero-Day Out-of-Distribution Vector (Unsupervised Autoencoder)
Simulates a novel, completely unmodeled flow manifold designed to exceed the Autoencoder MSE threshold theta = 0.002640.
Evaluates: ZeroDayAutoencoder (Reconstruction MSE > Theta) -> zeroday_anomaly
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from attack_helper import inject_attack

if __name__ == "__main__":
    client_id = sys.argv[1] if len(sys.argv) > 1 else "win-prod-01"
    host = sys.argv[2] if len(sys.argv) > 2 else "127.0.0.1"
    port = int(sys.argv[3]) if len(sys.argv) > 3 else 9099

    features = {
        "Autoencoder MSE Reconstruction Loss": "0.014520 (Exceeds theta = 0.002640 by ~5.5x)",
        "Reconstruction Divergence Ratio": "Extreme out-of-distribution manifold",
        "Total Length of Fwd Packets": "80,000 - 250,000 bytes",
        "Flow Bytes/s": "500,000 - 1,200,000 B/s",
        "Gating Mechanism": "Zero-Day Quarantine Gate Triggered (Automated Isolation)"
    }

    inject_attack(
        attack_type="zeroday_anomaly",
        title="Polymorphic Zero-Day Out-of-Distribution Anomaly",
        category="Zero-Day Vector",
        model_evaluated="PyTorch ZeroDayAutoencoder (Latent Reconstruction Loss)",
        simulated_features=features,
        client_id=client_id,
        host=host,
        port=port
    )

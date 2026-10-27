#!/usr/bin/env python3
"""
Test Attack 02: Aggressive Multi-Port Reconnaissance Sweep (CIC-IDS2017 Vector)
Simulates sequential port scanning probing vulnerable listening services.
Evaluates: NetworkAttentionModel -> portscan
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
        "Scanned Flow Endpoints": "50+ unique concurrent port connections",
        "SYN Flag Count": "150 - 600 flags",
        "Flow Packets/s": "2,500 - 7,500 pkts/s",
        "Flow IAT Min": "< 5.0 ms (Rapid sequential sweeps)",
        "Destination Target Port": "445 / 3389 / 80 / 22"
    }

    inject_attack(
        attack_type="portscan",
        title="Aggressive Port Scan Reconnaissance",
        category="Network-Based Attack",
        model_evaluated="PyTorch NetworkAttentionModel (Multi-Head Attention)",
        simulated_features=features,
        client_id=client_id,
        host=host,
        port=port
    )

#!/usr/bin/env python3
"""
Test Attack 03: Outbound Command & Control (C2) Beaconing (CIC-IDS2017 Vector)
Simulates periodic metronomic outbound heartbeat beacons characteristic of botnets.
Evaluates: NetworkAttentionModel -> mirai_botnet
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
        "Flow IAT Mean": "2,000,000 us (~2.0s periodic polling cadence)",
        "Flow IAT Std Dev": "< 50.0 us (Extremely low jitter / robotic timing)",
        "Destination Port": "8000 / 4444 (Non-standard egress socket)",
        "Total Length Fwd Pkts": "300 - 800 bytes (Encrypted payload ping)",
        "Detection Signature": "Metronomic Egress Beaconing"
    }

    inject_attack(
        attack_type="mirai_botnet",
        title="Command & Control (C2) Outbound Botnet Beaconing",
        category="Network-Based Attack",
        model_evaluated="PyTorch NetworkAttentionModel (Temporal IAT Analysis)",
        simulated_features=features,
        client_id=client_id,
        host=host,
        port=port
    )

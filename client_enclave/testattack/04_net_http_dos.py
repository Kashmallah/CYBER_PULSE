#!/usr/bin/env python3
"""
Test Attack 04: Application Layer HTTP Flood / DoS (CIC-IDS2017 Vector)
Simulates volumetric HTTP GET requests to exhaust application server workers.
Evaluates: NetworkAttentionModel -> dos_hulk
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
        "Total Fwd Packets": "800 - 3,000 HTTP GET requests",
        "Flow Packets/s": "5,000 - 25,000 pkts/s",
        "Flow Bytes/s": "1,200,000 - 4,500,000 B/s",
        "Destination Port": "80 / 8080 (Web application listener)",
        "Subflow Fwd Bytes": "> 1,500,000 bytes"
    }

    inject_attack(
        attack_type="dos_hulk",
        title="Application Layer HTTP Flood (DoS Hulk)",
        category="Network-Based Attack",
        model_evaluated="PyTorch NetworkAttentionModel (Layer 7 DoS Detection)",
        simulated_features=features,
        client_id=client_id,
        host=host,
        port=port
    )

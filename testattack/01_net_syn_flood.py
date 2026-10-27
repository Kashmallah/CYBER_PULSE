#!/usr/bin/env python3
"""
Test Attack 01: Volumetric TCP SYN Flood Simulation (CIC-IDS2017 Vector)
Simulates high-frequency TCP SYN packet bursts saturating state tables.
Evaluates: NetworkAttentionModel (BiLSTM + Self-Attention) -> ddos_synflood
"""

import sys
import os

# Import local attack helper
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from attack_helper import inject_attack

if __name__ == "__main__":
    client_id = sys.argv[1] if len(sys.argv) > 1 else "win-prod-01"
    host = sys.argv[2] if len(sys.argv) > 2 else "127.0.0.1"
    port = int(sys.argv[3]) if len(sys.argv) > 3 else 9099

    features = {
        "SYN Flag Count": "3,500 - 8,000 flags (Extreme Volumetric Influx)",
        "Flow Packets/s": "40,000 - 95,000 pkts/s",
        "Flow Bytes/s": "800,000 - 2,500,000 B/s",
        "Network Bandwidth Load": "85.0% - 99.0% saturated",
        "Destination Port": "80 / 443"
    }

    inject_attack(
        attack_type="ddos_synflood",
        title="Volumetric TCP SYN Flood Attack (DoS)",
        category="Network-Based Attack",
        model_evaluated="PyTorch NetworkAttentionModel (70 CIC-IDS Features)",
        simulated_features=features,
        client_id=client_id,
        host=host,
        port=port
    )

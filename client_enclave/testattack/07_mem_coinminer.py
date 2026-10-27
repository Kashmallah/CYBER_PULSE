#!/usr/bin/env python3
"""
Test Attack 07: XMRig Cryptomining Trojan Activity (CIC-MalMem-2022 Vector)
Simulates background stratum hashing threads maxing host CPU with abnormal handle allocations.
Evaluates: MemoryAttentionModel -> coinminer
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
        "pslist.nproc": "+8 spawned rogue worker processes",
        "handles.nhandles": "+15,000 thread & mutex handles",
        "CPU Load Core Spike": "88.0% - 99.5% continuous saturation",
        "Stratum Protocol Sockets": "Long-lived worker socket pool",
        "Threat Taxonomy": "XMRig / Monero Cryptojacking Trojan"
    }

    inject_attack(
        attack_type="coinminer",
        title="XMRig Cryptomining Trojan Infiltration",
        category="Host Memory Attack",
        model_evaluated="PyTorch MemoryAttentionModel (Handle & CPU Correlation)",
        simulated_features=features,
        client_id=client_id,
        host=host,
        port=port
    )

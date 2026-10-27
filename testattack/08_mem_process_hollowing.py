#!/usr/bin/env python3
"""
Test Attack 08: Process Hollowing & Reflective DLL Injection (CIC-MalMem-2022 Vector)
Simulates unbacked executable memory cavity within legitimate host processes and unlinked modules.
Evaluates: MemoryAttentionModel -> mem_process_hollowing
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
        "malfind.ninjections": "10.0 - 20.0 unbacked memory allocations",
        "ldrmodules.not_in_load": "4.0 - 12.0 unlinked modules (PEB unhooking)",
        "pslist.avg_handlers": "250.0 - 600.0 abnormal handles per process",
        "psxview.not_in_pslist": "Direct kernel object manipulation (DKOM)",
        "Threat Taxonomy": "Process Hollowing & Reflective PE Injection"
    }

    inject_attack(
        attack_type="mem_process_hollowing",
        title="Host Process Hollowing & Memory Injection",
        category="Host Memory Attack",
        model_evaluated="PyTorch MemoryAttentionModel (Kernel VAD & LdrModules)",
        simulated_features=features,
        client_id=client_id,
        host=host,
        port=port
    )

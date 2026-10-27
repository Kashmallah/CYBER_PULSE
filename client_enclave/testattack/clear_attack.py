#!/usr/bin/env python3
"""
Utility: Clear Attack Simulation & Restore Clean Baseline Telemetry
Resets sniffer state, clears any active attack injection, and restores SECURE shield status.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from attack_helper import clear_simulation

if __name__ == "__main__":
    host = sys.argv[1] if len(sys.argv) > 1 else "127.0.0.1"
    port = int(sys.argv[2]) if len(sys.argv) > 2 else 9099

    print("\n[*] Sending clear simulation command to CYBER PULSE daemon...")
    clear_simulation(host=host, port=port)
    print("[+] Normal baseline telemetry restored.\n")

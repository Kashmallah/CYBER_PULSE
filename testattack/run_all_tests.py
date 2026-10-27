#!/usr/bin/env python3
"""
CYBER PULSE Automated Test Suite Orchestrator
Executes all 10 attack scenarios in sequence with live dashboard verification pauses.
"""

import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from attack_helper import inject_attack, clear_simulation

TEST_SCENARIOS = [
    {
        "file": "01_net_syn_flood.py",
        "type": "ddos_synflood",
        "title": "01. Volumetric TCP SYN Flood Attack (DoS)",
        "cat": "Network-Based",
        "model": "NetworkAttentionModel (70 CIC-IDS Features)",
        "features": {"SYN Flag Count": "5,000+", "Flow Packets/s": "65,000 pkts/s"}
    },
    {
        "file": "02_net_port_scan.py",
        "type": "portscan",
        "title": "02. Aggressive Multi-Port Reconnaissance Sweep",
        "cat": "Network-Based",
        "model": "NetworkAttentionModel (Port Multi-Head Attention)",
        "features": {"Scanned Endpoints": "50+ concurrent flows", "SYN Count": "350"}
    },
    {
        "file": "03_net_c2_beacon.py",
        "type": "mirai_botnet",
        "title": "03. Outbound Command & Control (C2) Botnet Beaconing",
        "cat": "Network-Based",
        "model": "NetworkAttentionModel (Metronomic Flow IAT)",
        "features": {"Flow IAT Mean": "~2.0s cadence", "IAT Std": "< 50us (Metronomic)"}
    },
    {
        "file": "04_net_http_dos.py",
        "type": "dos_hulk",
        "title": "04. Application Layer HTTP Flood (DoS Hulk)",
        "cat": "Network-Based",
        "model": "NetworkAttentionModel (Layer 7 Burst Detection)",
        "features": {"Total Fwd Packets": "2,000+", "Flow Bytes/s": "3,000,000+ B/s"}
    },
    {
        "file": "05_mem_socgholish.py",
        "type": "socgholish",
        "title": "05. SocGholish Infiltration & Memory Injection",
        "cat": "Host Memory",
        "model": "MemoryAttentionModel (55 MalMem RAM Artifacts)",
        "features": {"malfind.ninjections": "12.0 unbacked VADs", "pslist.avg_threads": "52.0"}
    },
    {
        "file": "06_mem_ransomware_spike.py",
        "type": "ransomware_blackcat",
        "title": "06. ALPHV / BlackCat Ransomware Handle Spike",
        "cat": "Host Memory",
        "model": "MemoryAttentionModel (Handle Churn & Memory Mutation)",
        "features": {"handles.nfile": "32,000 file descriptors", "CPU Spike": "85%+"}
    },
    {
        "file": "07_mem_coinminer.py",
        "type": "coinminer",
        "title": "07. XMRig Cryptomining Trojan Infiltration",
        "cat": "Host Memory",
        "model": "MemoryAttentionModel (CPU Saturation & Stratum Threads)",
        "features": {"pslist.nproc": "+8 worker procs", "CPU Core Load": "95.5%"}
    },
    {
        "file": "08_mem_process_hollowing.py",
        "type": "mem_process_hollowing",
        "title": "08. Process Hollowing & Reflective DLL Injection",
        "cat": "Host Memory",
        "model": "MemoryAttentionModel (Unbacked Memory & LdrModules)",
        "features": {"malfind.ninjections": "15.0 unbacked blocks", "ldrmodules.not_in_load": "6.0"}
    },
    {
        "file": "09_zeroday_polymorphic.py",
        "type": "zeroday_anomaly",
        "title": "09. Polymorphic Zero-Day Out-of-Distribution Vector",
        "cat": "Zero-Day Vector",
        "model": "ZeroDayAutoencoder (Reconstruction MSE > Theta 0.002640)",
        "features": {"Autoencoder Loss MSE": "0.014520 (High-confidence Anomaly)", "Gating": "Automated Isolation"}
    },
    {
        "file": "10_zeroday_hybrid_beacon.py",
        "type": "zeroday_hybrid",
        "title": "10. Multi-Stage Hybrid Fileless Zero-Day Attack",
        "cat": "Zero-Day & Hybrid",
        "model": "Cross-Modal Fusion Gate (Memory + Network Correlation)",
        "features": {"Autoencoder Loss MSE": "0.018900", "malfind Injections": "10.0 threads"}
    }
]

def main():
    client_id = sys.argv[1] if len(sys.argv) > 1 else "win-prod-01"
    host = sys.argv[2] if len(sys.argv) > 2 else "127.0.0.1"
    port = int(sys.argv[3]) if len(sys.argv) > 3 else 9099
    auto_delay = int(sys.argv[4]) if len(sys.argv) > 4 else 0

    print("\n" + "="*75)
    print("      CYBER PULSE FULL 10-STAGE ATTACK VERIFICATION SUITE")
    print("="*75)
    print(f"[*] Target Endpoint:    {client_id}")
    print(f"[*] Daemon Target:      ws://{host}:{port}")
    print(f"[*] Execution Mode:     {'Automated (' + str(auto_delay) + 's delay)' if auto_delay > 0 else 'Interactive (Press Enter per step)'}")
    print("="*75)

    for idx, test in enumerate(TEST_SCENARIOS, 1):
        print(f"\n>>> Running Scenario [{idx}/10]: {test['title']}...")
        success = inject_attack(
            attack_type=test["type"],
            title=test["title"],
            category=test["cat"],
            model_evaluated=test["model"],
            simulated_features=test["features"],
            client_id=client_id,
            host=host,
            port=port
        )
        if not success:
            print(f"[-] Execution failed on test {idx}. Halting test suite.")
            return

        if auto_delay > 0:
            print(f"[*] Pausing {auto_delay} seconds for dashboard observation...")
            time.sleep(auto_delay)
        else:
            try:
                input("[?] Observe Client HUD & SOC Dashboard. Press [ENTER] to proceed to next test (or Ctrl+C to stop)...")
            except KeyboardInterrupt:
                print("\n[!] Test suite interrupted by user.")
                clear_simulation(host=host, port=port)
                return

    print("\n" + "="*75)
    print("  ALL 10 ATTACK SCENARIOS COMPLETED SUCCESSFULLY!")
    print("="*75)
    try:
        ans = input("[?] Would you like to clear active threat and restore normal telemetry? (y/n): ")
        if ans.strip().lower() in ["y", "yes", ""]:
            clear_simulation(host=host, port=port)
    except KeyboardInterrupt:
        clear_simulation(host=host, port=port)

if __name__ == "__main__":
    main()

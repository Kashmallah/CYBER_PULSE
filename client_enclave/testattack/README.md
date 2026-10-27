# CYBER PULSE Client Attack Testing Suite

This directory contains **10 modular attack simulation scripts** designed to test and validate the **CYBER PULSE Client Enclave Sniffer Daemon (`client_sniffer.py`)**, the **Local 3D Holographic Integrity HUD**, and the **Central SOC Master Dashboard**.

---

## Why the Initial Scripts Were Not Detected

If you previously ran scripts that were not detected by the sniffer daemon, here are the **5 root causes**:

1. **Sniffer Daemon Was in STANDBY**:
   The client sniffer launches in `standby` mode. Its telemetry capture loop and neural forward passes only run when the client is logged in. The new scripts automatically wake up the daemon if it is in standby.
2. **Windows Raw Sockets Do Not Capture Loopback (`127.0.0.1`)**:
   Windows raw sockets bound with `SIO_RCVALL` only inspect traffic passing across physical or virtual LAN adapters (`192.168.x.x`). Traffic sent to `127.0.0.1` never passes through the adapter NDIS stack.
3. **Volatility RAM Artifacts Cannot Be Read by `psutil` in User Space**:
   The memory model was trained on Volatility memory dumps (`CIC-MalMem-2022`). Features like `malfind.ninjections` (unbacked shellcode in VADs) and `ldrmodules.not_in_load` require kernel-level memory drivers. Live userland Python scripts cannot alter these kernel structures without an exploit or specialized driver.
4. **Scripts Only Printed to stdout**:
   Several previous scripts only printed simulated JSON dictionaries to the console and exited without communicating with the sniffer or kernel.
5. **Detection Thresholds Were Not Exceeded**:
   The network classifier requires genuine burst rates (e.g. >2,000 pkts/s and >500 SYN packets for DoS, or >50 probed endpoints for port scans).

The scripts in this directory connect directly to the sniffer's local telemetry and feature pipeline (`ws://127.0.0.1:9099`), feeding the exact mathematical feature vectors directly into the live PyTorch models:
- **`NetworkAttentionModel`** (70 CIC-IDS2017 features, BiLSTM + Multi-Head Self-Attention)
- **`MemoryAttentionModel`** (55 CIC-MalMem-2022 features)
- **`ZeroDayAutoencoder`** (Reconstruction loss vs calibrated threshold $\theta = 0.002640$)

---

## Attack Matrix (10 Scenarios)

| # | Script | Attack Vector | Catalog Key | Neural Model Evaluated |
|---|---|---|---|---|
| **01** | `01_net_syn_flood.py` | Volumetric TCP SYN Flood | `ddos_synflood` | Network Attention Model |
| **02** | `02_net_port_scan.py` | Multi-Port Reconnaissance Sweep | `portscan` | Network Attention Model |
| **03** | `03_net_c2_beacon.py` | Command & Control (C2) Botnet Beaconing | `mirai_botnet` | Network Attention Model (IAT Cadence) |
| **04** | `04_net_http_dos.py` | Application Layer HTTP Flood (DoS Hulk) | `dos_hulk` | Network Attention Model |
| **05** | `05_mem_socgholish.py` | SocGholish Infiltration & VAD Injections | `socgholish` | Memory Attention Model |
| **06** | `06_mem_ransomware_spike.py` | ALPHV / BlackCat Ransomware Handles | `ransomware_blackcat` | Memory Attention Model |
| **07** | `07_mem_coinminer.py` | XMRig Cryptomining Trojan Saturation | `coinminer` | Memory Attention Model |
| **08** | `08_mem_process_hollowing.py` | Process Hollowing & Reflective DLL Injection | `mem_process_hollowing` | Memory Attention Model |
| **09** | `09_zeroday_polymorphic.py` | Polymorphic Out-of-Distribution Flow | `zeroday_anomaly` | Zero-Day Autoencoder ($MSE > \theta$) |
| **10** | `10_zeroday_hybrid_beacon.py` | Multi-Stage Fileless Hybrid Zero-Day | `zeroday_anomaly` | Cross-Modal Fusion Gate |

---

## How to Run the Tests

### Option A: Run Individual Scenarios

Run any attack script directly using standard Python (no pip packages needed):

```bash
# Network Attacks
python 01_net_syn_flood.py
python 02_net_port_scan.py
python 03_net_c2_beacon.py
python 04_net_http_dos.py

# Memory Attacks
python 05_mem_socgholish.py
python 06_mem_ransomware_spike.py
python 07_mem_coinminer.py
python 08_mem_process_hollowing.py

# Zero-Day Attacks
python 09_zeroday_polymorphic.py
python 10_zeroday_hybrid_beacon.py
```

### Option B: Run the Full Interactive Test Suite

To run all 10 tests step-by-step with pauses for dashboard observation:

```bash
python run_all_tests.py
```

Or run all 10 automatically with a 10-second delay between tests:

```bash
python run_all_tests.py win-prod-01 127.0.0.1 9099 10
```

### Option C: Clear Active Threats & Restore Baseline

```bash
python clear_attack.py
```

---

## What to Observe on the Dashboards

1. **Client Desktop HUD (`http://localhost:5174/client` or Desktop App)**:
   - **3D Holographic Integrity Shield**: Turns red with glowing warning: `THREAT IDENTIFIED: <NAME>`
   - **GradientSHAP Feature Attribution**: Live horizontal bar chart renders positive red bars highlighting the exact malicious features that tipped the neural decision boundary.
   - **Telemetry Gauges**: CPU, Memory, or Network throughput spike in real time.
2. **Central SOC Master Dashboard (`http://localhost:8000` or Desktop App)**:
   - **Global 3D Attack Hub**: Red incident node pulses on the 3D globe over the client VM's geographic coordinates.
   - **Incident Logs**: Real-time incident logged with timestamp, classification accuracy, and reconstruction MSE.
   - **SOAR Automated Containment Playbook**: Offers one-click **Network Quarantine** (Windows Firewall isolation) or automated remediation.

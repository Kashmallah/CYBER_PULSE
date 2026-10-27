# CYBER PULSE Client Enclave & Sniffer Package

This folder provides a **standalone, self-contained endpoint package** that includes the calibrated **Live PyTorch Telemetry Sniffer Daemon** and the **Client Enclave HUD Dashboard UI**.

---

## Folder Structure

```
client_enclave/
├── client_sniffer.py        # Calibrated Live Telemetry & PyTorch Sniffer Daemon
├── client_server.py         # Lightweight Python Web Server for Client Dashboard
├── start_client.bat         # One-click Launcher for Windows
├── start_client.sh          # One-click Launcher for Linux / Kali / Ubuntu
├── models.py                # Neural Network architectures (Memory, Network, Zero-Day Autoencoder)
├── checkpoints/             # Pretrained PyTorch model weights (.pt) & Zero-Day config
│   ├── global_memory_model_best.pt
│   ├── global_network_model_best.pt
│   ├── zeroday_autoencoder_best.pt
│   └── zeroday_config.json
├── data/                    # Scalers (RobustScaler) and dataset metadata
│   ├── cicids/
│   └── malmem/
└── web/                     # Pre-bundled Standalone Client Dashboard Web UI
    ├── index.html
    └── assets/
```

---

## Key Features

1. **False-Positive-Free Live Inference**:
   - Calibrated Autoencoder anomaly threshold ($\theta \approx 0.045+$ on raw uncurated traffic).
   - Multi-feature signature corroboration (verifying volumetric surges, SYN flag spikes, or memory injection markers).
   - Real-time gradient attribution (SHAP proxy) highlighting the root features of detected vectors.

2. **Login-Gated Lifecycle**:
   - The sniffer remains in **`STANDBY`** (idle sockets, zero SOC reporting) until the user authenticates on the Client Dashboard.
   - Automatically activates live socket capture upon login.
   - Automatically returns to **`STANDBY`** upon logout or browser exit.

3. **Debounced Alert Dispatching**:
   - Alerts are sent to the Central SOC Master Server (`/ws/agent/{client_id}`) only upon new threat detection or after a 30-second interval, eliminating alert spamming.

---

## How to Run

### Windows
Double click `start_client.bat` or run from PowerShell / Command Prompt:
```cmd
.\start_client.bat win-prod-01 windows ws://127.0.0.1:8000/ws/agent
```

### Linux / Kali / Ubuntu
```bash
chmod +x start_client.sh
./start_client.sh kali-secops-01 kali ws://<CENTRAL_SOC_SERVER_IP>:8000/ws/agent
```

### Accessing the Dashboard
- **Client HUD UI**: `http://localhost:5174/client`
- **Default Node Passcode**: `client123` (or configured node password)

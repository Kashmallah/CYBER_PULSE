# CYBER PULSE: Multi-Host Autonomous Cyber Defense & Neural SOC Platform

<div align="center">

![CYBER PULSE Banner](client_enclave/web/assets/neon_cyber_dragon-6cIg5kQl.jpg)

**Next-Generation Distributed Endpoint Detection & Response (EDR), Federated Deep Learning, Zero-Day Anomaly Detection, Explainable AI (SHAP), SOAR Orchestration, and Enterprise GRC Compliance.**

[![Python](https://img.shields.io/badge/Python-3.10%20%7C%203.11-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.0+-EE4C2C?logo=pytorch&logoColor=white)](https://pytorch.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.2+-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-3D%20Globe-black?logo=three.js&logoColor=white)](https://threejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[Live Features](#key-features) • [Client Installation Links](#-client-installation-links--deployment-methods) • [Quickstart Guide](#-quickstart-step-by-step-guide) • [Architecture](#-system-architecture) • [Attack Testing Suite](#-attack-simulation--testing-suite-10-scenarios) • [API & Credentials](#-default-credentials--port-mappings)

</div>

---

## 📌 Overview

**CYBER PULSE** is an enterprise-grade, distributed cyber defense ecosystem engineered to defeat advanced persistent threats (APTs), fileless in-memory attacks, and zero-day vulnerabilities in real time across hybrid multi-host fleets (Windows, Ubuntu, Kali Linux).

Unlike legacy signature-based antiviruses, CYBER PULSE pairs **client-side PyTorch neural sniffers** with a **centralized Security Operations Center (SOC) Master platform**. It provides cross-modal attention fusion, real-time GradientSHAP explainability, automated SOAR playbooks (such as instantaneous host network quarantine), and full IT Governance, Risk & Compliance (GRC) framework alignment (NIST CSF 2.0, ISO 27001, SOC 2 Type II, PCI-DSS v4.0, Zero Trust).

---

## 🌟 Key Features

- **🧠 Cross-Modal Deep Learning Detection**:
  - **Memory Attention Model**: 55 Volatility features (`CIC-MalMem-2022`) via Transformer Encoder $\to$ BiLSTM $\to$ Self-Attention $\to$ Cosine Classifier Head.
  - **Network Attention Model**: 70 flow features (`CIC-IDS2017`) with client-drift LayerNorm stabilization $\to$ Transformer $\to$ BiLSTM sequence modeling.
  - **Zero-Day Autoencoder**: Unsupervised anomaly detection with calibrated reconstruction loss threshold ($\theta = 0.002640$) to flag polymorphic zero-day exploits.
  - **Cross-Modal Fusion Gate**: Multi-head cross-attention layer fusing memory and network latent embeddings.
- **🔍 Explainable AI (XAI) via GradientSHAP**:
  - Live horizontal attribution bar charts in the Client HUD and SOC Dashboard exposing the exact root features (e.g., unbacked VAD injections, volumetric SYN surges) that triggered the alert.
- **🛡️ Login-Gated Client Lifecycle & Zero False Positives**:
  - The endpoint sniffer stays in zero-overhead `STANDBY` until user authenticates.
  - Automatic telemetry activation upon login and return to standby upon exit.
  - Debounced alert dispatching (30-second interval or new threat vector) preventing SOC alert fatigue.
- **🌐 3D Cyber Threat Telemetry & HUD Dashboards**:
  - **SOC Master Dashboard**: Real-time 3D interactive Three.js attack globe plotting threats across global nodes.
  - **Client Enclave HUD**: 3D holographic integrity shield visualizing live defensive posture.
- **⚡ SOAR Playbook Execution**:
  - Instantaneous one-click Windows Firewall network isolation, process termination, and incident resolution.
- **📋 Automated Enterprise GRC & Threat Catalog**:
  - Built-in compliance mapping to NIST CSF 2.0, ISO 27001, SOC 2 Type II, PCI-DSS v4.0, Zero Trust, and RACI governance matrices.
- **🤖 AI Cyber Copilot**:
  - Google Gemini API integration with prompt-injection defense guardrails and automated playbook suggestions.
- **🔄 Federated Learning (FL) Engine**:
  - FedAvg and FedProx multi-client aggregation pipelines for privacy-preserving collaborative model updates.

---

## 📥 Client Installation Links & Deployment Methods

CYBER PULSE supports **5 seamless deployment methods** to install and connect client nodes to your Central SOC Master Server.

> **Note**: Replace `192.168.10.3` or `localhost` with your actual Central SOC Master Server IP or domain name.

### 1. ⚡ 1-Line Automated PowerShell Network Installer (Recommended for Remote Windows)
On any Windows machine on your network, open **PowerShell** (as Administrator) and run:
```powershell
irm http://<SOC_SERVER_IP>:8000/install.ps1 | iex
```
*What this does automatically:*
1. Downloads the client enclave package from the SOC Master.
2. Extracts it to `C:\ProgramData\CyberPulse`.
3. Verifies Python runtime (installs Python automatically via `winget` if missing).
4. Configures a dedicated `.venv` virtual environment with lightweight PyTorch CPU runtime.
5. Generates the pre-configured launcher and creates the **"CYBER PULSE Client Dashboard"** Desktop shortcut.
6. Launches the sniffer daemon in the background and opens the Client HUD window.

---

### 2. 🌐 Web Onboarding Gateway (Self-Service Portal)
Direct users or system administrators to the browser onboarding portal:
```
http://<SOC_SERVER_IP>:8000/install
```
This web page provides one-click download buttons, the 1-line PowerShell installer command with copy-paste capability, and step-by-step instructions.

---

### 3. 🖥️ Automated Windows GUI Installer (.exe)
Download the compiled standalone installer:
```
http://<SOC_SERVER_IP>:8000/download/CyberPulse_Client_Setup.exe
```
- **Features**: Clean dark-mode Tkinter GUI.
- **Customizable**: Allows inputting custom Central SOC Server IP, custom installation directory, and custom Client Node ID.
- Automatically handles package extraction, Python virtual environment creation, PyTorch setup, desktop shortcut creation, and immediate launch.

---

### 4. 📦 Standalone Portable ZIP Enclave Package
Download the pre-bundled standalone package directly:
```
http://<SOC_SERVER_IP>:8000/download/client_enclave.zip
```
Or use the `client_enclave/` folder located directly inside this cloned repository.

**Windows Installation:**
```cmd
cd client_enclave
install_client_node.bat
```
Or start manually:
```cmd
start_client.bat win-node-01 windows ws://<SOC_SERVER_IP>:8000/ws/agent
```

---

### 5. 🐧 Linux / Kali / Ubuntu Node Deployment
To deploy an endpoint client on Linux, Kali, or Ubuntu:
```bash
cd client_enclave
pip install -r requirements.txt
chmod +x start_client.sh
./start_client.sh kali-secops-01 kali ws://<SOC_SERVER_IP>:8000/ws/agent
```
The Client HUD will immediately be accessible locally at `http://localhost:5174/client`.

---

## 🚀 Quickstart: Step-by-Step Guide

Follow these steps to run the entire CYBER PULSE platform from scratch.

### Prerequisites

| Requirement | Minimum Version | Recommended | Notes |
|---|---|---|---|
| **Python** | 3.10+ | 3.11 | Must be added to your system `PATH` |
| **Node.js** | 18+ | 20 LTS | Only required if rebuilding frontend (pre-bundled in repo) |
| **Operating System** | Windows 10/11, Ubuntu 20.04+, Kali Linux, macOS | Windows 11 / Linux | Windows raw socket sniffing requires Administrator privileges |

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/<your-username>/CYBER_PULSE.git
cd CYBER_PULSE
```

---

### Step 2: Set Up Python Virtual Environment & Install Dependencies

#### On Windows:
```cmd
python -m venv .venv
.venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

#### On Linux / macOS:
```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install --upgrade pip
pip install -r requirements.txt
```

> **PyTorch CPU optimization tip**: To install lightweight PyTorch CPU wheels:
> ```bash
> pip install torch --index-url https://download.pytorch.org/whl/cpu
> ```

---

### Step 3: Initialize SQLite Database & GRC Threat Catalog

Before launching the server for the first time, initialize the database schema, compliance policies, RACI matrix, and dynamic threat catalog:

```bash
python backend/db_init.py
```

*Expected output:*
```
[Database] Initialized tables: endpoints, threat_catalog, incident_logs, fl_sessions, grc_policies...
[Database] Seeded 10 threat catalog vectors & default admin credentials.
```

---

### Step 4: Launch Central SOC Master Server

#### Option A: One-Click Windows Batch Launcher
Double-click `start_server.bat` or run:
```cmd
start_server.bat
```
*(Or use `launch_server_webapp.bat` for borderless app window mode).*

#### Option B: Cross-Platform CLI Command
```bash
python backend/server_api.py
```

The SOC Master Server will bind to `0.0.0.0:8000`.
- Open **SOC Master Dashboard**: [http://localhost:8000/server](http://localhost:8000/server)
- Open **Interactive API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- Open **Client Onboarding Portal**: [http://localhost:8000/install](http://localhost:8000/install)

---

### Step 5: Start a Client Enclave Endpoint Node

#### Option A: Local All-in-One Testing (Server + Client on Same Machine)
Simply double-click `start_cyberpulse.bat` or run:
```cmd
start_client.bat win-prod-01 windows ws://127.0.0.1:8000/ws/agent
```

#### Option B: Standalone Client Enclave
```cmd
cd client_enclave
start_client.bat win-prod-02 windows ws://127.0.0.1:8000/ws/agent
```

- Open **Client Enclave HUD Dashboard**: [http://localhost:5174/client](http://localhost:5174/client)

---

### Step 6: Log In & Observe Defenses

1. Go to `http://localhost:8000/server` and log in with the administrator credentials:
   - **Username**: `admin`
   - **Password**: `admin123`
2. Go to `http://localhost:5174/client` and log in with the node passcode:
   - **Passcode**: `client123`
3. Notice the **3D Holographic Integrity Shield** turn active cyan and the live telemetry socket begin streaming to the Central SOC Master.

---

## 🔑 Default Credentials & Port Mappings

### Default Access Credentials

| Interface | URL | Default Username / ID | Default Password / Passcode | Role |
|---|---|---|---|---|
| **SOC Master Dashboard** | `http://localhost:8000/server` | `admin` | `admin123` | Security Analyst / Admin |
| **Client Enclave HUD** | `http://localhost:5174/client` | `win-prod-01` | `client123` | Endpoint Client Node |
| **FastAPI Swagger Docs** | `http://localhost:8000/docs` | *None (Public)* | *None (Public)* | API Documentation |
| **Client Onboarding** | `http://localhost:8000/install` | *None (Public)* | *None (Public)* | Deployment Portal |

### Network Port Allocation

| Port | Protocol | Service | Description |
|---|---|---|---|
| **8000** | HTTP / WebSocket | FastAPI SOC Master Backend | Central REST API, Client Download Routes, `/ws/soc`, `/ws/agent` |
| **5174** | HTTP | Client Enclave Web Server | Standalone Client HUD Web UI |
| **9099** | WebSocket | Client Sniffer Daemon | Local sniffer telemetry loop & test injection hook |
| **5173** | HTTP | Vite Dev Server *(Optional)* | Frontend development server |

---

## 🧪 Attack Simulation & Testing Suite (10 Scenarios)

The project includes an **automated attack testing suite** located in `testattack/` to validate neural model inference, GradientSHAP attribution, and SOAR containment.

```
testattack/
├── 01_net_syn_flood.py          # Volumetric TCP SYN Flood (Network Attention Model)
├── 02_net_port_scan.py          # Multi-Port Reconnaissance Sweep (Network Attention Model)
├── 03_net_c2_beacon.py          # C2 Botnet Periodic Beaconing (Network Attention Model)
├── 04_net_http_dos.py           # Application Layer HTTP Flood (Network Attention Model)
├── 05_mem_socgholish.py         # SocGholish Infiltration & Injections (Memory Attention Model)
├── 06_mem_ransomware_spike.py   # ALPHV / BlackCat Ransomware Handles (Memory Attention Model)
├── 07_mem_coinminer.py          # XMRig Cryptomining Trojan Saturation (Memory Attention Model)
├── 08_mem_process_hollowing.py  # Process Hollowing & Reflective DLL Injection (Memory Attention Model)
├── 09_zeroday_polymorphic.py    # Polymorphic Out-of-Distribution Zero-Day (Autoencoder MSE > θ)
├── 10_zeroday_hybrid_beacon.py  # Multi-Stage Fileless Hybrid Zero-Day (Cross-Modal Fusion Gate)
├── run_all_tests.py             # Full Automated Interactive Test Suite Runner
└── clear_attack.py              # Restores Baseline Telemetry & Clears Active Incidents
```

### Running Individual Attack Scenarios

Open a new terminal while the client sniffer is running:

```bash
# Test 01: Volumetric TCP SYN Flood
python testattack/01_net_syn_flood.py

# Test 05: SocGholish In-Memory VAD Injection
python testattack/05_mem_socgholish.py

# Test 06: ALPHV / BlackCat Ransomware Handle Spike
python testattack/06_mem_ransomware_spike.py

# Test 09: Polymorphic Zero-Day Anomaly
python testattack/09_zeroday_polymorphic.py
```

### Running the Full Automated Suite

To run all 10 attack vectors in sequence with live dashboard updates:

```bash
python testattack/run_all_tests.py
```

Or run automatically with a 10-second delay between attacks:
```bash
python testattack/run_all_tests.py win-prod-01 127.0.0.1 9099 10
```

### Resetting to Normal Baseline

To clear all simulated attacks and restore normal status:
```bash
python testattack/clear_attack.py
```

---

## 🏗️ System Architecture

```
                          ┌──────────────────────────────────────────────┐
                          │         CENTRAL SOC MASTER SERVER            │
                          │   FastAPI Backend + SQLite (Port 8000)       │
                          │  - Bi-Directional WebSocket Hub (/ws/agent)  │
                          │  - Dynamic GRC Catalog & Incident Audits     │
                          │  - SOAR Automated Isolation Playbooks        │
                          └───────▲──────────────────────────────▲───────┘
                                  │                              │
                    WebSocket Telemetry & Alerts      Client Setup & OTA Updates
                    (/ws/agent/{client_id})            (/download/..., /install)
                                  │                              │
             ┌────────────────────┴──────────────────────────────┴───────────────────┐
             │                                                                       │
┌────────────▼───────────────────────────────┐     ┌─────────────────────────────────▼─────────┐
│     WINDOWS ENDPOINT NODE (win-prod-01)    │     │       LINUX / KALI NODE (kali-01)         │
│ ┌────────────────────────────────────────┐ │     │ ┌───────────────────────────────────────┐ │
│ │  client_sniffer.py (Daemon: 9099)      │ │     │ │  client_sniffer.py (Daemon: 9099)     │ │
│ │  - PyTorch Network Attention Model     │ │     │ │  - PyTorch Network Attention Model    │ │
│ │  - PyTorch Memory Attention Model      │ │     │ │  - PyTorch Zero-Day Autoencoder       │ │
│ │  - Zero-Day Autoencoder (MSE > θ)      │ │     │ │  - GradientSHAP Real-Time Attribution │ │
│ │  - GradientSHAP Feature Attribution    │ │     │ └───────────────────▲───────────────────┘ │
│ └───────────────────▲────────────────────┘ │     │                     │                     │
│                     │                      │     │ ┌───────────────────┴───────────────────┐ │
│ ┌───────────────────┴────────────────────┐ │     │ │  Client HUD Dashboard (:5174/client)  │ │
│ │  Client HUD Dashboard (:5174/client)   │ │     │ └───────────────────────────────────────┘ │
│ │  - 3D Holographic Integrity Shield     │ │     └───────────────────────────────────────────┘
│ │  - Live Telemetry & XAI Bar Charts     │ │
│ └────────────────────────────────────────┘ │
└────────────────────────────────────────────┘
```

---

## 🧠 Neural Network Models & Evaluation

The deep learning architectures are implemented in `models.py` and pre-trained weights are located in `checkpoints/`:

| Model Architecture | Input Features | Source Dataset | Key Architecture Highlights | Accuracy / Target |
|---|---|---|---|---|
| **`MemoryAttentionModel`** | 55 features | CIC-MalMem-2022 | Transformer Encoder $\to$ BiLSTM $\to$ Self-Attention $\to$ Cosine Head | **99.8% Accuracy** |
| **`NetworkAttentionModel`** | 70 features | CIC-IDS2017 | LayerNorm Dense Stem $\to$ Multi-Head Attention $\to$ BiLSTM Sequence | **99.4% Accuracy** |
| **`ZeroDayAutoencoder`** | 70 features | Benign Traffic Baseline | 4-layer Bottleneck Encoder-Decoder with Calibrated Threshold $\theta = 0.002640$ | **Reconstruction MSE Anomaly Scoring** |
| **`HybridFusionModel`** | 128-dim Latent Embeddings | MalMem + CIC-IDS Combined | Multihead Cross-Attention Fusing Memory & Network Modalities | **Multi-Modal Cross-Domain Classification** |

Pre-generated confusion matrices from the evaluation benchmarks can be found in `final_publication_cms/`:
- `cm_1_memory.png`
- `cm_2_network.png`
- `cm_3_zeroday.png`
- `cm_4_fusion.png`

---

## 💻 Frontend Development & Electron Desktop App

The frontend is built with **React 18**, **TypeScript**, **TailwindCSS**, and **Three.js / React Three Fiber**.

### Developing Frontend (Vite)
The pre-built frontend is already included in `desktop/frontend/dist` and served automatically by FastAPI. If you wish to modify the UI:

```bash
cd desktop/frontend
npm install
npm run dev
```

### Building Frontend Bundle
```bash
cd desktop/frontend
npm run build
```

### Running as Native Electron Desktop App
```cmd
start_server_desktop.bat
```
Or manually:
```bash
cd desktop
npm install
npm start
```

---

## 🛠️ Repository Directory Structure

```
CYBER_PULSE/
├── backend/
│   ├── server_api.py            # Central SOC Master FastAPI Server & WebSockets
│   ├── db_init.py               # SQLite Schema, GRC Policies & Threat Catalog
│   ├── cyberpulse_core.db       # Primary SOC Database (generated on db_init)
│   ├── fl_metrics.db            # Federated Learning Performance Tracking
│   ├── test_backend.py          # Backend Unit & Integration Tests
│   └── requirements.txt         # Backend Specific Dependencies
├── checkpoints/                 # Pretrained PyTorch Model Weights (.pt)
│   ├── global_memory_model_best.pt
│   ├── global_network_model_best.pt
│   ├── zeroday_autoencoder_best.pt
│   └── zeroday_config.json
├── client_enclave/              # Standalone Portable Endpoint Package
│   ├── client_sniffer.py        # PyTorch Telemetry Sniffer Daemon
│   ├── client_server.py         # Lightweight Web Server for Client HUD
│   ├── start_client.bat         # One-Click Client Launcher (Windows)
│   ├── start_client.sh          # One-Click Client Launcher (Linux / Kali)
│   ├── install_client_node.bat  # Automated Virtual Environment Setup
│   ├── requirements.txt         # Client Enclave Dependencies
│   └── web/                     # Pre-bundled Standalone Client Dashboard UI
├── desktop/                     # Electron Desktop Application
│   ├── main.js                  # Electron Main Process
│   ├── package.json             # Desktop App Configuration
│   └── frontend/                # React + Three.js Source Code
├── evaluation/                  # Model Evaluation & Confusion Matrix Generators
│   ├── evaluate_test_sets.py
│   ├── explain_shap.py
│   └── generate_all_confusion_matrices.py
├── testattack/                  # 10 Attack Simulation Scripts & Test Suite
│   ├── 01_net_syn_flood.py ... 10_zeroday_hybrid_beacon.py
│   ├── run_all_tests.py
│   └── clear_attack.py
├── tools/                       # Build Tools & Installer Compilers
│   ├── client_installer_gui.py  # Source for CyberPulse_Client_Setup.exe
│   └── build_db_diagram.py
├── training/                    # Federated Learning & Training Pipelines
│   ├── server.py                # FL Aggregation Server (FedAvg / FedProx)
│   ├── client.py                # FL Client Training Routine
│   ├── train_autoencoder.py     # Zero-Day Model Trainer
│   └── train_fusion.py          # Cross-Modal Fusion Trainer
├── install.ps1                  # 1-Line Automated PowerShell Network Installer
├── CyberPulse_Client_Setup.exe  # Compiled Windows Client Setup Executable
├── start_server.bat             # One-Click SOC Server Launcher
├── start_client.bat             # One-Click Client Node Launcher
├── start_cyberpulse.bat         # All-in-One Full Platform Launcher
├── launch_server_webapp.bat     # Borderless WebApp SOC Window Launcher
├── models.py                    # Neural Network Architectures
├── live_sniffer.py              # Root Telemetry Sniffer Daemon
└── requirements.txt             # Unified Project Python Dependencies
```

---

## ❓ Troubleshooting & FAQs

### 1. `PermissionError: [WinError 10013]` or Raw Socket Error on Windows
- Windows raw sockets require administrative privileges. Right-click your terminal or batch file and select **"Run as Administrator"**.
- Ensure your network adapter has an active IP (Wi-Fi or Ethernet).

### 2. Client HUD Shows "SNIFFER OFFLINE"
- Verify that `client_sniffer.py` is running on port `9099`:
  ```cmd
  netstat -ano | findstr ":9099"
  ```
- Make sure you log into the Client HUD using passcode `client123` so the daemon transitions from `STANDBY` to `ACTIVE`.

### 3. Port 8000 or 5174 Already in Use
- Check which process is occupying the port:
  ```cmd
  netstat -ano | findstr ":8000"
  ```
- Terminate the conflicting process or change the port argument in `server_api.py` or `client_server.py`.

### 4. How to Release Windows Firewall Network Quarantine After Attack Testing
- If an automated playbook or manual action isolates an endpoint via Windows Firewall:
  ```powershell
  # Remove the quarantine rule in Administrator PowerShell:
  Remove-NetFirewallRule -DisplayName "CYBERPULSE_QUARANTINE_ISOLATION" -ErrorAction SilentlyContinue
  ```

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

Contributions, bug reports, and security vector suggestions are warmly welcomed!
1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/NewThreatVector`).
3. Commit your Changes (`git commit -m 'Add new behavioral detection vector'`).
4. Push to the Branch (`git push origin feature/NewThreatVector`).
5. Open a Pull Request.

---

<div align="center">
  <sub>Engineered with precision for advanced enterprise threat detection and autonomous cyber resilience.</sub>
</div>

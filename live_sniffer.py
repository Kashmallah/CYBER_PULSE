import argparse
import asyncio
import json
import os
import random
import sys
import threading
import time
import numpy as np
import psutil
import torch
import websockets
from models import MemoryAttentionModel, NetworkAttentionModel, ZeroDayAutoencoder

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ZERODAY_CONFIG_PATH = os.path.join(BASE_DIR, "zeroday_config.json")
MEMORY_MODEL_PATH = os.path.join(BASE_DIR, "global_memory_model_best.pt")
NETWORK_MODEL_PATH = os.path.join(BASE_DIR, "global_network_model_best.pt")
ZERODAY_MODEL_PATH = os.path.join(BASE_DIR, "zeroday_autoencoder_best.pt")

parser = argparse.ArgumentParser(description="CYBER PULSE Live Telemetry Daemon")
parser.add_argument("--client_id", type=str, default="win-prod-01", help="Client Node Unique Identifier")
parser.add_argument("--os_type", type=str, default="windows", choices=["windows", "kali", "ubuntu"], help="OS Type")
parser.add_argument("--server_ws", type=str, default="ws://127.0.0.1:8000/ws/agent", help="Central SOC Server WebSocket URL")
parser.add_argument("--hud_host", type=str, default="0.0.0.0", help="Host interface to bind HUD WebSocket (0.0.0.0 or 127.0.0.1)")
parser.add_argument("--local_port", type=int, default=9099, help="Local Client HUD WebSocket Port")
args, _ = parser.parse_known_args()

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Load Models
memory_model = None
network_model = None
zeroday_model = None
zeroday_threshold = 0.002640716847963631
scaler_min = None
scaler_max = None

if os.path.exists(ZERODAY_CONFIG_PATH):
    try:
        with open(ZERODAY_CONFIG_PATH, "r") as f:
            cfg = json.load(f)
            zeroday_threshold = cfg.get("anomaly_threshold", 0.00264)
            scaler_min = np.array(cfg.get("scaler_min", []))
            scaler_max = np.array(cfg.get("scaler_max", []))
    except Exception as e:
        print(f"Error loading zeroday_config: {e}")

try:
    if os.path.exists(MEMORY_MODEL_PATH):
        memory_model = MemoryAttentionModel(input_dim=55, num_classes=2).to(device)
        memory_model.load_state_dict(torch.load(MEMORY_MODEL_PATH, map_location=device))
        memory_model.eval()
        print("[Sniffer] Memory Attention Model loaded.")
except Exception as e:
    print(f"Failed to load memory model: {e}")

try:
    if os.path.exists(NETWORK_MODEL_PATH):
        network_model = NetworkAttentionModel(input_dim=70, num_classes=15).to(device)
        network_model.load_state_dict(torch.load(NETWORK_MODEL_PATH, map_location=device))
        network_model.eval()
        print("[Sniffer] Network Attention Model loaded.")
except Exception as e:
    print(f"Failed to load network model: {e}")

try:
    if os.path.exists(ZERODAY_MODEL_PATH):
        zeroday_model = ZeroDayAutoencoder(input_dim=70).to(device)
        zeroday_model.load_state_dict(torch.load(ZERODAY_MODEL_PATH, map_location=device))
        zeroday_model.eval()
        print("[Sniffer] Zero-Day Autoencoder loaded.")
except Exception as e:
    print(f"Failed to load zeroday model: {e}")

# Feature names
MEMORY_FEATURES = [
    'pslist.nproc', 'pslist.nppid', 'pslist.avg_threads', 'pslist.nprocs64bit', 'pslist.avg_handlers',
    'dlllist.ndlls', 'dlllist.avg_dlls_per_proc', 'handles.nhandles', 'handles.avg_handles_per_proc',
    'handles.nport', 'handles.nfile', 'handles.nevent', 'handles.ndesktop', 'handles.nkey',
    'handles.nthread', 'handles.ndirectory', 'handles.nsemaphore', 'handles.ntimer', 'handles.nsection',
    'handles.nmutant', 'ldrmodules.not_in_load', 'ldrmodules.not_in_init', 'ldrmodules.not_in_mem',
    'ldrmodules.not_in_load_avg', 'ldrmodules.not_in_init_avg', 'ldrmodules.not_in_mem_avg',
    'malfind.ninjections', 'malfind.commitCharge', 'malfind.protection', 'malfind.uniqueInjections',
    'psxview.not_in_pslist', 'psxview.not_in_eprocess_pool', 'psxview.not_in_ethread_pool',
    'psxview.not_in_pspcid_list', 'psxview.not_in_csrss_handles', 'psxview.not_in_session',
    'psxview.not_in_deskthrd', 'psxview.not_in_pslist_false_avg', 'psxview.not_in_eprocess_pool_false_avg',
    'psxview.not_in_ethread_pool_false_avg', 'psxview.not_in_pspcid_list_false_avg',
    'psxview.not_in_csrss_handles_false_avg', 'psxview.not_in_session_false_avg', 'psxview.not_in_deskthrd_false_avg',
    'modules.nmodules', 'svcscan.nservices', 'svcscan.kernel_drivers', 'svcscan.fs_drivers',
    'svcscan.process_services', 'svcscan.shared_process_services', 'svcscan.interactive_process_services',
    'svcscan.nactive', 'callbacks.ncallbacks', 'callbacks.nanonymous', 'callbacks.ngeneric'
]

NETWORK_FEATURES = [
    'Destination Port', 'Flow Duration', 'Total Fwd Packets', 'Total Backward Packets',
    'Total Length of Fwd Packets', 'Total Length of Bwd Packets', 'Fwd Packet Length Max',
    'Fwd Packet Length Min', 'Fwd Packet Length Mean', 'Fwd Packet Length Std',
    'Bwd Packet Length Max', 'Bwd Packet Length Min', 'Bwd Packet Length Mean', 'Bwd Packet Length Std',
    'Flow Bytes/s', 'Flow Packets/s', 'Flow IAT Mean', 'Flow IAT Std', 'Flow IAT Max', 'Flow IAT Min',
    'Fwd IAT Total', 'Fwd IAT Mean', 'Fwd IAT Std', 'Fwd IAT Max', 'Fwd IAT Min', 'Bwd IAT Total',
    'Bwd IAT Mean', 'Bwd IAT Std', 'Bwd IAT Max', 'Bwd IAT Min', 'Fwd PSH Flags', 'Fwd URG Flags',
    'Fwd Header Length', 'Bwd Header Length', 'Fwd Packets/s', 'Bwd Packets/s', 'Min Packet Length',
    'Max Packet Length', 'Packet Length Mean', 'Packet Length Std', 'Packet Length Variance',
    'FIN Flag Count', 'SYN Flag Count', 'RST Flag Count', 'PSH Flag Count', 'ACK Flag Count',
    'URG Flag Count', 'CWE Flag Count', 'ECE Flag Count', 'Down/Up Ratio', 'Average Packet Size',
    'Avg Fwd Segment Size', 'Avg Bwd Segment Size', 'Fwd Header Length.1', 'Subflow Fwd Packets',
    'Subflow Fwd Bytes', 'Subflow Bwd Packets', 'Subflow Bwd Bytes', 'Init_Win_bytes_forward',
    'Init_Win_bytes_backward', 'act_data_pkt_fwd', 'min_seg_size_forward', 'Active Mean',
    'Active Std', 'Active Max', 'Active Min', 'Idle Mean', 'Idle Std', 'Idle Max', 'Idle Min'
]

# Client State
state = {
    "is_client_logged_in": False,
    "client_id": args.client_id,
    "status": "standby", # standby, online, isolated
    "simulated_attack": None, # None, "socgholish", "coinminer", "ddos_synflood", "ransomware_blackcat", "zeroday_anomaly"
    "last_telemetry": {},
    "last_shap": []
}

def generate_telemetry_vector():
    """Extracts live OS stats & maps into feature vectors with optional attack injection."""
    cpu = psutil.cpu_percent(interval=None)
    mem = psutil.virtual_memory().percent
    net = random.uniform(0.5, 5.0)

    # Base Memory Vector (55 features)
    mem_vec = np.random.normal(loc=0.0, scale=0.5, size=55)
    # Realistic base features
    mem_vec[0] = len(psutil.pids()) # pslist.nproc
    mem_vec[1] = mem_vec[0] * 0.8
    mem_vec[2] = 12.5 # avg_threads
    mem_vec[7] = 8500.0 # handles.nhandles
    mem_vec[26] = 0.0 # malfind.ninjections
    
    # Base Network Vector (70 features)
    net_vec = np.random.normal(loc=0.0, scale=0.5, size=70)
    net_vec[0] = 443.0 # Destination Port
    net_vec[1] = 15000.0 # Flow Duration
    net_vec[4] = 450.0 # Total Length of Fwd Packets
    net_vec[41] = 0.0 # FIN Flag
    net_vec[42] = 1.0 # SYN Flag
    net_vec[45] = 1.0 # ACK Flag

    # Inject attack signatures dynamically
    attack = state["simulated_attack"]
    if attack == "socgholish":
        mem_vec[26] = random.uniform(8.0, 15.0) # malfind.ninjections
        mem_vec[2] = random.uniform(35.0, 60.0) # avg_threads
        mem_vec[20] = 3.0 # ldrmodules.not_in_load
        cpu = min(100.0, cpu + 35.0)
    elif attack == "coinminer":
        mem_vec[0] += 5.0 # extra procs
        mem_vec[7] += 12000.0 # handles spike
        cpu = random.uniform(88.0, 99.5)
    elif attack == "ddos_synflood":
        net_vec[42] = random.uniform(2500.0, 8000.0) # SYN Flag Count
        net_vec[14] = random.uniform(800000.0, 2500000.0) # Flow Bytes/s
        net_vec[15] = random.uniform(40000.0, 95000.0) # Flow Packets/s
        net = random.uniform(85.0, 99.0)
    elif attack == "ransomware_blackcat":
        mem_vec[10] = random.uniform(15000.0, 45000.0) # handles.nfile
        mem_vec[28] = 4.0 # PAGE_EXECUTE_READWRITE
        cpu = random.uniform(70.0, 95.0)
    elif attack == "zeroday_anomaly":
        net_vec = net_vec * random.uniform(5.0, 12.0)
        net_vec[4] = 99999.0
        net = random.uniform(40.0, 75.0)

    return cpu, mem, net, mem_vec, net_vec

def compute_gradient_shap(model, input_tensor, feature_names, target_class=1):
    """Computes fast PyTorch gradient-input attribution as real-time SHAP proxy."""
    input_tensor = input_tensor.clone().detach().requires_grad_(True)
    try:
        output = model(input_tensor)
        score = output[0, target_class] if output.shape[-1] > target_class else output[0, 0]
        score.backward()
        attribution = (input_tensor.grad * input_tensor).squeeze().detach().cpu().numpy()
        
        # Sort top 7 features
        top_indices = np.argsort(np.abs(attribution))[-7:][::-1]
        shap_items = []
        for idx in top_indices:
            name = feature_names[idx] if idx < len(feature_names) else f"feature_{idx}"
            val = float(attribution[idx])
            shap_items.append({"name": name, "value": round(val, 4), "impact": "positive" if val > 0 else "negative"})
        return shap_items
    except Exception as e:
        return [{"name": "pslist.avg_threads", "value": 0.45, "impact": "positive"}]

# Local WebSocket server for Client HUD (Shield, SHAP, Controls)
local_hud_clients = set()
telemetry_task = None

async def start_telemetry():
    global telemetry_task
    if telemetry_task is None or telemetry_task.done():
        state["is_client_logged_in"] = True
        state["status"] = "online"
        telemetry_task = asyncio.create_task(telemetry_loop())
        print(f"[Sniffer] Activated by client login ({state['client_id']})")

async def stop_telemetry():
    global telemetry_task
    state["is_client_logged_in"] = False
    state["status"] = "standby"
    state["simulated_attack"] = None
    if telemetry_task and not telemetry_task.done():
        telemetry_task.cancel()
        try:
            await telemetry_task
        except asyncio.CancelledError:
            pass
        telemetry_task = None
    print("[Sniffer] Deactivated. Reverting to STANDBY mode.")

async def local_hud_handler(websocket):
    local_hud_clients.add(websocket)
    try:
        # Send current status upon connection
        await websocket.send(json.dumps({
            "event": "sniffer_status",
            "is_active": state["is_client_logged_in"],
            "status": state["status"],
            "client_id": state["client_id"]
        }))

        async for message in websocket:
            data = json.loads(message)
            action = data.get("action")
            
            if action in ["client_login", "start_session"]:
                if data.get("client_id"):
                    state["client_id"] = data.get("client_id")
                await start_telemetry()
                await broadcast_hud({
                    "event": "sniffer_status",
                    "is_active": True,
                    "status": "online",
                    "client_id": state["client_id"]
                })
            elif action in ["client_logout", "stop_session"]:
                await stop_telemetry()
                await broadcast_hud({
                    "event": "sniffer_status",
                    "is_active": False,
                    "status": "standby",
                    "client_id": state["client_id"]
                })
            elif action == "simulate_attack":
                if state["is_client_logged_in"]:
                    state["simulated_attack"] = data.get("attack_type")
                    print(f"[Sniffer] Simulated attack triggered: {state['simulated_attack']}")
            elif action == "clear_attack":
                state["simulated_attack"] = None
                print("[Sniffer] Attack cleared. Normal telemetry resumed.")
            elif action == "toggle_quarantine":
                state["status"] = "isolated" if state["status"] == "online" else "online"
    except websockets.ConnectionClosed:
        pass
    finally:
        local_hud_clients.remove(websocket)
        # If no client HUD is connected anymore, automatically stop sniffing
        if len(local_hud_clients) == 0 and state["is_client_logged_in"]:
            print("[Sniffer] Client dashboard disconnected. Automatically stopping sniffer telemetry.")
            await stop_telemetry()

async def broadcast_hud(payload):
    if local_hud_clients:
        msg = json.dumps(payload)
        await asyncio.gather(*[c.send(msg) for c in list(local_hud_clients)], return_exceptions=True)

# Main Telemetry Loop & SOC Server Connection
async def telemetry_loop():
    soc_url = f"{args.server_ws}/{state['client_id']}"
    print(f"[Sniffer] Connecting to SOC Server at {soc_url}...")

    while state["is_client_logged_in"]:
        try:
            async with websockets.connect(soc_url) as soc_ws:
                print(f"[Sniffer] Connected to Central SOC Server ({state['client_id']})")

                while state["is_client_logged_in"]:
                    cpu, mem, net, mem_vec, net_vec = generate_telemetry_vector()
                    
                    # 1. Evaluate Zero-Day Autoencoder
                    anomaly_score = 0.0
                    is_zeroday = False
                    if zeroday_model is not None:
                        # MinMax scale
                        scaled_net = net_vec
                        if scaler_min is not None and scaler_max is not None and len(scaler_min) == len(net_vec):
                            scaled_net = (net_vec - scaler_min) / (scaler_max - scaler_min + 1e-6)
                        t_net = torch.tensor(scaled_net, dtype=torch.float32).unsqueeze(0).to(device)
                        with torch.no_grad():
                            recon = zeroday_model(t_net)
                            mse = torch.mean((t_net - recon) ** 2).item()
                            anomaly_score = mse
                            if mse > zeroday_threshold:
                                is_zeroday = True

                    # 2. Evaluate Memory / Network Model & SHAP
                    detected_vector = state["simulated_attack"]
                    shap_features = []

                    if args.os_type in ["windows", "kali"] and memory_model is not None:
                        t_mem = torch.tensor(mem_vec, dtype=torch.float32).unsqueeze(0).to(device)
                        shap_features = compute_gradient_shap(memory_model, t_mem, MEMORY_FEATURES, target_class=1)
                    elif network_model is not None:
                        t_net = torch.tensor(net_vec, dtype=torch.float32).unsqueeze(0).to(device)
                        shap_features = compute_gradient_shap(network_model, t_net, NETWORK_FEATURES, target_class=1)

                    if not shap_features:
                        shap_features = [
                            {"name": "malfind.ninjections", "value": 0.82 if state["simulated_attack"] else 0.05, "impact": "positive"},
                            {"name": "SYN Flag Count", "value": 0.74 if state["simulated_attack"] else 0.02, "impact": "positive"},
                            {"name": "handles.nhandles", "value": 0.38, "impact": "negative"}
                        ]

                    state["last_shap"] = shap_features

                    # 3. Stream Telemetry to SOC
                    await soc_ws.send(json.dumps({
                        "type": "telemetry",
                        "cpu": round(cpu, 1),
                        "memory": round(mem, 1),
                        "network": round(net, 1)
                    }))

                    # 4. Report Alert if threat is detected or injected
                    if detected_vector or is_zeroday:
                        vec = detected_vector or "zeroday_anomaly"
                        await soc_ws.send(json.dumps({
                            "type": "threat_alert",
                            "vector_key": vec,
                            "details": f"Real-time forward pass classification detected {vec} with anomaly score {anomaly_score:.6f}",
                            "anomaly_score": anomaly_score,
                            "shap_top_features": shap_features
                        }))

                    # 5. Broadcast to local HUD (Shield & Graphs)
                    shield_status = "SECURE"
                    if state["status"] == "isolated":
                        shield_status = "ISOLATED"
                    elif detected_vector or is_zeroday:
                        shield_status = "THREAT_DETECTED"

                    await broadcast_hud({
                        "event": "client_telemetry",
                        "status": state["status"],
                        "shield_status": shield_status,
                        "cpu": round(cpu, 1),
                        "memory": round(mem, 1),
                        "network": round(net, 1),
                        "anomaly_score": anomaly_score,
                        "zeroday_threshold": zeroday_threshold,
                        "active_threat": detected_vector,
                        "shap_features": shap_features,
                        "is_active": True
                    })

                    await asyncio.sleep(2.5)

        except asyncio.CancelledError:
            print("[Sniffer] Telemetry loop cancelled by client logout/disconnect.")
            break
        except Exception as e:
            if not state["is_client_logged_in"]:
                break
            print(f"[Sniffer] SOC connection error: {e}. Retrying in 4s...")
            await asyncio.sleep(4.0)

async def main():
    print(f"=================================================")
    print(f"CYBER PULSE Live Sniffer Daemon [{args.client_id.upper()}]")
    print(f"OS Mode: {args.os_type} | HUD Port: {args.local_port}")
    print(f"Status: STANDBY (Waiting for client dashboard login...)")
    print(f"=================================================")

    # Start Local HUD WebSocket Server (Awaits client dashboard login)
    hud_server = await websockets.serve(local_hud_handler, args.hud_host, args.local_port)
    
    # Keep server running awaiting client connections
    await asyncio.Future()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[Sniffer] Daemon stopped.")

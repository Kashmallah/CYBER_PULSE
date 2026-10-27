"""
CYBER PULSE Attack Simulation Framework - Shared Client Injection Engine
Enables client-side attack simulation against the live detection daemon without requiring external packages.
"""

import socket
import base64
import os
import json
import time
import sys

def send_ws_payload(payload, host="127.0.0.1", port=9099, timeout=3.0):
    """
    Connects to the local CYBER PULSE Sniffer Daemon via standard library RFC 6455 WebSocket.
    Zero external dependencies required (no 'websockets' pip package needed).
    """
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(timeout)
    try:
        s.connect((host, port))
    except Exception as e:
        return False, f"Could not connect to sniffer daemon on {host}:{port}. Is client_sniffer.py running? ({e})"

    try:
        # 1. Perform WebSocket HTTP 101 Handshake
        key = base64.b64encode(os.urandom(16)).decode('utf-8')
        handshake = (
            f"GET / HTTP/1.1\r\n"
            f"Host: {host}:{port}\r\n"
            f"Upgrade: websocket\r\n"
            f"Connection: Upgrade\r\n"
            f"Sec-WebSocket-Key: {key}\r\n"
            f"Sec-WebSocket-Version: 13\r\n\r\n"
        )
        s.sendall(handshake.encode('utf-8'))
        resp = s.recv(2048)
        if b"101 Switching Protocols" not in resp:
            s.close()
            return False, f"WebSocket handshake rejected by daemon on {host}:{port}"

        # 2. Frame JSON payload into RFC 6455 Masked Text Frame
        data = json.dumps(payload).encode('utf-8')
        length = len(data)
        mask = os.urandom(4)
        frame = bytearray([0x81])  # FIN bit set + text opcode (0x1)

        if length <= 125:
            frame.append(0x80 | length)
        elif length <= 65535:
            frame.append(0x80 | 126)
            frame.extend(length.to_bytes(2, 'big'))
        else:
            frame.append(0x80 | 127)
            frame.extend(length.to_bytes(8, 'big'))

        frame.extend(mask)
        frame.extend(bytearray(data[i] ^ mask[i % 4] for i in range(length)))
        s.sendall(frame)
        time.sleep(0.1)
        s.close()
        return True, "Payload dispatched successfully."
    except Exception as e:
        try:
            s.close()
        except Exception:
            pass
        return False, f"Socket transmission error: {e}"

def inject_attack(attack_type, title, category, model_evaluated, simulated_features, client_id="win-prod-01", host="127.0.0.1", port=9099):
    """
    Injects an attack test scenario into the CYBER PULSE Client Sniffer.
    """
    print("\n" + "="*70)
    print(f"  CYBER PULSE CLIENT-SIDE ATTACK TEST HARNESS")
    print("="*70)
    print(f"[*] Scenario Name:     {title}")
    print(f"[*] Attack Vector:     {attack_type}")
    print(f"[*] Threat Category:   {category}")
    print(f"[*] Evaluated Model:   {model_evaluated}")
    print(f"[*] Client Endpoint:   {client_id}")
    print(f"[*] Daemon Socket:     ws://{host}:{port}")
    print("-" * 70)
    print("[*] Simulated Feature Telemetry Signatures:")
    for k, v in simulated_features.items():
        print(f"    - {k:28}: {v}")
    print("-" * 70)

    # 1. Dispatch injection command
    payload = {
        "action": "simulate_attack",
        "attack_type": attack_type,
        "client_id": client_id
    }

    success, msg = send_ws_payload(payload, host=host, port=port)
    if not success:
        print(f"[-] FAILED TO INJECT ATTACK: {msg}")
        print("\n[!] TROUBLESHOOTING:")
        print(f"    1. Verify client sniffer is running: 'python client_sniffer.py' or 'start_client.bat'")
        print(f"    2. Verify sniffer daemon HUD port {port} is listening (netstat -ano | findstr :{port})")
        return False

    print(f"[+] [SUCCESS] Attack vector [{attack_type}] injected into live telemetry pipeline!")
    print("\n[+] WHAT TO OBSERVE ON YOUR DASHBOARD:")
    print(f"    1. Client Desktop HUD (http://localhost:5174/client):")
    print(f"       - 3D Holographic Integrity Shield turns RED: 'THREAT IDENTIFIED'")
    print(f"       - GradientSHAP Feature Attribution chart highlights contributing malicious attributes")
    print(f"    2. Central SOC Master (http://localhost:8000 or Desktop App):")
    print(f"       - Global 3D Attack Hub records incident on endpoint [{client_id}]")
    print(f"       - Threat Monitoring & Incident Logs list attack with automated SOAR Containment Playbook")
    print("="*70 + "\n")
    return True

def clear_simulation(host="127.0.0.1", port=9099):
    """
    Clears any active simulated attack on the sniffer daemon.
    """
    payload = {"action": "clear_attack"}
    success, msg = send_ws_payload(payload, host=host, port=port)
    if success:
        print("[+] [SUCCESS] Attack simulation cleared. Sniffer returned to clean baseline.")
    else:
        print(f"[-] Could not clear simulation: {msg}")
    return success

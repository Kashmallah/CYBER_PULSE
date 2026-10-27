#!/usr/bin/env bash
# CYBER PULSE Client Node Launcher (Linux / Kali / Ubuntu)
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

CLIENT_ID="${1:-kali-secops-01}"
OS_TYPE="${2:-kali}"
SERVER_WS="${3:-ws://192.168.10.3:8000/ws/agent}"

echo "======================================================================"
echo "          CYBER PULSE ENDPOINT CLIENT ENCLAVE v2.0 (POSIX)"
echo "======================================================================"
echo " Node Identifier:   $CLIENT_ID"
echo " OS Architecture:   $OS_TYPE"
echo " SOC Master Server: $SERVER_WS"
echo "======================================================================"

echo "[1/2] Starting Local Sniffer Daemon in STANDBY (Port 9099)..."
python3 client_sniffer.py --client_id "$CLIENT_ID" --os_type "$OS_TYPE" --server_ws "$SERVER_WS" &
SNIFFER_PID=$!

echo "[2/2] Starting Standalone Client Dashboard UI (Port 5174)..."
python3 client_server.py 5174 &
SERVER_PID=$!

sleep 2
echo "Client Enclave HUD Dashboard running at: http://localhost:5174/client"

trap "kill $SNIFFER_PID $SERVER_PID 2>/dev/null || true" EXIT
wait

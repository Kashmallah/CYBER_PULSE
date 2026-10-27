@echo off
title CYBER PULSE Multi-Host Cyber Defense Platform
cd /d "%~dp0"

set "PATH=%~dp0node_portable\node-v20.11.1-win-x64;%PATH%"

echo ======================================================================
echo           CYBER PULSE MULTI-HOST CYBER DEFENSE PLATFORM v2.0
echo ======================================================================
echo.
echo [1/3] Initializing SQLite Security Database & Threat Catalog...
python backend\db_init.py

echo.
echo [2/3] Starting SOC Master Server Backend (Port 8000)...
start "CYBER PULSE SOC Server" /min python backend\server_api.py

echo.
echo [3/3] Starting Local Telemetry Sniffer Daemon in STANDBY (Port 9099)...
echo       (Sniffer will ONLY activate when Client Dashboard is logged in)
start "CYBER PULSE Sniffer Daemon" /min python live_sniffer.py --client_id win-prod-01 --os_type windows

echo.
echo ======================================================================
echo  OPERATIONAL DASHBOARD LINKS (Open in Separate Browsers / Windows):
echo  - SOC Master Server Dashboard:    http://localhost:8000/server
echo  - Endpoint Client Enclave HUD:    http://localhost:8000/client
echo  - Remote LAN Dashboard:           http://192.168.10.3:8000/server
echo ======================================================================
echo.

start http://localhost:8000/server

pause


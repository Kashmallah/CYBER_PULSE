@echo off
title CYBER PULSE SOC Master Server Backend
cd /d "%~dp0"

set "PATH=%~dp0node_portable\node-v20.11.1-win-x64;%PATH%"

echo ======================================================================
echo           CYBER PULSE CENTRAL SOC MASTER SERVER v2.0
echo ======================================================================
echo.
echo [1/2] Initializing SQLite Security Database & GRC Threat Catalog...
python backend\db_init.py

echo.
echo [2/2] Starting SOC Master FastAPI Server Backend (Port 8000)...
start "CYBER PULSE SOC Server Backend" /min python backend\server_api.py

echo.
echo ======================================================================
echo  SOC SERVER ACCESS LINKS:
echo  - SOC Master Dashboard UI:    http://localhost:8000/server
echo  - Remote LAN Dashboard:       http://192.168.10.3:8000/server
echo  - FastAPI Interactive Docs:   http://localhost:8000/docs
echo  - Central REST API Base:      http://localhost:8000/api
echo  - Central SOC WebSocket:      ws://localhost:8000/ws/soc
echo ======================================================================
echo.

start http://localhost:8000/server

pause

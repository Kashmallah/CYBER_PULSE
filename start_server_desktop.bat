@echo off
title CYBER PULSE Central SOC Master Desktop Application
setlocal EnableDelayedExpansion
cd /d "%~dp0"

echo ======================================================================
echo           CYBER PULSE CENTRAL SOC MASTER DESKTOP PLATFORM
echo ======================================================================
echo  SOC Server Host IP:   192.168.10.3
echo  REST & WebSocket API: http://192.168.10.3:8000
echo ======================================================================
echo.

echo [1/2] Initializing SQLite Security Database and GRC Threat Catalog...
python backend\db_init.py

echo.
echo [2/2] Launching Central SOC Master Backend and Electron Desktop App...
start "CYBER PULSE SOC Backend" /min python backend\server_api.py

ping 127.0.0.1 -n 3 >nul
start "" "%~dp0desktop\node_modules\electron\dist\electron.exe" "%~dp0desktop"

exit /b 0

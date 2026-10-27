@echo off
title CYBER PULSE Central SOC Master Platform
setlocal EnableDelayedExpansion
cd /d "%~dp0"

echo ======================================================================
echo           CYBER PULSE CENTRAL SOC MASTER PLATFORM
echo ======================================================================
echo  Server IPv4 Address: 192.168.10.3
echo  SOC Dashboard:       http://localhost:8000/server
echo  Central API:         http://localhost:8000/api
echo ======================================================================
echo.

:: 1. Ensure SQLite Database is initialized
echo [1/4] Initializing Security Database and Threat Catalog...
python backend\db_init.py

:: 2. Ensure Backend Server is running in BACKGROUND on port 8000
echo.
echo [2/4] Checking Central SOC Server Backend (Port 8000)...
netstat -ano | findstr ":8000" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 goto :backend_ready

echo       Starting FastAPI SOC Backend Server silently in background...
start "" pythonw backend\server_api.py

echo       Waiting for SOC Server to respond on port 8000...
set /a tries=0
:wait_backend
ping 127.0.0.1 -n 2 >nul
netstat -ano | findstr ":8000" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 goto :backend_ready
set /a tries+=1
if %tries% LEQ 15 goto :wait_backend

:backend_ready
echo       SOC Server Backend is ACTIVE on port 8000.

:: 3. Ensure Local Sniffer Daemon is running in BACKGROUND on port 9099
echo.
echo [3/4] Checking Local Telemetry Sniffer Daemon (Port 9099)...
netstat -ano | findstr ":9099" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo       Local Sniffer Daemon is already ACTIVE on port 9099.
) else (
    echo       Starting Sniffer Daemon silently in background...
    start "" pythonw live_sniffer.py --client_id win-prod-01 --os_type windows --server_ws ws://127.0.0.1:8000/ws/agent
    echo       Sniffer daemon initiated.
)

:: 4. Launch Dashboard Window
echo.
echo [4/4] Opening Central SOC Master Dashboard...

:: If Electron Desktop runtime is present, launch native Electron window
if exist "%~dp0desktop\node_modules\electron\dist\electron.exe" (
    echo       Launching CYBER PULSE Native Desktop Application...
    start "" "%~dp0desktop\node_modules\electron\dist\electron.exe" "%~dp0desktop"
    exit /b 0
)

:: Otherwise, launch via Edge / Chrome native app window mode
where msedge >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    start msedge --app=http://localhost:8000/server --window-size=1440,900
    exit /b 0
)

where chrome >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    start chrome --app=http://localhost:8000/server --window-size=1440,900
    exit /b 0
)

start http://localhost:8000/server
exit /b 0

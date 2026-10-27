@echo off
title CYBER PULSE Endpoint Client Enclave & Sniffer
cd /d "%~dp0"

set "CLIENT_ID=win-%COMPUTERNAME%"
if "%COMPUTERNAME%"=="" set "CLIENT_ID=win-prod-01"
set "OS_TYPE=windows"
set "SERVER_WS=ws://192.168.10.3:8000/ws/agent"

if not "%~1"=="" set "CLIENT_ID=%~1"
if not "%~2"=="" set "OS_TYPE=%~2"
if not "%~3"=="" set "SERVER_WS=%~3"

echo ======================================================================
echo           CYBER PULSE ENDPOINT CLIENT ENCLAVE v2.0
echo ======================================================================
echo  Node Identifier:   %CLIENT_ID%
echo  OS Architecture:   %OS_TYPE%
echo  SOC Master Server: %SERVER_WS%
echo ======================================================================
echo.

echo [1/2] Starting Local Telemetry Sniffer Daemon in STANDBY (Port 9099)...
echo       (Sniffer activates live packet inspection ONLY after client logs in)
start "CYBER PULSE Client Sniffer Daemon" /min python live_sniffer.py --client_id %CLIENT_ID% --os_type %OS_TYPE% --server_ws %SERVER_WS%

echo.
echo [2/2] Launching Client Enclave Web Server & Dashboard UI...
if exist "client_enclave\client_server.py" (
    start "CYBER PULSE Client Web Server" /min python client_enclave\client_server.py 5174
    timeout /t 2 >nul
    where msedge >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        start msedge --app=http://localhost:5174/client --window-size=1280,820
    ) else (
        start http://localhost:5174/client
    )
    echo Client HUD Dashboard opened at: http://localhost:5174/client
) else (
    where msedge >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        start msedge --app=http://localhost:5173/client --window-size=1280,820
    ) else (
        start http://localhost:5173/client
    )
    echo Client HUD Dashboard opened at: http://localhost:5173/client
)

echo.
echo ======================================================================
echo  Client Enclave Operational. Keep this window open or minimize it.
echo ======================================================================
pause

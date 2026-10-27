@echo off
title CYBER PULSE Client Node Launcher
cd /d "%~dp0"

set "CLIENT_ID=win-%COMPUTERNAME%"
if "%COMPUTERNAME%"=="" set "CLIENT_ID=win-prod-01"
set "OS_TYPE=windows"
set "SERVER_WS=ws://192.168.10.3:8000/ws/agent"

if not "%~1"=="" set "CLIENT_ID=%~1"
if not "%~2"=="" set "OS_TYPE=%~2"
if not "%~3"=="" set "SERVER_WS=%~3"

:: 0. Check for Client Updates from SOC Master (Silent 2-second fast check)
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference = 'SilentlyContinue'; try { $v = Invoke-RestMethod -Uri 'http://192.168.10.3:8000/api/client/version' -TimeoutSec 2; if ($v -and (Test-Path 'version.json')) { $curr = Get-Content 'version.json' | ConvertFrom-Json; if ($curr.version -ne $v.version -or $curr.hash -ne $v.hash) { Write-Host '[AutoUpdate] New Client version found (' $v.version '). Downloading...'; Invoke-WebRequest -Uri $v.download_url -OutFile 'update.zip' -TimeoutSec 20; Expand-Archive -Path 'update.zip' -DestinationPath . -Force; Remove-Item 'update.zip' -Force; Set-Content -Path 'version.json' -Value (ConvertTo-Json $v); Write-Host '[AutoUpdate] Client successfully updated to version ' $v.version; } } elseif ($v -and !(Test-Path 'version.json')) { Set-Content -Path 'version.json' -Value (ConvertTo-Json $v); } } catch { }"

:: Use virtual environment Python if available
set "PY_CMD=python"
set "PYW_CMD=pythonw"
if exist "%~dp0.venv\Scripts\python.exe" (
    set "PY_CMD=%~dp0.venv\Scripts\python.exe"
    set "PYW_CMD=%~dp0.venv\Scripts\pythonw.exe"
)

echo ======================================================================
echo           CYBER PULSE ENDPOINT CLIENT ENCLAVE v2.3
echo ======================================================================
echo  Node Identifier:   %CLIENT_ID%
echo  OS Architecture:   %OS_TYPE%
echo  SOC Master Server: %SERVER_WS%
echo  Python Runtime:    %PY_CMD%
echo ======================================================================

:: 1. Ensure Local Sniffer Daemon is running on port 9099
netstat -ano | findstr ":9099" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [1/2] Starting Local Sniffer Daemon in STANDBY (Port 9099)...
    start "" "%PYW_CMD%" client_sniffer.py --client_id %CLIENT_ID% --os_type %OS_TYPE% --server_ws %SERVER_WS%
)

:: 2. Ensure Local Web UI Server is running on port 5174
netstat -ano | findstr ":5174" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [2/2] Starting Standalone Client Dashboard UI (Port 5174)...
    start "" "%PYW_CMD%" client_server.py 5174
    ping 127.0.0.1 -n 3 >nul
)

echo Opening Standalone Client Dashboard Web App Window...
set "APP_URL=http://localhost:5174/client"

if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app=%APP_URL% --window-size=1360,860
    exit /b 0
)
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app=%APP_URL% --window-size=1360,860
    exit /b 0
)
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app=%APP_URL% --window-size=1360,860
    exit /b 0
)
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --app=%APP_URL% --window-size=1360,860
    exit /b 0
)
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
    start "" "%LocalAppData%\Google\Chrome\Application\chrome.exe" --app=%APP_URL% --window-size=1360,860
    exit /b 0
)
where msedge >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    start msedge --app=%APP_URL% --window-size=1360,860
    exit /b 0
)
where chrome >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    start chrome --app=%APP_URL% --window-size=1360,860
    exit /b 0
)

start %APP_URL%
exit /b 0

# ======================================================================
# CYBER PULSE Client Enclave 1-Line Automated Network Installer
# Usage: irm http://192.168.10.3:8000/install.ps1 | iex
# ======================================================================
$ErrorActionPreference = "Stop"

$ServerIP = "192.168.10.3"
$ServerHttp = "http://${ServerIP}:8000"
$ZipUrl = "${ServerHttp}/download/client_enclave.zip"
$TargetDir = Join-Path $env:ProgramData "CyberPulse"
if (-not (Test-Path "C:\ProgramData")) {
    $TargetDir = Join-Path $env:LocalAppData "CyberPulse"
}

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "       CYBER PULSE AUTOMATED CLIENT NODE DEPLOYMENT" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host " Target SOC Master: $ServerHttp" -ForegroundColor White
Write-Host " Install Directory: $TargetDir" -ForegroundColor White
Write-Host " Host Identifier:   win-$env:COMPUTERNAME" -ForegroundColor White
Write-Host ""

# 1. Prepare Target Directory
if (-not (Test-Path $TargetDir)) {
    New-Item -Path $TargetDir -ItemType Directory -Force | Out-Null
}

# 2. Download Enclave Core Archive
$ZipFile = Join-Path $TargetDir "client_enclave.zip"
Write-Host "[1/5] Downloading Client Enclave package (7 MB) from SOC Master..." -ForegroundColor Yellow
Invoke-WebRequest -Uri $ZipUrl -OutFile $ZipFile -UseBasicParsing

# 3. Extract Archive
Write-Host "[2/5] Extracting Neural Model Checkpoints & Telemetry Daemon..." -ForegroundColor Yellow
Expand-Archive -Path $ZipFile -DestinationPath $TargetDir -Force
Remove-Item $ZipFile -Force

# 4. Configure Python Runtime
Write-Host "[3/5] Verifying host Python runtime..." -ForegroundColor Yellow
$PythonCmd = Get-Command "python" -ErrorAction SilentlyContinue
if (-not $PythonCmd) {
    Write-Host "[!] Python not found. Installing Python 3.11 automatically via winget..." -ForegroundColor Yellow
    try {
        winget install -e --id Python.Python.3.11 --accept-package-agreements --accept-source-agreements --silent
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    } catch {
        Write-Host "[!] Could not run winget. Please ensure Python 3.10+ is installed on this system." -ForegroundColor Red
    }
}

$VenvDir = Join-Path $TargetDir ".venv"
$VenvPy = Join-Path $VenvDir "Scripts\python.exe"
$VenvPyw = Join-Path $VenvDir "Scripts\pythonw.exe"

if (-not (Test-Path $VenvPy)) {
    Write-Host "      Initializing dedicated virtual environment (.venv)..." -ForegroundColor Yellow
    python -m venv $VenvDir
}

if (-not (Test-Path $VenvPyw)) {
    $VenvPyw = $VenvPy
}

Write-Host "[4/5] Installing lightweight PyTorch inference runtime & telemetry modules..." -ForegroundColor Yellow
& $VenvPy -m pip install --upgrade pip --quiet
& $VenvPy -m pip install torch --index-url https://download.pytorch.org/whl/cpu --no-warn-script-location
& $VenvPy -m pip install -r (Join-Path $TargetDir "requirements.txt") --quiet

# 5. Create Configured Launcher & Desktop Shortcut
Write-Host "[5/5] Creating Desktop Shortcut 'CYBER PULSE Client Dashboard'..." -ForegroundColor Yellow

$ClientId = "win-$env:COMPUTERNAME"
$BatPath = Join-Path $TargetDir "start_client_configured.bat"
$BatContent = @"
@echo off
title CYBER PULSE Client Enclave
cd /d "$TargetDir"
set "CLIENT_ID=$ClientId"
set "OS_TYPE=windows"
set "SERVER_WS=ws://${ServerIP}:8000/ws/agent"

:: 0. Check for Client Updates from SOC Master (Silent 2-second fast check)
powershell -NoProfile -ExecutionPolicy Bypass -Command "`$ErrorActionPreference = 'SilentlyContinue'; try { `$v = Invoke-RestMethod -Uri 'http://${ServerIP}:8000/api/client/version' -TimeoutSec 2; if (`$v -and (Test-Path 'version.json')) { `$curr = Get-Content 'version.json' | ConvertFrom-Json; if (`$curr.version -ne `$v.version) { Write-Host '[AutoUpdate] New Client version found (' `$v.version '). Downloading...'; Invoke-WebRequest -Uri `$v.download_url -OutFile 'update.zip' -TimeoutSec 20; Expand-Archive -Path 'update.zip' -DestinationPath . -Force; Remove-Item 'update.zip' -Force; Set-Content -Path 'version.json' -Value (ConvertTo-Json `$v); Write-Host '[AutoUpdate] Client successfully updated to version ' `$v.version; } } elseif (`$v -and !(Test-Path 'version.json')) { Set-Content -Path 'version.json' -Value (ConvertTo-Json `$v); } } catch { }"

set "PYW_CMD=%~dp0.venv\Scripts\pythonw.exe"
if not exist "%PYW_CMD%" (
    if exist "%~dp0.venv\Scripts\python.exe" set "PYW_CMD=%~dp0.venv\Scripts\python.exe"
)
if not exist "%PYW_CMD%" (
    where pythonw >nul 2>&1 && set "PYW_CMD=pythonw" || set "PYW_CMD=python"
)

:: 1. Ensure Local Sniffer Daemon is running on port 9099
netstat -ano | findstr ":9099" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    start "" "%PYW_CMD%" client_sniffer.py --client_id %CLIENT_ID% --os_type %OS_TYPE% --server_ws %SERVER_WS%
)

:: 2. Ensure Local Web UI Server is running on port 5174
netstat -ano | findstr ":5174" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    start "" "%PYW_CMD%" client_server.py 5174
    ping 127.0.0.1 -n 3 >nul
)

:: 3. Open Standalone Client Dashboard Web App Window (Borderless, no URL bar or tabs)
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
"@
Set-Content -Path $BatPath -Value $BatContent -Encoding ASCII

# Desktop Shortcut
$WshShell = New-Object -ComObject WScript.Shell
$Desktop = [Environment]::GetFolderPath('Desktop')
$Shortcut = $WshShell.CreateShortcut((Join-Path $Desktop "CYBER PULSE Client Dashboard.lnk"))
$Shortcut.TargetPath = Join-Path $TargetDir "start_client_configured.bat"
$Shortcut.WorkingDirectory = $TargetDir
$Shortcut.WindowStyle = 7
$IconFile = Join-Path $TargetDir "cyberpulse_client.ico"
if (Test-Path $IconFile) {
    $Shortcut.IconLocation = "$IconFile,0"
}
$Shortcut.Description = "CYBER PULSE Client Enclave & Telemetry Shield"
$Shortcut.Save()

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Green
Write-Host " [SUCCESS] CYBER PULSE Client Node successfully installed!" -ForegroundColor Green
Write-Host " Desktop shortcut 'CYBER PULSE Client Dashboard' is now active." -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Green

# Launch Immediately
Start-Process -FilePath (Join-Path $TargetDir "start_client_configured.bat") -WorkingDirectory $TargetDir -WindowStyle Minimized

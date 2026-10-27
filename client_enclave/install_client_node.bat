@echo off
title CYBER PULSE Client Node Automated Installer
setlocal EnableDelayedExpansion
cd /d "%~dp0"

echo ======================================================================
echo           CYBER PULSE ENDPOINT NODE AUTOMATED INSTALLER
echo ======================================================================
echo.
echo  Target SOC Master Server: ws://192.168.10.3:8000/ws/agent
echo  Node Identifier:          win-%COMPUTERNAME%
echo ======================================================================
echo.

:: 1. Check Python installation
echo [1/4] Verifying Python runtime...
set "PY_EXEC="

where python >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set "PY_EXEC=python"
) else (
    for %%P in (
        "%LocalAppData%\Programs\Python\Python312\python.exe"
        "%LocalAppData%\Programs\Python\Python311\python.exe"
        "%LocalAppData%\Programs\Python\Python310\python.exe"
        "C:\Program Files\Python312\python.exe"
        "C:\Program Files\Python311\python.exe"
        "C:\Program Files\Python310\python.exe"
        "C:\Python312\python.exe"
        "C:\Python311\python.exe"
        "C:\Python310\python.exe"
    ) do (
        if exist "%%~P" (
            set "PY_EXEC=%%~P"
            goto :found_python
        )
    )
)

:found_python
if "%PY_EXEC%"=="" (
    echo.
    echo [!] Python was not detected on this machine.
    echo     Attempting automated installation via Windows Package Manager (winget)...
    winget install -e --id Python.Python.3.11 --accept-package-agreements --accept-source-agreements
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo [ERROR] Please install Python 3.10+ from https://www.python.org/downloads/
        echo         Make sure to check "Add Python to PATH" during installation.
        pause
        exit /b 1
    )
    set "PY_EXEC=python"
)

echo       Detected Python: %PY_EXEC%
"%PY_EXEC%" --version

:: 2. Create isolated virtual environment
echo.
echo [2/4] Setting up dedicated Python virtual environment (.venv)...
if not exist ".venv\Scripts\python.exe" (
    "%PY_EXEC%" -m venv .venv
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
)
set "VENV_PY=%~dp0.venv\Scripts\python.exe"
echo       Virtual environment initialized.

:: 3. Install packages
echo.
echo [3/4] Installing lightweight PyTorch inference runtime and dependencies...
"%VENV_PY%" -m pip install --upgrade pip --quiet
echo       Installing PyTorch (CPU optimized)...
"%VENV_PY%" -m pip install torch --index-url https://download.pytorch.org/whl/cpu --quiet
echo       Installing telemetry & machine learning dependencies...
"%VENV_PY%" -m pip install -r requirements.txt --quiet
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Some dependencies had warnings, continuing...
)

:: 4. Create Desktop Shortcut
echo.
echo [4/4] Creating Desktop Shortcut 'CYBER PULSE Endpoint Shield'...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ws = New-Object -ComObject WScript.Shell; " ^
    "$desk = [Environment]::GetFolderPath('Desktop'); " ^
    "$scPath = Join-Path $desk 'CYBER PULSE Endpoint Shield.lnk'; " ^
    "$s = $ws.CreateShortcut($scPath); " ^
    "$s.TargetPath = '%~dp0start_client.bat'; " ^
    "$s.WorkingDirectory = '%~dp0'; " ^
    "$s.Description = 'CYBER PULSE Endpoint Cyber Defense Shield'; " ^
    "$s.Save(); " ^
    "Write-Host '      Desktop shortcut created successfully.'"

echo.
echo ======================================================================
echo  Installation Complete! Launching CYBER PULSE Endpoint Shield...
echo ======================================================================
timeout /t 2 >nul
start "" "%~dp0start_client.bat"
exit /b 0

@echo off
title CYBER PULSE Desktop App Shortcut Creator
cd /d "%~dp0"

echo ======================================================================
echo           CYBER PULSE DESKTOP APP SHORTCUT CREATOR
echo ======================================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ws = New-Object -ComObject WScript.Shell; " ^
    "$desk = [Environment]::GetFolderPath('Desktop'); " ^
    "$s1 = $ws.CreateShortcut((Join-Path $desk 'CYBER PULSE SOC Master.lnk')); " ^
    "$s1.TargetPath = (Join-Path '%~dp0' 'launch_server_webapp.bat'); " ^
    "$s1.WorkingDirectory = '%~dp0'; " ^
    "$s1.IconLocation = (Join-Path '%~dp0' 'cyberpulse_server.ico'); " ^
    "$s1.Description = 'CYBER PULSE Central SOC Master Platform'; " ^
    "$s1.Save(); " ^
    "$s2 = $ws.CreateShortcut((Join-Path $desk 'CYBER PULSE Client Shield.lnk')); " ^
    "$s2.TargetPath = (Join-Path '%~dp0client_enclave' 'start_client.bat'); " ^
    "$s2.WorkingDirectory = (Join-Path '%~dp0' 'client_enclave'); " ^
    "$s2.IconLocation = (Join-Path '%~dp0client_enclave' 'cyberpulse_client.ico'); " ^
    "$s2.Description = 'CYBER PULSE Endpoint Client Enclave HUD'; " ^
    "$s2.Save(); " ^
    "Write-Host '[SUCCESS] Desktop shortcuts created successfully!' -ForegroundColor Green; " ^
    "Write-Host '  1. CYBER PULSE SOC Master (Server App)' -ForegroundColor Cyan; " ^
    "Write-Host '  2. CYBER PULSE Client Shield (Client HUD App)' -ForegroundColor Cyan"

echo.
pause

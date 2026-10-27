$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path $DesktopPath "CYBER PULSE SOC Master.lnk"
$WorkDir = "c:\Users\kashm\Desktop\CYBER_PULSE"

$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "wscript.exe"
$Shortcut.Arguments = "`"$WorkDir\launch_server_silent.vbs`""
$Shortcut.WorkingDirectory = $WorkDir
$Shortcut.IconLocation = "$WorkDir\cyberpulse_server.ico,0"
$Shortcut.Description = "CYBER PULSE Central SOC Master Platform"
$Shortcut.Save()

Write-Host "Desktop shortcut updated with silent background launcher: $ShortcutPath"

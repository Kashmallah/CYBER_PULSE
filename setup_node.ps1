$ErrorActionPreference = "Stop"
$WorkDir = "c:\Users\kashm\Desktop\CYBER_PULSE"
$NodeZip = Join-Path $WorkDir "node.zip"
$NodeExtract = Join-Path $WorkDir "node_portable"

# 1. Download portable Node.js if not already present
if (-not (Test-Path $NodeExtract)) {
    Write-Host "Downloading Node.js portable..."
    $Url = "https://nodejs.org/dist/v20.11.1/node-v20.11.1-win-x64.zip"
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $Url -OutFile $NodeZip -UseBasicParsing
    
    Write-Host "Extracting Node.js..."
    Expand-Archive -Path $NodeZip -DestinationPath $NodeExtract -Force
    Remove-Item $NodeZip -Force
    Write-Host "Node.js extracted successfully."
}

# 2. Add to PATH
$NodeBin = Get-ChildItem -Path $NodeExtract -Directory -Filter "node-*" | Select-Object -First 1 -ExpandProperty FullName
if ($NodeBin) {
    $env:PATH = "$NodeBin;$env:PATH"
    Write-Host "Node configured at $NodeBin"
    & "$NodeBin\node.exe" -v
    & "$NodeBin\npm.cmd" -v
}

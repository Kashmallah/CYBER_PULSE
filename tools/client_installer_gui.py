import os
import sys
import subprocess
import urllib.request
import zipfile
import threading
import tkinter as tk
from tkinter import ttk, messagebox

# Default Configuration
DEFAULT_SERVER_IP = "192.168.10.3"
DEFAULT_INSTALL_DIR = os.path.join(os.environ.get("ProgramData", "C:\\ProgramData"), "CyberPulse")
ZIP_URL = f"http://{DEFAULT_SERVER_IP}:8000/download/client_enclave.zip"

class CyberPulseInstallerGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("CYBER PULSE - Client Node Automated Installer")
        self.root.geometry("620x460")
        self.root.resizable(False, False)
        self.root.configure(bg="#0a0d14")

        # Styling
        style = ttk.Style()
        style.theme_use('clam')
        style.configure("TProgressbar", thickness=16, troughcolor="#111827", background="#06b6d4")

        # Header Title
        title_frame = tk.Frame(root, bg="#0a0d14")
        title_frame.pack(fill="x", padx=24, pady=(20, 10))

        tk.Label(title_frame, text="CYBER PULSE ENDPOINT ENCLAVE", font=("Segoe UI", 16, "bold"), fg="#38bdf8", bg="#0a0d14").pack(anchor="w")
        tk.Label(title_frame, text="Automated Enterprise Client Node Deployment & Shield Configuration", font=("Segoe UI", 9), fg="#94a3b8", bg="#0a0d14").pack(anchor="w")

        # Divider
        tk.Frame(root, bg="#1e293b", height=1).pack(fill="x", padx=24, pady=10)

        # Form Fields
        form_frame = tk.Frame(root, bg="#0a0d14")
        form_frame.pack(fill="x", padx=24, pady=10)

        # Server IP
        tk.Label(form_frame, text="Central SOC Master Server IP / Host:", font=("Segoe UI", 9, "bold"), fg="#e2e8f0", bg="#0a0d14").grid(row=0, column=0, sticky="w", pady=4)
        self.server_ip_var = tk.StringVar(value=DEFAULT_SERVER_IP)
        self.server_ip_entry = tk.Entry(form_frame, textvariable=self.server_ip_var, font=("Consolas", 10), bg="#1e293b", fg="#38bdf8", insertbackground="white", relief="flat")
        self.server_ip_entry.grid(row=0, column=1, sticky="ew", padx=(10, 0), pady=4)

        # Installation Directory
        tk.Label(form_frame, text="Target Installation Directory:", font=("Segoe UI", 9, "bold"), fg="#e2e8f0", bg="#0a0d14").grid(row=1, column=0, sticky="w", pady=4)
        self.install_dir_var = tk.StringVar(value=DEFAULT_INSTALL_DIR)
        self.install_dir_entry = tk.Entry(form_frame, textvariable=self.install_dir_var, font=("Consolas", 9), bg="#1e293b", fg="#e2e8f0", insertbackground="white", relief="flat")
        self.install_dir_entry.grid(row=1, column=1, sticky="ew", padx=(10, 0), pady=4)

        # Client Node Identifier
        hostname = os.environ.get("COMPUTERNAME", "win-node-01")
        tk.Label(form_frame, text="Client Node Identifier:", font=("Segoe UI", 9, "bold"), fg="#e2e8f0", bg="#0a0d14").grid(row=2, column=0, sticky="w", pady=4)
        self.client_id_var = tk.StringVar(value=f"win-{hostname}")
        self.client_id_entry = tk.Entry(form_frame, textvariable=self.client_id_var, font=("Consolas", 10), bg="#1e293b", fg="#c084fc", insertbackground="white", relief="flat")
        self.client_id_entry.grid(row=2, column=1, sticky="ew", padx=(10, 0), pady=4)

        form_frame.columnconfigure(1, weight=1)

        # Status & Progress Area
        status_frame = tk.Frame(root, bg="#0a0d14")
        status_frame.pack(fill="x", padx=24, pady=15)

        self.status_label = tk.Label(status_frame, text="Ready to deploy. Click 'Start Automated Installation' below.", font=("Segoe UI", 9), fg="#38bdf8", bg="#0a0d14")
        self.status_label.pack(anchor="w", pady=(0, 6))

        self.progress_bar = ttk.Progressbar(status_frame, style="TProgressbar", mode="determinate")
        self.progress_bar.pack(fill="x")

        # Action Buttons
        btn_frame = tk.Frame(root, bg="#0a0d14")
        btn_frame.pack(fill="x", padx=24, pady=20)

        self.install_btn = tk.Button(
            btn_frame,
            text="START AUTOMATED INSTALLATION",
            font=("Segoe UI", 10, "bold"),
            bg="#0284c7",
            fg="white",
            activebackground="#0369a1",
            activeforeground="white",
            relief="flat",
            padx=20,
            pady=8,
            cursor="hand2",
            command=self.start_installation_thread
        )
        self.install_btn.pack(side="right")

    def update_status(self, text, pct=None):
        self.status_label.config(text=text)
        if pct is not None:
            self.progress_bar['value'] = pct
        self.root.update_idletasks()

    def start_installation_thread(self):
        self.install_btn.config(state="disabled")
        t = threading.Thread(target=self.run_installation, daemon=True)
        t.start()

    def run_installation(self):
        try:
            server_ip = self.server_ip_var.get().strip() or DEFAULT_SERVER_IP
            target_dir = self.install_dir_var.get().strip() or DEFAULT_INSTALL_DIR
            client_id = self.client_id_var.get().strip() or f"win-{os.environ.get('COMPUTERNAME', 'client')}"
            zip_url = f"http://{server_ip}:8000/download/client_enclave.zip"

            os.makedirs(target_dir, exist_ok=True)

            # 1. Download or locate zip
            local_zip_path = os.path.join(target_dir, "client_enclave.zip")
            # If zip is already in the installer directory or current dir
            embedded_zip = os.path.join(os.path.dirname(os.path.abspath(sys.argv[0])), "client_enclave.zip")

            if os.path.exists(embedded_zip):
                self.update_status("Loading local client package...", 20)
                zip_source = embedded_zip
            else:
                self.update_status(f"Downloading client package from SOC Master ({server_ip})...", 10)
                try:
                    urllib.request.urlretrieve(zip_url, local_zip_path)
                    zip_source = local_zip_path
                except Exception as e:
                    raise Exception(f"Failed to download package from {zip_url}. Ensure Central SOC Server is running at {server_ip}:8000. Error: {e}")

            # 2. Extract Archive
            self.update_status("Extracting CYBER PULSE Enclave Core & Neural Models...", 35)
            with zipfile.ZipFile(zip_source, 'r') as zf:
                zf.extractall(target_dir)

            # 3. Verify Python Runtime
            self.update_status("Verifying Python environment on host...", 50)
            py_cmd = "python"
            try:
                subprocess.check_call(["python", "--version"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            except Exception:
                # Try winget
                self.update_status("Installing Python via Windows Package Manager...", 55)
                try:
                    subprocess.check_call(["winget", "install", "-e", "--id", "Python.Python.3.11", "--accept-package-agreements", "--accept-source-agreements"])
                except Exception:
                    pass

            # 4. Create Dedicated Virtual Environment
            venv_dir = os.path.join(target_dir, ".venv")
            venv_py = os.path.join(venv_dir, "Scripts", "python.exe")
            if not os.path.exists(venv_py):
                self.update_status("Configuring dedicated Python virtual environment (.venv)...", 65)
                subprocess.check_call([py_cmd, "-m", "venv", venv_dir], cwd=target_dir)

            # 5. Install Dependencies Silently
            self.update_status("Installing lightweight PyTorch inference runtime & telemetry modules...", 75)
            subprocess.call([venv_py, "-m", "pip", "install", "--upgrade", "pip", "--quiet"], cwd=target_dir)
            subprocess.call([venv_py, "-m", "pip", "install", "torch", "--index-url", "https://download.pytorch.org/whl/cpu", "--quiet"], cwd=target_dir)
            subprocess.call([venv_py, "-m", "pip", "install", "-r", "requirements.txt", "--quiet"], cwd=target_dir)

            # 6. Generate Silent Background Launcher Scripts
            self.update_status("Generating background daemon & native HUD launcher...", 85)

            venv_pyw = os.path.join(venv_dir, "Scripts", "pythonw.exe")
            if not os.path.exists(venv_pyw):
                venv_pyw = venv_py

            # Generate start_client_configured.bat
            configured_bat = os.path.join(target_dir, "start_client_configured.bat")
            with open(configured_bat, "w") as f:
                f.write(f'''@echo off
cd /d "{target_dir}"
set "CLIENT_ID={client_id}"
set "OS_TYPE=windows"
set "SERVER_WS=ws://{server_ip}:8000/ws/agent"

:: 0. Check for Client Updates from SOC Master (Silent 2-second fast check)
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference = 'SilentlyContinue'; try {{ $v = Invoke-RestMethod -Uri 'http://{server_ip}:8000/api/client/version' -TimeoutSec 2; if ($v -and (Test-Path 'version.json')) {{ $curr = Get-Content 'version.json' | ConvertFrom-Json; if ($curr.version -ne $v.version) {{ Write-Host '[AutoUpdate] New Client version found (' $v.version '). Downloading...'; Invoke-WebRequest -Uri $v.download_url -OutFile 'update.zip' -TimeoutSec 20; Expand-Archive -Path 'update.zip' -DestinationPath . -Force; Remove-Item 'update.zip' -Force; Set-Content -Path 'version.json' -Value (ConvertTo-Json $v); Write-Host '[AutoUpdate] Client successfully updated to version ' $v.version; }} }} elseif ($v -and !(Test-Path 'version.json')) {{ Set-Content -Path 'version.json' -Value (ConvertTo-Json $v); }} }} catch {{ }}"

:: Start sniffer daemon silently in background
start "" "{venv_pyw}" client_sniffer.py --client_id %CLIENT_ID% --os_type %OS_TYPE% --server_ws %SERVER_WS%

:: Start local web UI server silently in background
start "" "{venv_pyw}" client_server.py 5174

:: Allow local web server 1.5s to bind
ping 127.0.0.1 -n 3 >nul

:: Open Standalone Client Dashboard Web App Window (Borderless, no URL bar or tabs)
set "APP_URL=http://localhost:5174/client"

if exist "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" (
    start "" "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" --app=%APP_URL% --window-size=1360,860
    exit /b 0
)
if exist "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" (
    start "" "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" --app=%APP_URL% --window-size=1360,860
    exit /b 0
)
if exist "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" (
    start "" "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" --app=%APP_URL% --window-size=1360,860
    exit /b 0
)
if exist "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" (
    start "" "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" --app=%APP_URL% --window-size=1360,860
    exit /b 0
)
if exist "%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe" (
    start "" "%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe" --app=%APP_URL% --window-size=1360,860
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
''')

            # 7. Create Desktop Shortcut: "CYBER PULSE Client Dashboard"
            self.update_status("Adding 'CYBER PULSE Client Dashboard' icon to Desktop...", 95)
            desktop_path = os.path.join(os.environ.get("USERPROFILE", "C:\\Users\\Public"), "Desktop")
            shortcut_path = os.path.join(desktop_path, "CYBER PULSE Client Dashboard.lnk")
            icon_file = os.path.join(target_dir, "cyberpulse_client.ico")
            icon_line = f"$s.IconLocation = '{icon_file},0'; " if os.path.exists(icon_file) else ""

            ps_shortcut_cmd = (
                f"$ws = New-Object -ComObject WScript.Shell; "
                f"$s = $ws.CreateShortcut('{shortcut_path}'); "
                f"$s.TargetPath = '{configured_bat}'; "
                f"$s.WorkingDirectory = '{target_dir}'; "
                f"$s.WindowStyle = 7; "
                f"{icon_line}"
                f"$s.Description = 'CYBER PULSE Endpoint Client Enclave & HUD Dashboard'; "
                f"$s.Save()"
            )
            subprocess.call(["powershell", "-NoProfile", "-Command", ps_shortcut_cmd])

            # 8. Launch the Client Immediately
            self.update_status("Launching Client Enclave & Dashboard...", 100)
            subprocess.call(["cmd.exe", "/c", "start", "/min", configured_bat], cwd=target_dir)

            messagebox.showinfo(
                "Deployment Successful",
                f"CYBER PULSE Client Enclave installed successfully!\n\n"
                f"Node ID: {client_id}\n"
                f"Central SOC: {server_ip}:8000\n\n"
                f"The 'CYBER PULSE Client Dashboard' shortcut has been added to your Desktop."
            )
            self.root.destroy()

        except Exception as e:
            self.status_label.config(text=f"Error: {e}", fg="#f43f5e")
            self.install_btn.config(state="normal")
            messagebox.showerror("Installation Error", str(e))

def main():
    root = tk.Tk()
    app = CyberPulseInstallerGUI(root)
    root.mainloop()

if __name__ == "__main__":
    main()

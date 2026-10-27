import os
import sys
import mimetypes
from http.server import HTTPServer, SimpleHTTPRequestHandler
import webbrowser

# Headless / pythonw stdout/stderr safety fallback
if sys.stdout is None:
    sys.stdout = open(os.devnull, "w")
if sys.stderr is None:
    sys.stderr = open(os.devnull, "w")

PORT = 5174
WEB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "web")

class ClientDashboardHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WEB_DIR, **kwargs)

    def do_GET(self):
        # Resolve clean paths for SPA routing
        req_path = self.path.split('?')[0]
        local_path = os.path.join(WEB_DIR, req_path.lstrip('/'))
        
        if not os.path.exists(local_path) or os.path.isdir(local_path):
            # Fallback to index.html for Single Page App client routing
            self.path = '/index.html'
        
        return super().do_GET()

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

def run_server(port=PORT):
    if not os.path.exists(WEB_DIR):
        print(f"[Client Enclave] Error: Static web directory '{WEB_DIR}' not found.")
        sys.exit(1)
    
    server_address = ('', port)
    httpd = HTTPServer(server_address, ClientDashboardHandler)
    print("==============================================================")
    print(f"  CYBER PULSE Standalone Client Dashboard UI")
    print(f"  Local Web Enclave Server: http://localhost:{port}/client")
    print("==============================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[Client Enclave] Server stopped.")

if __name__ == "__main__":
    p = int(sys.argv[1]) if len(sys.argv) > 1 else PORT
    run_server(p)

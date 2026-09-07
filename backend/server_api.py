import asyncio
import json
import os
import re
import sqlite3
import subprocess
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any

import uvicorn
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

# Database Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(BASE_DIR, ".."))
CORE_DB_PATH = os.path.join(BASE_DIR, "cyberpulse_core.db")
METRICS_DB_PATH = os.path.join(ROOT_DIR, "fl_metrics.db")
ZERODAY_CONFIG_PATH = os.path.join(ROOT_DIR, "zeroday_config.json")

app = FastAPI(
    title="CYBER PULSE Central SOC Master Server",
    description="Production Multi-Host Cyber Defense Orchestration API",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 1. WebSocket Connection Manager
# ==========================================
class ConnectionManager:
    def __init__(self):
        self.soc_connections: List[WebSocket] = []
        self.agent_connections: Dict[str, WebSocket] = {}

    async def connect_soc(self, websocket: WebSocket):
        await websocket.accept()
        self.soc_connections.append(websocket)

    def disconnect_soc(self, websocket: WebSocket):
        if websocket in self.soc_connections:
            self.soc_connections.remove(websocket)

    async def connect_agent(self, client_id: str, websocket: WebSocket):
        await websocket.accept()
        self.agent_connections[client_id] = websocket

    def disconnect_agent(self, client_id: str):
        if client_id in self.agent_connections:
            del self.agent_connections[client_id]

    async def broadcast_soc(self, message: dict):
        for connection in list(self.soc_connections):
            try:
                await connection.send_json(message)
            except Exception:
                pass

    async def send_agent_command(self, client_id: str, command: dict):
        if client_id in self.agent_connections:
            try:
                await self.agent_connections[client_id].send_json(command)
                return True
            except Exception:
                return False
        return False

manager = ConnectionManager()

# Helper DB connection
def get_db():
    conn = sqlite3.connect(CORE_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# ==========================================
# 2. Pydantic Request Models
# ==========================================
class ServerLoginRequest(BaseModel):
    username: str
    password: str

class ClientLoginRequest(BaseModel):
    client_id: str
    passcode: str

class ServerChangePasswordRequest(BaseModel):
    username: str
    old_password: str
    new_password: str

class ClientChangePasswordRequest(BaseModel):
    client_id: str
    old_passcode: str
    new_passcode: str

class EndpointCreate(BaseModel):
    id: str
    hostname: str
    ip_address: str
    os_type: str
    passcode: Optional[str] = "client123"
    geo_lat: Optional[float] = 0.0
    geo_lng: Optional[float] = 0.0
    location_name: Optional[str] = "Unknown"

class EndpointUpdateStatus(BaseModel):
    status: str

class FLTrainRequest(BaseModel):
    model_type: str = Field(..., description="memory, network, autoencoder, or fusion")
    target_nodes: List[str] = Field(default_factory=list)
    rounds: int = 15
    epochs: int = 5
    mu: float = 0.01

class ThreatCatalogCreate(BaseModel):
    vector_key: str
    name: str
    category: str
    severity: str
    description: str
    indicators: List[str]
    playbook: str
    recommended_action: str

class IncidentReport(BaseModel):
    endpoint_id: str
    vector_key: str
    details: str
    anomaly_score: Optional[float] = 0.0
    shap_top_features: Optional[List[Dict[str, Any]]] = []

class CopilotQuery(BaseModel):
    prompt: str
    api_key: Optional[str] = None
    context_incident_id: Optional[int] = None

class ChatMessageCreate(BaseModel):
    sender_id: str
    sender_name: str
    sender_role: str
    message: str
    channel: Optional[str] = "general"

# ==========================================
# 2.5 Authentication & Password Management Routes
# ==========================================
@app.post("/api/auth/login/server")
def login_server(req: ServerLoginRequest):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE username = ? AND password = ?", (req.username, req.password))
    user = cursor.fetchone()
    conn.close()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid server admin credentials.")
    return {"status": "success", "username": user["username"], "role": user["role"]}

@app.post("/api/auth/login/client")
def login_client(req: ClientLoginRequest):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM endpoints WHERE id = ? AND passcode = ?", (req.client_id, req.passcode))
    endpoint = cursor.fetchone()
    conn.close()
    if not endpoint:
        raise HTTPException(status_code=401, detail="Invalid endpoint client credentials.")
    return {
        "status": "success",
        "client_id": endpoint["id"],
        "hostname": endpoint["hostname"],
        "role": "client"
    }

@app.post("/api/auth/change-password/server")
def change_server_password(req: ServerChangePasswordRequest):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE username = ? AND password = ?", (req.username, req.old_password))
    user = cursor.fetchone()
    if not user:
        conn.close()
        raise HTTPException(status_code=400, detail="Current admin password is incorrect.")
    
    if len(req.new_password.strip()) < 3:
        conn.close()
        raise HTTPException(status_code=400, detail="New password must be at least 3 characters long.")

    cursor.execute("UPDATE users SET password = ? WHERE username = ?", (req.new_password.strip(), req.username))
    conn.commit()
    conn.close()
    return {"status": "success", "message": "Server admin password successfully updated."}

@app.post("/api/auth/change-password/client")
def change_client_password(req: ClientChangePasswordRequest):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM endpoints WHERE id = ? AND passcode = ?", (req.client_id, req.old_passcode))
    endpoint = cursor.fetchone()
    if not endpoint:
        conn.close()
        raise HTTPException(status_code=400, detail="Current client passcode is incorrect.")
    
    if len(req.new_passcode.strip()) < 3:
        conn.close()
        raise HTTPException(status_code=400, detail="New passcode must be at least 3 characters long.")

    cursor.execute("UPDATE endpoints SET passcode = ? WHERE id = ?", (req.new_passcode.strip(), req.client_id))
    conn.commit()
    conn.close()
    return {"status": "success", "message": f"Passcode for endpoint node {req.client_id} successfully updated."}

# ==========================================
# 3. Fleet Management Routes
# ==========================================
@app.get("/api/fleet/endpoints")
def list_endpoints():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM endpoints ORDER BY created_at ASC")
    raw_rows = [dict(r) for r in cursor.fetchall()]
    conn.close()

    rows = []
    for r in raw_rows:
        ep_id = r["id"]
        # Endpoint is online ONLY if its client agent is actively connected to the server WebSocket
        if ep_id in manager.agent_connections:
            if r.get("status") != "isolated":
                r["status"] = "online"
        else:
            if r.get("status") != "isolated":
                r["status"] = "offline"
            r["cpu_usage"] = 0.0
            r["memory_usage"] = 0.0
            r["network_load"] = 0.0
        rows.append(r)

    return {"status": "success", "endpoints": rows}

@app.post("/api/fleet/endpoints")
async def add_endpoint(ep: EndpointCreate):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO endpoints (id, hostname, ip_address, os_type, passcode, geo_lat, geo_lng, location_name)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (ep.id, ep.hostname, ep.ip_address, ep.os_type, ep.passcode or "client123", ep.geo_lat, ep.geo_lng, ep.location_name))
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(status_code=400, detail="Endpoint with this ID already exists.")
    conn.close()

    await manager.broadcast_soc({
        "event": "endpoint_added",
        "endpoint": ep.dict()
    })
    return {"status": "success", "message": f"Endpoint {ep.hostname} added."}

@app.post("/api/fleet/endpoints/isolate/{endpoint_id}")
async def isolate_endpoint(endpoint_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE endpoints SET status = 'isolated' WHERE id = ?", (endpoint_id,))
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Endpoint not found")
    conn.commit()
    conn.close()

    # Send command to agent over WebSocket
    sent = await manager.send_agent_command(endpoint_id, {"action": "quarantine", "status": "isolated"})

    await manager.broadcast_soc({
        "event": "endpoint_isolated",
        "endpoint_id": endpoint_id,
        "agent_notified": sent
    })
    return {"status": "success", "message": f"Endpoint {endpoint_id} placed in network quarantine.", "agent_notified": sent}

@app.post("/api/fleet/endpoints/reconnect/{endpoint_id}")
async def reconnect_endpoint(endpoint_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE endpoints SET status = 'online' WHERE id = ?", (endpoint_id,))
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Endpoint not found")
    conn.commit()
    conn.close()

    sent = await manager.send_agent_command(endpoint_id, {"action": "unquarantine", "status": "online"})

    await manager.broadcast_soc({
        "event": "endpoint_reconnected",
        "endpoint_id": endpoint_id,
        "agent_notified": sent
    })
    return {"status": "success", "message": f"Endpoint {endpoint_id} restored to online network status.", "agent_notified": sent}

@app.post("/api/fleet/endpoints/shutdown/{endpoint_id}")
async def shutdown_endpoint(endpoint_id: str):
    sent = await manager.send_agent_command(endpoint_id, {"action": "shutdown"})
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE endpoints SET status = 'offline' WHERE id = ?", (endpoint_id,))
    conn.commit()
    conn.close()

    await manager.broadcast_soc({
        "event": "endpoint_shutdown",
        "endpoint_id": endpoint_id
    })
    return {"status": "success", "message": f"Shutdown signal dispatched to {endpoint_id}.", "agent_notified": sent}

@app.delete("/api/fleet/endpoints/{endpoint_id}")
async def delete_endpoint(endpoint_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM endpoints WHERE id = ?", (endpoint_id,))
    conn.commit()
    conn.close()

    await manager.broadcast_soc({
        "event": "endpoint_deleted",
        "endpoint_id": endpoint_id
    })
    return {"status": "success", "message": f"Endpoint {endpoint_id} removed."}

# ==========================================
# 4. Federated Learning Orchestration & Dynamic Benchmarks
# ==========================================
active_fl_process = None

@app.get("/api/fl/benchmarks")
def get_fl_benchmarks():
    """
    Dynamically queries model accuracies, F1-scores, and ROC-AUC from fl_metrics.db,
    and anomaly threshold theta from zeroday_config.json.
    """
    benchmarks = {
        "memory": {"accuracy": 0.0, "f1_weighted": 0.0, "roc_auc": 0.0, "round": 0},
        "network": {"accuracy": 0.0, "f1_weighted": 0.0, "roc_auc": 0.0, "round": 0},
        "zeroday": {"anomaly_threshold": 0.00264, "mean_mse": 0.00031, "std_mse": 0.00155},
        "history": []
    }

    # 1. Query fl_metrics.db
    if os.path.exists(METRICS_DB_PATH):
        try:
            m_conn = sqlite3.connect(METRICS_DB_PATH)
            m_conn.row_factory = sqlite3.Row
            m_cur = m_conn.cursor()
            
            # Best memory model
            m_cur.execute("SELECT round, accuracy, f1_weighted, roc_auc, loss FROM round_metrics WHERE model_type='memory' ORDER BY accuracy DESC LIMIT 1")
            mem_row = m_cur.fetchone()
            if mem_row:
                benchmarks["memory"] = dict(mem_row)

            # Best network model
            m_cur.execute("SELECT round, accuracy, f1_weighted, roc_auc, loss FROM round_metrics WHERE model_type='network' ORDER BY accuracy DESC LIMIT 1")
            net_row = m_cur.fetchone()
            if net_row:
                benchmarks["network"] = dict(net_row)

            # Full History for charts
            m_cur.execute("SELECT id, round, model_type, accuracy, f1_weighted, roc_auc, loss, timestamp FROM round_metrics ORDER BY id ASC")
            benchmarks["history"] = [dict(r) for r in m_cur.fetchall()]
            m_conn.close()
        except Exception as e:
            print(f"Error querying fl_metrics.db: {e}")

    # 2. Read zeroday_config.json
    if os.path.exists(ZERODAY_CONFIG_PATH):
        try:
            with open(ZERODAY_CONFIG_PATH, "r") as f:
                zd_data = json.load(f)
                benchmarks["zeroday"]["anomaly_threshold"] = zd_data.get("anomaly_threshold", 0.00264)
                benchmarks["zeroday"]["mean_mse"] = zd_data.get("mean_mse", 0.00031)
                benchmarks["zeroday"]["std_mse"] = zd_data.get("std_mse", 0.00155)
        except Exception as e:
            print(f"Error reading zeroday_config.json: {e}")

    return {"status": "success", "benchmarks": benchmarks}

@app.post("/api/fl/train")
async def trigger_fl_training(req: FLTrainRequest, background_tasks: BackgroundTasks):
    global active_fl_process
    
    session_id = f"fl-{req.model_type}-{int(datetime.utcnow().timestamp())}"
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO fl_sessions (session_id, model_type, target_cluster, epochs, mu, status, total_rounds)
        VALUES (?, ?, ?, ?, ?, 'training', ?)
    """, (session_id, req.model_type, ",".join(req.target_nodes) if req.target_nodes else "all", req.epochs, req.mu, req.rounds))
    conn.commit()
    conn.close()

    async def run_training_task():
        global active_fl_process
        try:
            # We invoke server.py with the selected configuration
            cmd = [
                "python", "server.py",
                "--model", "memory" if req.model_type in ["memory", "fusion"] else "network",
                "--rounds", str(req.rounds),
                "--mu", str(req.mu)
            ]
            print(f"Executing FL Server command: {' '.join(cmd)}")
            active_fl_process = subprocess.Popen(cmd, cwd=ROOT_DIR)
            
            # Broadcast to SOC that training has started
            await manager.broadcast_soc({
                "event": "fl_training_started",
                "session_id": session_id,
                "model_type": req.model_type,
                "rounds": req.rounds,
                "mu": req.mu
            })
        except Exception as e:
            print(f"FL launch error: {e}")

    background_tasks.add_task(run_training_task)
    return {"status": "success", "session_id": session_id, "message": f"FL session {session_id} dispatched."}

# ==========================================
# 5. Dynamic Threat Catalog & 15-Day Forensic Incident Logs
# ==========================================
@app.get("/api/threats/catalog")
def get_threat_catalog():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM threat_catalog ORDER BY severity DESC")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return {"status": "success", "catalog": rows}

@app.post("/api/threats/catalog")
def add_threat_catalog(item: ThreatCatalogCreate):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO threat_catalog (vector_key, name, category, severity, description, indicators, playbook, recommended_action)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (item.vector_key, item.name, item.category, item.severity, item.description, json.dumps(item.indicators), item.playbook, item.recommended_action))
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(status_code=400, detail="Threat vector_key already exists.")
    conn.close()
    return {"status": "success", "message": f"Threat {item.name} cataloged."}

@app.get("/api/incidents/logs")
def get_incident_logs(limit: int = 100):
    """Retrieves rolling 15-day incident logs (pruning older logs automatically)."""
    conn = get_db()
    cursor = conn.cursor()
    
    # 15-day rolling retention filter
    cutoff_date = (datetime.utcnow() - timedelta(days=15)).strftime('%Y-%m-%d %H:%M:%S')
    cursor.execute("DELETE FROM incident_logs WHERE timestamp < ?", (cutoff_date,))
    conn.commit()

    cursor.execute("""
        SELECT i.*, e.hostname, e.ip_address, e.os_type, e.location_name, e.geo_lat, e.geo_lng,
               t.playbook, t.recommended_action, t.description as threat_desc
        FROM incident_logs i
        LEFT JOIN endpoints e ON i.endpoint_id = e.id
        LEFT JOIN threat_catalog t ON i.vector_key = t.vector_key
        ORDER BY i.timestamp DESC
        LIMIT ?
    """, (limit,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return {"status": "success", "incident_logs": rows}

@app.post("/api/incidents/report")
async def report_incident(report: IncidentReport):
    conn = get_db()
    cursor = conn.cursor()

    # Dynamic lookup against threat catalog
    cursor.execute("SELECT * FROM threat_catalog WHERE vector_key = ?", (report.vector_key,))
    threat = cursor.fetchone()

    if not threat:
        attack_name = f"Unknown Vector: {report.vector_key}"
        severity = "High"
    else:
        attack_name = threat["name"]
        severity = threat["severity"]

    cursor.execute("""
        INSERT INTO incident_logs (
            endpoint_id, vector_key, attack_name, severity, details, anomaly_score, shap_top_features
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        report.endpoint_id, report.vector_key, attack_name, severity,
        report.details, report.anomaly_score, json.dumps(report.shap_top_features)
    ))
    incident_id = cursor.lastrowid
    conn.commit()
    conn.close()

    alert_payload = {
        "event": "new_incident_alert",
        "incident_id": incident_id,
        "endpoint_id": report.endpoint_id,
        "attack_name": attack_name,
        "severity": severity,
        "details": report.details,
        "anomaly_score": report.anomaly_score,
        "timestamp": datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
    }

    await manager.broadcast_soc(alert_payload)
    return {"status": "success", "incident_id": incident_id, "attack_name": attack_name, "severity": severity}

@app.post("/api/incidents/{incident_id}/execute-playbook")
async def execute_playbook(incident_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT i.*, t.playbook, t.recommended_action 
        FROM incident_logs i 
        JOIN threat_catalog t ON i.vector_key = t.vector_key
        WHERE i.id = ?
    """, (incident_id,))
    incident = cursor.fetchone()
    if not incident:
        conn.close()
        raise HTTPException(status_code=404, detail="Incident not found")

    action = incident["recommended_action"]
    ep_id = incident["endpoint_id"]
    playbook_text = incident["playbook"]

    # Mark resolved
    cursor.execute("UPDATE incident_logs SET resolved = 1, playbook_executed = ? WHERE id = ?", (playbook_text, incident_id))
    conn.commit()
    conn.close()

    # If action is isolate, perform quarantine
    if action == "isolate":
        await isolate_endpoint(ep_id)

    await manager.broadcast_soc({
        "event": "incident_resolved",
        "incident_id": incident_id,
        "endpoint_id": ep_id,
        "action_taken": action
    })

    return {"status": "success", "message": f"Playbook executed for incident #{incident_id}. Endpoint action: {action}"}

@app.delete("/api/incidents/clear")
async def clear_all_incidents():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM incident_logs")
    conn.commit()
    conn.close()

    await manager.broadcast_soc({
        "event": "incidents_cleared"
    })
    return {"status": "success", "message": "All forensic incident logs purged successfully."}

# ==========================================
# 6. Secure AI SecOps Copilot with Input Guardrails
# ==========================================
PROMPT_INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior)\s+instructions",
    r"system\s+prompt",
    r"you\s+are\s+now\s+in\s+dan\s+mode",
    r"jailbreak",
    r"bypass\s+security",
    r"show\s+me\s+your\s+rules",
    r"drop\s+database",
    r"select\s+\*\s+from\s+passwords"
]

CREDENTIAL_LEAK_PATTERNS = [
    r"(?i)api[_-]?key\s*[:=]\s*['\"][A-Za-z0-9_\-]{20,}['\"]",
    r"(?i)password\s*[:=]\s*['\"][^'\"]+['\"]",
    r"(?i)private[_-]?key",
    r"BEGIN\s+(RSA|OPENSSH|EC)\s+PRIVATE\s+KEY"
]

def sanitize_input(text: str) -> str:
    # Strip dangerous HTML/script tags
    clean = re.sub(r'<script.*?>.*?</script>', '', text, flags=re.DOTALL | re.IGNORECASE)
    clean = re.sub(r'<.*?>', '', clean)
    return clean.strip()

def check_guardrails(prompt: str):
    # 1. Prompt Injection Check
    for pattern in PROMPT_INJECTION_PATTERNS:
        if re.search(pattern, prompt, re.IGNORECASE):
            raise HTTPException(
                status_code=400,
                detail="[SECURITY GUARDRAIL TRIGGERED] Query contains prohibited prompt injection or instruction override patterns."
            )

    # 2. Infrastructure / Credential Leak Check
    for pattern in CREDENTIAL_LEAK_PATTERNS:
        if re.search(pattern, prompt):
            raise HTTPException(
                status_code=400,
                detail="[SECURITY GUARDRAIL TRIGGERED] Query contains potential credentials, private keys, or API tokens. Sanitization rejected query."
            )

@app.post("/api/copilot/query")
async def query_copilot(req: CopilotQuery):
    sanitized_prompt = sanitize_input(req.prompt)
    if not sanitized_prompt:
        raise HTTPException(status_code=400, detail="Empty prompt provided.")

    check_guardrails(sanitized_prompt)

    # Gather forensic context from 15-day logs & threat catalog
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT i.attack_name, i.severity, i.details, e.hostname, e.ip_address, t.playbook
        FROM incident_logs i
        LEFT JOIN endpoints e ON i.endpoint_id = e.id
        LEFT JOIN threat_catalog t ON i.vector_key = t.vector_key
        ORDER BY i.timestamp DESC LIMIT 5
    """)
    recent_incidents = [dict(r) for r in cursor.fetchall()]
    conn.close()

    context_str = "\n".join([
        f"- Host: {inc['hostname']} ({inc['ip_address']}) | Threat: {inc['attack_name']} | Severity: {inc['severity']} | Details: {inc['details']}"
        for inc in recent_incidents
    ])

    system_instruction = (
        "You are the CYBER PULSE Autonomous SecOps AI Copilot. "
        "Your mission is to provide accurate forensic triage, root-cause analysis, and specific remediation playbooks. "
        "Strictly adhere to defense-in-depth principles. Never leak private keys, infrastructure credentials, or internal configs. "
        "FORMATTING RULES:\n"
        "1. Do NOT use emojis anywhere in the response.\n"
        "2. Structure sections using clean markdown headings (## Section, ### Subsection).\n"
        "3. Format hunting queries and remediation commands in fenced code blocks (```kusto, ```powershell, ```bash).\n"
        "4. Keep explanations objective, direct, and enterprise professional.\n"
        f"\nCURRENT RECENT FLEET INCIDENTS (Last 15 Days):\n{context_str or 'No active severe alerts.'}"
    )

    # 1. Check persistent Gemini API Key from DB or request
    DEFAULT_GEMINI_KEY = "AQ.Ab8RN6JjKGAcG1JylvVVkSwI-1TVZ5Fr3dOes7XfJTOVnlhGZQ"
    api_key = req.api_key

    if not api_key:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT config_value FROM system_config WHERE config_key = 'gemini_api_key'")
        row = cursor.fetchone()
        conn.close()
        if row and row["config_value"]:
            api_key = row["config_value"]

    if not api_key:
        api_key = os.getenv("GEMINI_API_KEY") or DEFAULT_GEMINI_KEY

    # Auto-persist key to database if new key provided
    if req.api_key and req.api_key != DEFAULT_GEMINI_KEY:
        try:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO system_config (config_key, config_value, updated_at)
                VALUES ('gemini_api_key', ?, CURRENT_TIMESTAMP)
                ON CONFLICT(config_key) DO UPDATE SET config_value = excluded.config_value, updated_at = CURRENT_TIMESTAMP
            """, (req.api_key,))
            conn.commit()
            conn.close()
        except Exception:
            pass

    if api_key:
        import urllib.request
        # Supported models in priority order for current Google AI / Antigravity key
        candidate_models = [
            "gemma-4-26b-a4b-it",
            "gemini-3.5-flash",
            "gemini-3-flash-preview",
            "gemini-flash-latest",
            "gemini-1.5-flash"
        ]

        last_error = None
        for model in candidate_models:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
                prompt_text = (
                    f"{system_instruction}\n\n"
                    f"User Incident Query: {sanitized_prompt}\n\n"
                    "INSTRUCTION: Provide a direct, professional, and structured technical response. "
                    "Do NOT output thinking drafts or meta notes. Use clean section headers without '###' symbols."
                )
                payload = {
                    "contents": [
                        {"role": "user", "parts": [{"text": prompt_text}]}
                    ]
                }
                req_data = json.dumps(payload).encode("utf-8")
                http_req = urllib.request.Request(url, data=req_data, headers={"Content-Type": "application/json"})
                with urllib.request.urlopen(http_req, timeout=20) as response:
                    res_body = json.loads(response.read().decode("utf-8"))
                    raw_text = res_body["candidates"][0]["content"]["parts"][0]["text"]
                    
                    # Clean up draft/thinking tokens if present
                    if "*   Final Version Selection:*" in raw_text:
                        raw_text = raw_text.split("*   Final Version Selection:*")[-1].strip()

                    # Clean any unwanted raw '###' header markers
                    clean_reply = re.sub(r'(?m)^#{1,6}\s*', '', raw_text).strip()

                    return {
                        "status": "success",
                        "response": clean_reply,
                        "model": model,
                        "guardrails_passed": True
                    }
            except Exception as e:
                last_error = e
                continue

        if last_error:
            raise HTTPException(
                status_code=400,
                detail=f"Gemini API Error: {str(last_error)}. Please verify your API Key."
            )

    # High-grade fallback SecOps knowledge resolver
    p_lower = sanitized_prompt.lower()
    if "socgholish" in p_lower or "fakeupdate" in p_lower:
        advice = (
            "### [ANALYSIS: SocGholish Infiltration]\n"
            "**Threat Mechanism:** Malicious JavaScript delivered via compromised CMS assets masquerading as browser updates.\n\n"
            "**Recommended Action Items:**\n"
            "1. **Isolate Endpoint:** Execute network quarantine immediately via Fleet Management.\n"
            "2. **Process Termination:** Kill active `wscript.exe` and PowerShell scripts spawning from `%TEMP%`.\n"
            "3. **Persistence Removal:** Clean scheduled tasks invoking `wscript.exe //b //e:VBScript`.\n"
            "4. **Egress Block:** Add C2 IP/Domains to boundary DNS firewall blackhole."
        )
    elif "ransomware" in p_lower or "blackcat" in p_lower:
        advice = (
            "### [CRITICAL ALERT: Ransomware Defense Protocol]\n"
            "**Threat Mechanism:** High-entropy encryption routines targeting user document trees with shadow copy purge.\n\n"
            "**Emergency Response:**\n"
            "1. **Instant Network Sever:** Put host in Isolation mode immediately to halt lateral propagation.\n"
            "2. **Memory Preservation:** Dump RAM image before rebooting to preserve cryptographic keys in volatile memory.\n"
            "3. **Block vssadmin Execution:** Deny execution permissions for shadow copy deletion tools."
        )
    elif "ddos" in p_lower or "syn flood" in p_lower:
        advice = (
            "### [ANALYSIS: Volumetric Network Flooding]\n"
            "**Threat Mechanism:** High-rate TCP SYN flood designed to exhaust host socket connection state table.\n\n"
            "**Mitigation:**\n"
            "1. **Kernel SYN Cookies:** Enable `net.ipv4.tcp_syncookies = 1`.\n"
            "2. **Rate Limiting:** Enforce boundary iptables `hashlimit` or Windows Advanced Firewall rule.\n"
            "3. **Scrubber Routing:** Transition BGP routes to upstream DDoS mitigation gateway."
        )
    elif "zero-day" in p_lower or "anomaly" in p_lower:
        advice = (
            "### [ANALYSIS: Unsupervised Autoencoder Anomaly Detection]\n"
            "**Threat Mechanism:** Reconstruction MSE exceeded calibrated threshold theta ($0.00264$), indicating unprecedented packet header distributions.\n\n"
            "**Playbook Steps:**\n"
            "1. Inspect real-time SHAP feature attribution in Client HUD to isolate anomalous flow attributes.\n"
            "2. Retain PCAP capture for deep packet inspection (DPI).\n"
            "3. Update threat catalog signature table once reversing is complete."
        )
    else:
        advice = (
            f"### [CYBER PULSE AI SecOps Triage]\n"
            f"**Query Evaluated:** \"{sanitized_prompt}\"\n\n"
            "**Status:** Security guardrails validated query integrity. No active prompt injection or credential leak detected.\n\n"
            "**Forensic Context:** All active hosts (Windows 10, Kali Linux, Ubuntu) are monitored under the federated FedProx model."
        )

    return {
        "status": "success",
        "response": advice,
        "model": "cyberpulse-secops-engine",
        "guardrails_passed": True
    }

# ==========================================
# 6.5 Global Settings & Gemini Key Persistence
# ==========================================
class GeminiKeyUpdate(BaseModel):
    api_key: str

@app.get("/api/settings/gemini-key")
def get_gemini_key():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT config_value FROM system_config WHERE config_key = 'gemini_api_key'")
    row = cursor.fetchone()
    conn.close()
    
    key = row["config_value"] if row else ""
    return {
        "status": "success",
        "has_key": bool(key),
        "api_key": key
    }

@app.post("/api/settings/gemini-key")
def set_gemini_key(req: GeminiKeyUpdate):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO system_config (config_key, config_value, updated_at)
        VALUES ('gemini_api_key', ?, CURRENT_TIMESTAMP)
        ON CONFLICT(config_key) DO UPDATE SET config_value = excluded.config_value, updated_at = CURRENT_TIMESTAMP
    """, (req.api_key.strip(),))
    conn.commit()
    conn.close()
    return {"status": "success", "message": "Gemini API key permanently saved to system database."}

# ==========================================
# 7. Inter-Host Chat Hub
# ==========================================
@app.get("/api/chat/messages")
def get_chat_messages(channel: str = "general", limit: int = 50):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM chat_messages 
        WHERE channel = ? 
        ORDER BY timestamp ASC 
        LIMIT ?
    """, (channel, limit))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return {"status": "success", "messages": rows}

@app.post("/api/chat/messages")
async def post_chat_message(msg: ChatMessageCreate):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO chat_messages (sender_id, sender_name, sender_role, message, channel)
        VALUES (?, ?, ?, ?, ?)
    """, (msg.sender_id, msg.sender_name, msg.sender_role, msg.message, msg.channel))
    msg_id = cursor.lastrowid
    conn.commit()
    conn.close()

    chat_payload = {
        "event": "new_chat_message",
        "id": msg_id,
        "sender_id": msg.sender_id,
        "sender_name": msg.sender_name,
        "sender_role": msg.sender_role,
        "message": msg.message,
        "channel": msg.channel,
        "timestamp": datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
    }
    await manager.broadcast_soc(chat_payload)
    return {"status": "success", "message_id": msg_id}

# ==========================================
# 8. WebSockets Endpoint
# ==========================================
@app.websocket("/ws/soc")
async def websocket_soc(websocket: WebSocket):
    await manager.connect_soc(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle client heartbeat or commands
            pass
    except WebSocketDisconnect:
        manager.disconnect_soc(websocket)

@app.websocket("/ws/agent/{client_id}")
async def websocket_agent(websocket: WebSocket, client_id: str):
    await manager.connect_agent(client_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            
            # Telemetry Stream
            if msg.get("type") == "telemetry":
                cpu = msg.get("cpu", 0.0)
                mem = msg.get("memory", 0.0)
                net = msg.get("network", 0.0)
                
                # Update Endpoint stats in SQLite
                conn = get_db()
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE endpoints 
                    SET cpu_usage = ?, memory_usage = ?, network_load = ?, last_seen = CURRENT_TIMESTAMP
                    WHERE id = ?
                """, (cpu, mem, net, client_id))
                conn.commit()
                conn.close()

                # Broadcast to SOC dashboard
                await manager.broadcast_soc({
                    "event": "endpoint_telemetry",
                    "client_id": client_id,
                    "cpu": cpu,
                    "memory": mem,
                    "network": net
                })

            # Real-time Threat Alert from local client forward pass
            elif msg.get("type") == "threat_alert":
                report = IncidentReport(
                    endpoint_id=client_id,
                    vector_key=msg.get("vector_key", "custom_signature"),
                    details=msg.get("details", "Threat identified by local PyTorch engine"),
                    anomaly_score=msg.get("anomaly_score", 0.0),
                    shap_top_features=msg.get("shap_top_features", [])
                )
                await report_incident(report)

    except WebSocketDisconnect:
        manager.disconnect_agent(client_id)

# ==========================================
# 9. Static Frontend Serving & Root Fallback
# ==========================================
FRONTEND_DIST = os.path.join(ROOT_DIR, "desktop", "frontend", "dist")
if os.path.exists(os.path.join(FRONTEND_DIST, "assets")):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")

@app.get("/")
def read_root():
    index_file = os.path.join(FRONTEND_DIST, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {
        "status": "online",
        "service": "CYBER PULSE Central SOC Master API Server",
        "version": "2.0.0",
        "dashboard_ui": "http://localhost:5173",
        "api_docs": "http://localhost:8000/docs",
        "endpoints": {
            "fleet": "/api/fleet/endpoints",
            "threats": "/api/threats/catalog",
            "incidents": "/api/incidents/logs",
            "benchmarks": "/api/fl/benchmarks",
            "chat": "/api/chat/messages",
            "soc_websocket": "/ws/soc",
            "agent_websocket": "/ws/agent/{client_id}"
        }
    }

@app.get("/{full_path:path}")
def catch_all_routes(full_path: str):
    if full_path.startswith("api") or full_path.startswith("ws") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
        raise HTTPException(status_code=404, detail=f"API route /{full_path} not found")
    index_file = os.path.join(FRONTEND_DIST, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {
        "status": "online",
        "service": "CYBER PULSE Central SOC Master API Server",
        "message": f"Route /{full_path} not found. Access dashboard UI at http://localhost:5173",
        "dashboard_ui": "http://localhost:5173"
    }

if __name__ == "__main__":
    uvicorn.run("server_api:app", host="0.0.0.0", port=8000, reload=False)

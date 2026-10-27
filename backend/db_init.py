import sqlite3
import os
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(__file__), "cyberpulse_core.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. Endpoints Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS endpoints (
        id TEXT PRIMARY KEY,
        hostname TEXT NOT NULL,
        ip_address TEXT NOT NULL,
        os_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'online', -- online, offline, isolated
        passcode TEXT NOT NULL DEFAULT 'client123',
        cpu_usage REAL DEFAULT 0.0,
        memory_usage REAL DEFAULT 0.0,
        network_load REAL DEFAULT 0.0,
        geo_lat REAL DEFAULT 0.0,
        geo_lng REAL DEFAULT 0.0,
        location_name TEXT DEFAULT 'Unknown',
        last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Attempt to add passcode column dynamically in case endpoints table already exists
    try:
        cursor.execute("ALTER TABLE endpoints ADD COLUMN passcode TEXT NOT NULL DEFAULT 'client123'")
    except sqlite3.OperationalError:
        pass

    # 2. Dynamic Threat Catalog Table (Zero hardcoded detection strings)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS threat_catalog (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vector_key TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        category TEXT NOT NULL, -- Memory, Network, Zero-Day, Signature
        severity TEXT NOT NULL, -- Critical, High, Medium, Low
        description TEXT NOT NULL,
        indicators TEXT NOT NULL, -- JSON list of anomalous signals
        playbook TEXT NOT NULL, -- Step by step remediation instructions
        recommended_action TEXT NOT NULL -- e.g. isolate, kill_process, sinkhole, patch
    );
    """)

    # 3. Rolling 15-Day Forensic Incident Logs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS incident_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        endpoint_id TEXT NOT NULL,
        vector_key TEXT NOT NULL,
        attack_name TEXT NOT NULL,
        severity TEXT NOT NULL,
        details TEXT NOT NULL,
        anomaly_score REAL DEFAULT 0.0,
        shap_top_features TEXT DEFAULT '[]', -- JSON string of top contributing features
        resolved INTEGER DEFAULT 0,
        playbook_executed TEXT DEFAULT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (endpoint_id) REFERENCES endpoints(id),
        FOREIGN KEY (vector_key) REFERENCES threat_catalog(vector_key)
    );
    """)

    # 4. Inter-Host Chat Hub Messages
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id TEXT NOT NULL,
        sender_name TEXT NOT NULL,
        sender_role TEXT NOT NULL, -- SOC_MASTER, SUB_SERVER, ENDPOINT
        message TEXT NOT NULL,
        channel TEXT DEFAULT 'general',
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 5. Federated Learning Sessions Tracker
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS fl_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT UNIQUE NOT NULL,
        model_type TEXT NOT NULL, -- memory, network, autoencoder, fusion
        target_cluster TEXT NOT NULL,
        epochs INTEGER DEFAULT 5,
        mu REAL DEFAULT 0.01,
        status TEXT DEFAULT 'idle', -- idle, training, completed, failed
        current_round INTEGER DEFAULT 0,
        total_rounds INTEGER DEFAULT 15,
        latest_accuracy REAL DEFAULT 0.0,
        latest_f1 REAL DEFAULT 0.0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 6. IT GRC Policies Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS grc_policies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        policy_code TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        framework TEXT NOT NULL, -- NIST CSF 2.0, ISO 27001, SOC 2 Type II, PCI-DSS v4.0, Zero Trust
        domain TEXT NOT NULL, -- Access Control, Incident Response, Model Governance & FL, Enclave Isolation, Cryptography, Audit & Logging
        risk_level TEXT NOT NULL, -- Critical, High, Medium, Low
        compliance_status TEXT NOT NULL DEFAULT 'Compliant', -- Compliant, Needs Review, Audit Pending, Non-Compliant
        control_objective TEXT NOT NULL,
        enforcement_mechanism TEXT NOT NULL,
        audit_frequency TEXT NOT NULL DEFAULT 'Quarterly',
        last_audited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        evidence_reference TEXT DEFAULT 'Enclave Live Telemetry / Database Signature'
    );
    """)

    # 7. RACI Auditing & Governance Matrix Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS raci_matrix (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        activity_id TEXT UNIQUE NOT NULL,
        activity_name TEXT NOT NULL,
        category TEXT NOT NULL,
        responsible TEXT NOT NULL, -- R: Who executes the control
        accountable TEXT NOT NULL,   -- A: Who has final sign-off authority
        consulted TEXT NOT NULL,     -- C: Two-way feedback providers
        informed TEXT NOT NULL,      -- I: Stakeholders kept updated
        audit_checkpoint TEXT NOT NULL,
        sign_off_status TEXT NOT NULL DEFAULT 'Approved', -- Approved, In Review, Pending Sign-off
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 8. GRC Audit Trail & Evidence Records
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS grc_audit_trail (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        policy_code TEXT NOT NULL,
        auditor_name TEXT NOT NULL,
        auditor_role TEXT NOT NULL,
        audit_result TEXT NOT NULL, -- PASS, WARN, FAIL
        findings TEXT NOT NULL,
        remediation_plan TEXT DEFAULT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 6. Users Table (For SOC Master Web Logins)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'admin'
    );
    """)

    # Seed Admin User
    cursor.execute("INSERT OR IGNORE INTO users (username, password, role) VALUES ('admin', 'admin123', 'admin')")

    # 7. System Configuration Table (For persistent Gemini API keys & global settings)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS system_config (
        config_key TEXT PRIMARY KEY,
        config_value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Seed Default Gemini Key if not already configured
    DEFAULT_KEY = "AQ.Ab8RN6JjKGAcG1JylvVVkSwI-1TVZ5Fr3dOes7XfJTOVnlhGZQ"
    cursor.execute("""
    INSERT OR IGNORE INTO system_config (config_key, config_value)
    VALUES ('gemini_api_key', ?)
    """, (DEFAULT_KEY,))


    # Seed Default Threat Catalog Entries
    threat_seeds = [
        (
            "socgholish",
            "SocGholish (FakeUpdates) Infiltration",
            "Memory",
            "Critical",
            "JavaScript-based malware disguised as browser update triggering memory injection and payload execution.",
            '["malfind.ninjections > 5", "pslist.avg_threads abnormal", "ldrmodules.not_in_mem > 0"]',
            "1. Terminate suspicious wscript.exe / powershell.exe parent processes.\n2. Quarantine user temp profile directory (%TEMP%).\n3. Revoke current domain user session tokens.\n4. Blackhole C2 beacon domains via firewall sinkhole.",
            "isolate"
        ),
        (
            "coinminer",
            "XMRig Cryptomining Trojan",
            "Memory",
            "Medium",
            "Unauthorized high-utilization cryptocurrency mining hijacking endpoint CPU and GPU compute cycles.",
            '["handles.nhandles spike", "pslist.nproc anomalies", "malfind.commitCharge high"]',
            "1. Locate and SIGKILL high-CPU binary from /tmp or C:\\ProgramData.\n2. Delete persistence scheduled tasks and cron jobs.\n3. Drop outbound connections on Stratum mining ports (3333, 4444, 5555, 14444).\n4. Audit process integrity.",
            "kill_process"
        ),
        (
            "ddos_synflood",
            "Volumetric SYN Flood / DoS",
            "Network",
            "High",
            "High-frequency packet flood overwhelming network buffers and state tables.",
            '["SYN Flag Count > 1000", "Flow Packets/s > 50000", "Flow Duration < 100ms"]',
            "1. Enable SYN cookies on OS kernel (sysctl -w net.ipv4.tcp_syncookies=1).\n2. Apply rate limiting iptables/Windows Firewall rule.\n3. Drop offending source IP CIDR block at perimeter router.\n4. Divert incoming host traffic through scrubbing center.",
            "isolate"
        ),
        (
            "ransomware_blackcat",
            "ALPHV / BlackCat Ransomware",
            "Memory",
            "Critical",
            "Rapid file-system encryption wiper with shadow copy deletion and privilege escalation.",
            '["handles.nfile > 10000", "malfind.protection PAGE_EXECUTE_READWRITE", "svcscan.nactive modified"]',
            "1. INSTANT NETWORK QUARANTINE: Isolate host from LAN.\n2. Freeze process tree and capture live memory dump to retrieve decryption keys.\n3. Prevent vssadmin.exe execution.\n4. Initiate clean rollback from immutable offline snapshot.",
            "isolate"
        ),
        (
            "mirai_botnet",
            "Mirai IoT / Linux Botnet Agent",
            "Network",
            "High",
            "Automated spreading worm scanning Telnet/SSH ports and initiating remote command execution.",
            '["Destination Port 23/2222 scan", "Total Length of Fwd Packets surge", "Active Mean < 10ms"]',
            "1. Kill rogue process binding to raw sockets.\n2. Clean /etc/init.d and ~/.bashrc persistence entries.\n3. Restrict outbound SSH/Telnet scan flows.\n4. Rotate local root and user SSH keys immediately.",
            "sinkhole"
        ),
        (
            "zeroday_anomaly",
            "Zero-Day Novel Attack Vector",
            "Zero-Day",
            "Critical",
            "Unsupervised autoencoder reconstruction MSE loss exceeded dynamic anomaly threshold theta, indicating unknown zero-day behavior.",
            '["Autoencoder MSE Loss > Theta", "Latent Feature Divergence", "Non-IID Manifold Anomaly"]',
            "1. Elevate incident alert to Tier 3 SOC Analyst.\n2. Capture full live PCAP and memory artifact snapshot.\n3. Isolate node in dedicated micro-segmentation sandbox.\n4. Generate differential gradient SHAP breakdown for immediate reverse engineering.",
            "isolate"
        ),
        (
            "custom_signature",
            "Custom Indicator of Compromise (IoC)",
            "Signature",
            "Medium",
            "Rule match against SOC-defined behavioral or network signature policy.",
            '["Custom Regex Pattern", "Blacklisted Hash / Domain"]',
            "1. Review rule match context in telemetry stream.\n2. Validate against whitelisted operational baselines.\n3. Block source IP or hash in endpoint EDR policy.",
            "patch"
        ),
        (
            "portscan",
            "Aggressive Multi-Port Reconnaissance",
            "Network",
            "High",
            "Multi-port probing sweep scanning common service ports for network mapping.",
            '["Scanned Ports >= 20", "Flow IAT Min <= 5ms", "SYN Flag Count >= 50"]',
            "1. Deploy boundary iptables/Windows Firewall connection limits.\n2. Ban origin scanning IP on network edge gateway.\n3. Verify exposure of exposed ports.",
            "isolate"
        ),
        (
            "dos_hulk",
            "Application Layer HTTP Flood (DoS Hulk)",
            "Network",
            "High",
            "Volumetric HTTP GET/POST flood saturating web server worker pools.",
            '["Flow Packets/s >= 5000", "Total Fwd Packets spike", "Subflow Fwd Bytes >= 1MB"]',
            "1. Engage WAF rate-limiting rules.\n2. Filter anomalous User-Agent headers.\n3. Enable HTTP challenge or Captcha at reverse proxy.",
            "sinkhole"
        ),
        (
            "mem_process_hollowing",
            "Process Hollowing & Memory Injection",
            "Memory",
            "Critical",
            "Unbacked executable code cavity detected within hollowed host process handle.",
            '["malfind.ninjections >= 5", "ldrmodules.not_in_load >= 1", "pslist.avg_handlers spike"]',
            "1. Terminate malicious parent and child process trees.\n2. Dump unbacked memory region for forensic YARA rule creation.\n3. Isolate host endpoint immediately from domain network.",
            "isolate"
        )
    ]

    for seed in threat_seeds:
        cursor.execute("""
        INSERT OR IGNORE INTO threat_catalog (
            vector_key, name, category, severity, description, indicators, playbook, recommended_action
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, seed)

    # Seed Default Heterogeneous Endpoints (Enterprise Departments)
    default_endpoints = [
        ("win-prod-01", "WIN10-FINANCE-01", "192.168.1.105", "Windows 10", "offline", "client123", 0.0, 0.0, 0.0, 38.9072, -77.0369, "Finance & Billing Enclave"),
        ("kali-sec-01", "KALI-PENTEST-NODE", "192.168.1.188", "Kali Linux", "offline", "client123", 0.0, 0.0, 0.0, 51.5074, -0.1278, "SecOps & Threat Intel Core"),
        ("ubuntu-srv-01", "UBUNTU-NET-CLUSTER-1", "192.168.1.210", "Ubuntu 22.04", "offline", "client123", 0.0, 0.0, 0.0, 48.8566, 2.3522, "DevOps & Cloud Core"),
        ("ubuntu-srv-02", "UBUNTU-NET-CLUSTER-2", "192.168.1.211", "Ubuntu 22.04", "offline", "client123", 0.0, 0.0, 0.0, 35.6762, 139.6503, "R&D Neural Computing Lab"),
    ]

    for ep in default_endpoints:
        cursor.execute("""
        INSERT INTO endpoints (
            id, hostname, ip_address, os_type, status, passcode, cpu_usage, memory_usage, network_load, geo_lat, geo_lng, location_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET 
            location_name = excluded.location_name,
            status = excluded.status,
            cpu_usage = excluded.cpu_usage,
            memory_usage = excluded.memory_usage,
            network_load = excluded.network_load
        """, ep)

    # Seed Default IT GRC Policies
    grc_seeds = [
        (
            "POL-SEC-01",
            "Automated Host Micro-Segmentation & Quarantine",
            "NIST CSF 2.0",
            "Enclave Isolation",
            "Critical",
            "Compliant",
            "Immediately sever lateral attack propagation by isolating compromised hosts within 2500ms of high-confidence detection.",
            "WebSocket Agent Command: quarantine -> status: isolated",
            "Continuous",
            "Active WebSocket Enclave Signal"
        ),
        (
            "POL-SEC-02",
            "Federated Learning Differential Privacy & Gradient Integrity",
            "ISO 27001",
            "Model Governance & FL",
            "High",
            "Compliant",
            "Raw endpoint dataset telemetry must remain in-situ; central SOC server only receives FedProx aggregated model parameters.",
            "Flower FedProx Balanced Aggregation Strategy",
            "Per Training Run",
            "fl_metrics.db Round Convergence Logs"
        ),
        (
            "POL-SEC-03",
            "Unsupervised Zero-Day Latent Anomaly Calibration",
            "NIST CSF 2.0",
            "Incident Response",
            "Critical",
            "Compliant",
            "Zero-Day Autoencoder reconstruction threshold theta must be statistically bounded (mu + 1.5*sigma) against benign traffic manifold.",
            "Autoencoder MSE Reconstruction vs. zeroday_config.json",
            "Monthly",
            "zeroday_config.json Anomaly Threshold theta"
        ),
        (
            "POL-SEC-04",
            "15-Day Rolling Forensic Incident Log Retention",
            "SOC 2 Type II",
            "Audit & Logging",
            "High",
            "Compliant",
            "Forensic alerts, gradient SHAP attributions, and mitigation playbooks must be persisted for 15 days with automated pruning.",
            "SQLite rolling 15-day retention daemon with vacuum purge",
            "Daily",
            "incident_logs table & prune_old_incident_logs()"
        ),
        (
            "POL-SEC-05",
            "Mutual Zero Trust Node Passcode Verification",
            "Zero Trust",
            "Access Control",
            "High",
            "Compliant",
            "Endpoints must authenticate with unique node credentials and strict token-gated WebSockets before telemetry is accepted.",
            "Agent Passcode Challenge & SHA-256 Validation",
            "Per Session",
            "endpoints table passcode verification"
        ),
        (
            "POL-SEC-06",
            "Dynamic Threat Catalog Signatures & Remediation Playbooks",
            "PCI-DSS v4.0",
            "Incident Response",
            "Medium",
            "Compliant",
            "All classified attack vectors must maintain verified actionable playbooks (SocGholish, Coinminer, SYN Flood, BlackCat).",
            "threat_catalog table automated playbook dispatch",
            "Quarterly",
            "threat_catalog.playbook schema"
        ),
        (
            "POL-SEC-07",
            "AI SecOps Copilot Query Sanitization & Guardrails",
            "ISO 27001",
            "Cryptography",
            "High",
            "Compliant",
            "Copilot prompts must be filtered against prompt injection and prevent leakage of private keys or internal database schemas.",
            "Regex Sanitizer & System Prompt Safety Constraints",
            "Continuous",
            "/api/copilot/query guardrail filter"
        ),
        (
            "POL-SEC-08",
            "Role-Based Access Control (RBAC) & Privilege Separation",
            "SOC 2 Type II",
            "Access Control",
            "Critical",
            "Compliant",
            "Enforce strict least-privilege separation between Master SOC Admins, Tier 2 Analysts, and Endpoint Node Enclaves.",
            "SessionStorage Token Verification & Role Gate",
            "Quarterly",
            "users table & RBAC Permissions Matrix"
        )
    ]

    for pol in grc_seeds:
        cursor.execute("""
        INSERT INTO grc_policies (
            policy_code, title, framework, domain, risk_level, compliance_status, control_objective, enforcement_mechanism, audit_frequency, evidence_reference
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(policy_code) DO UPDATE SET
            title = excluded.title,
            framework = excluded.framework,
            domain = excluded.domain,
            risk_level = excluded.risk_level,
            control_objective = excluded.control_objective,
            enforcement_mechanism = excluded.enforcement_mechanism
        """, pol)

    # Seed Default RACI Matrix Rows
    raci_seeds = [
        (
            "RACI-ACT-01",
            "Endpoint Threat Detection & Micro-Segmentation Isolation",
            "Incident Response & Mitigation",
            "Lead SOC Security Analyst (Tier 2/3)",
            "CISO / Head of Security Ops",
            "Threat Intel Specialist, SecOps IR Team",
            "Affected Enclave Host Admin, IT Operations",
            "WebSocket Quarantine ACK Confirmation & Incident Log Entry",
            "Approved"
        ),
        (
            "RACI-ACT-02",
            "Federated Learning Model Retraining & Production Checkpoint Approval",
            "AI Model Governance & FL Ops",
            "ML / Federated Learning Engineer",
            "CISO / Head of Security Ops",
            "Lead SOC Security Analyst, Data Scientist",
            "Compliance Auditor, All Enclave Host Admins",
            "FL Convergence Curve Accuracy > 95% in fl_metrics.db",
            "Approved"
        ),
        (
            "RACI-ACT-03",
            "Zero-Day Anomaly Threshold (theta) Calibration & Recalculation",
            "AI Model Governance & FL Ops",
            "ML / Federated Learning Engineer",
            "Lead SOC Security Analyst (Tier 3)",
            "Threat Researcher, Reverse Engineer",
            "CISO, IT Auditor",
            "Reconstruction MSE Distribution on Clean Baseline Flows",
            "Approved"
        ),
        (
            "RACI-ACT-04",
            "Forensic Telemetry Auditing & 15-Day Log Certification",
            "Forensic Log Auditing & Compliance",
            "Lead SOC Security Analyst",
            "IT GRC & Compliance Auditor Lead",
            "Database Administrator (DBA)",
            "CISO, Legal Counsel",
            "Cryptographic Hash Integrity of cyberpulse_core.db",
            "Approved"
        ),
        (
            "RACI-ACT-05",
            "Threat Catalog Signature & Mitigation Playbook Updates",
            "Threat Catalog & Signature Mgmt",
            "Threat Intelligence Researcher",
            "Lead SOC Security Analyst (Tier 3)",
            "Incident Response Commander",
            "All SOC Tier 1/2 Triage Operators",
            "Threat Vector Sandbox Reversal & IoC Verification",
            "Approved"
        ),
        (
            "RACI-ACT-06",
            "Enclave Host Provisioning & Passcode Access Control",
            "Fleet Management & Access Control",
            "Endpoint Fleet Administrator",
            "Lead SOC Security Analyst",
            "Identity & Access Management (IAM) Team",
            "CISO, Enclave User",
            "Mutual WebSocket Handshake & Token Issue in endpoints table",
            "Approved"
        ),
        (
            "RACI-ACT-07",
            "AI SecOps Copilot API Key & Model Configuration Review",
            "Security Automation & AI Governance",
            "SecOps Automation Engineer",
            "CISO / Head of Security Ops",
            "Compliance Lead, Data Privacy Officer",
            "All SOC Analysts",
            "Gemini Prompt Guardrail Test & Key Persistence in SQLite",
            "Approved"
        ),
        (
            "RACI-ACT-08",
            "Annual IT GRC Compliance Certification (NIST/ISO/SOC2)",
            "Forensic Log Auditing & Compliance",
            "IT GRC & Compliance Auditor Lead",
            "CISO / Board of Directors",
            "External Qualified Security Assessor (QSA)",
            "All Department Stakeholders",
            "Signed Executive GRC Audit Report & Evidence Repository",
            "Approved"
        )
    ]

    for raci in raci_seeds:
        cursor.execute("""
        INSERT INTO raci_matrix (
            activity_id, activity_name, category, responsible, accountable, consulted, informed, audit_checkpoint, sign_off_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(activity_id) DO UPDATE SET
            activity_name = excluded.activity_name,
            category = excluded.category,
            responsible = excluded.responsible,
            accountable = excluded.accountable,
            consulted = excluded.consulted,
            informed = excluded.informed,
            audit_checkpoint = excluded.audit_checkpoint
        """, raci)

    conn.commit()
    conn.close()
    print("Database cyberpulse_core.db initialized and populated successfully.")

def prune_old_incident_logs(days=15):
    """Prunes forensic incident logs older than specified days (15-day rolling retention)"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cutoff_date = (datetime.utcnow() - timedelta(days=days)).strftime('%Y-%m-%d %H:%M:%S')
    cursor.execute("DELETE FROM incident_logs WHERE timestamp < ?", (cutoff_date,))
    deleted_count = cursor.rowcount
    conn.commit()
    conn.close()
    return deleted_count

if __name__ == "__main__":
    init_db()

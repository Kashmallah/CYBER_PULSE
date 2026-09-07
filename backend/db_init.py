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

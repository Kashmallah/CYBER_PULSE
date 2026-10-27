import os
import sys
import sqlite3
import json

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CORE_DB_PATH = os.path.join(BASE_DIR, "backend", "cyberpulse_core.db")
METRICS_DB_PATH = os.path.join(BASE_DIR, "backend", "fl_metrics.db")

def print_table(rows, headers):
    if not rows:
        print("  (Empty Table)")
        return
    col_widths = [len(h) for h in headers]
    for row in rows:
        for idx, val in enumerate(row):
            str_val = str(val) if val is not None else "NULL"
            if len(str_val) > 40:
                str_val = str_val[:37] + "..."
            col_widths[idx] = max(col_widths[idx], len(str_val))
    
    # Header format
    header_line = " | ".join(f"{headers[i]:<{col_widths[i]}}" for i in range(len(headers)))
    sep_line = "-+-".join("-" * col_widths[i] for i in range(len(headers)))
    
    print(header_line)
    print(sep_line)
    for row in rows:
        row_str = []
        for idx, val in enumerate(row):
            str_val = str(val) if val is not None else "NULL"
            if len(str_val) > 40:
                str_val = str_val[:37] + "..."
            row_str.append(f"{str_val:<{col_widths[idx]}}")
        print(" | ".join(row_str))

def inspect_db(db_path, title):
    print(f"\n{'='*70}")
    print(f" DATABASE: {title}")
    print(f" Location: {db_path}")
    print(f"{'='*70}")
    
    if not os.path.exists(db_path):
        print(f"[!] Database file does not exist at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # List tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
    tables = [r[0] for r in cursor.fetchall() if not r[0].startswith("sqlite_")]
    
    print(f"Found {len(tables)} tables: {', '.join(tables)}\n")
    
    for tbl in tables:
        cursor.execute(f"PRAGMA table_info({tbl});")
        columns = [c[1] for c in cursor.fetchall()]
        
        cursor.execute(f"SELECT COUNT(*) FROM {tbl};")
        count = cursor.fetchone()[0]
        
        print(f"--- Table: [{tbl}] ({count} total records) ---")
        cursor.execute(f"SELECT * FROM {tbl} LIMIT 10;")
        rows = cursor.fetchall()
        print_table(rows, columns)
        if count > 10:
            print(f"  ... and {count - 10} more rows (use query mode to view all)")
        print()
    
    conn.close()

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--query":
        query = " ".join(sys.argv[2:])
        target_db = CORE_DB_PATH
        print(f"Executing Query on Core DB: {query}")
        conn = sqlite3.connect(target_db)
        cursor = conn.cursor()
        try:
            cursor.execute(query)
            if cursor.description:
                headers = [d[0] for d in cursor.description]
                rows = cursor.fetchall()
                print_table(rows, headers)
            else:
                conn.commit()
                print(f"Query executed successfully. Rows affected: {cursor.rowcount}")
        except Exception as e:
            print(f"SQL Error: {e}")
        conn.close()
    else:
        inspect_db(CORE_DB_PATH, "CYBER_PULSE Core Enterprise Database")
        inspect_db(METRICS_DB_PATH, "Federated Learning Convergence Metrics Database")
        print("Tip: Run `python tools/view_db.py --query \"SELECT * FROM grc_policies\"` to execute custom SQL.")

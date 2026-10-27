import sys
import os
import matplotlib.pyplot as plt
import matplotlib.patches as patches

# Ensure project root is accessible in sys.path
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

def generate_database_er_diagram():
    fig, ax = plt.subplots(figsize=(24, 15), dpi=300)
    fig.patch.set_facecolor('#FFFFFF')
    ax.set_facecolor('#FFFFFF')
    ax.set_xlim(0, 24)
    ax.set_ylim(0, 15)
    ax.axis('off')

    # 1. Outer Frame
    ax.add_patch(patches.Rectangle((0.4, 0.4), 23.2, 14.2, linewidth=2.0, edgecolor='#0F172A', facecolor='#FFFFFF', zorder=1))

    # 2. Database Instance Boundaries (Containers)
    # Database 1: cyberpulse_core.db (Left / Major Area)
    db1_box = patches.Rectangle((0.8, 0.8), 16.8, 13.4, linewidth=1.8, edgecolor='#334155', facecolor='#F8FAFC', linestyle='--', zorder=2)
    ax.add_patch(db1_box)
    db1_tab = patches.Rectangle((0.8, 13.7), 6.5, 0.5, linewidth=1.4, edgecolor='#334155', facecolor='#E2E8F0', zorder=3)
    ax.add_patch(db1_tab)
    ax.text(1.0, 13.95, "«database» cyberpulse_core.db (Operational Entities)", color='#0F172A', fontsize=9.5, weight='bold', ha='left', va='center', zorder=4)

    # Database 2: fl_metrics.db (Right Area)
    db2_box = patches.Rectangle((18.0, 0.8), 5.2, 13.4, linewidth=1.8, edgecolor='#334155', facecolor='#F8FAFC', linestyle='--', zorder=2)
    ax.add_patch(db2_box)
    db2_tab = patches.Rectangle((18.0, 13.7), 5.2, 0.5, linewidth=1.4, edgecolor='#334155', facecolor='#E2E8F0', zorder=3)
    ax.add_patch(db2_tab)
    ax.text(18.2, 13.95, "«database» backend/fl_metrics.db (FL Telemetry)", color='#0F172A', fontsize=9.5, weight='bold', ha='left', va='center', zorder=4)

    # Helper for drawing Database Table Entity Box
    def draw_db_table(x, y, w, h, table_name, columns):
        t_box = patches.Rectangle((x, y), w, h, linewidth=1.6, edgecolor='#0F172A', facecolor='#FFFFFF', zorder=4)
        ax.add_patch(t_box)

        head_h = 0.65
        h_box = patches.Rectangle((x, y + h - head_h), w, head_h, linewidth=1.4, edgecolor='#0F172A', facecolor='#F1F5F9', zorder=5)
        ax.add_patch(h_box)

        ax.text(x + w/2.0, y + h - 0.32, f"table {table_name}", color='#0F172A', fontsize=10.0, weight='bold', ha='center', va='center', zorder=6)

        col_start_y = y + h - head_h - 0.22
        col_gap = (h - head_h - 0.3) / max(len(columns), 1)

        for i, (pk_fk, col_name, col_type) in enumerate(columns):
            cur_y = col_start_y - (i * col_gap)
            if pk_fk:
                ax.text(x + 0.25, cur_y, pk_fk, color='#B91C1C' if 'PK' in pk_fk else '#0369A1', fontsize=7.5, weight='bold', family='monospace', ha='left', va='center', zorder=6)
            ax.text(x + 1.1, cur_y, col_name, color='#0F172A', fontsize=8.0, weight='bold' if pk_fk else 'normal', ha='left', va='center', zorder=6)
            ax.text(x + w - 0.25, cur_y, col_type, color='#64748B', fontsize=7.5, family='monospace', ha='right', va='center', zorder=6)

    # 3. Tables in cyberpulse_core.db
    # endpoints (Top-Left)
    draw_db_table(
        x=1.2, y=8.6, w=4.8, h=4.6,
        table_name="endpoints",
        columns=[
            ("PK", "id", "TEXT (UUID)"),
            ("", "ip_address", "TEXT"),
            ("", "hostname", "TEXT"),
            ("", "os_type", "TEXT"),
            ("", "status", "TEXT"),
            ("", "cpu_usage", "REAL"),
            ("", "memory_usage", "REAL"),
            ("", "network_load", "REAL"),
            ("", "passcode", "TEXT"),
            ("", "geo_lat", "REAL"),
            ("", "geo_lng", "REAL"),
            ("", "location_name", "TEXT"),
            ("", "last_seen", "TIMESTAMP")
        ]
    )

    # incidents (Top-Middle)
    draw_db_table(
        x=6.8, y=8.6, w=5.0, h=4.6,
        table_name="incidents",
        columns=[
            ("PK", "id", "INTEGER (AUTO)"),
            ("FK", "endpoint_id", "TEXT"),
            ("FK", "vector_key", "TEXT"),
            ("", "details", "TEXT"),
            ("", "status", "TEXT"),
            ("", "severity", "TEXT"),
            ("", "anomaly_score", "REAL"),
            ("", "shap_top_features", "JSON / TEXT"),
            ("", "action_taken", "TEXT"),
            ("", "mitigated_at", "TIMESTAMP"),
            ("", "timestamp", "TIMESTAMP")
        ]
    )

    # threat_catalog (Top-Right of core)
    draw_db_table(
        x=12.4, y=8.6, w=4.8, h=4.6,
        table_name="threat_catalog",
        columns=[
            ("PK", "vector_key", "TEXT"),
            ("", "name", "TEXT"),
            ("", "category", "TEXT"),
            ("", "severity", "TEXT"),
            ("", "description", "TEXT"),
            ("", "indicators", "JSON / TEXT"),
            ("", "playbook", "TEXT"),
            ("", "recommended_action", "TEXT"),
            ("", "created_at", "TIMESTAMP")
        ]
    )

    # fl_sessions (Bottom-Left)
    draw_db_table(
        x=1.2, y=3.8, w=4.8, h=4.2,
        table_name="fl_sessions",
        columns=[
            ("PK", "session_id", "TEXT"),
            ("", "model_type", "TEXT"),
            ("", "target_cluster", "TEXT"),
            ("", "epochs", "INTEGER"),
            ("", "mu", "REAL"),
            ("", "status", "TEXT"),
            ("", "current_round", "INTEGER"),
            ("", "total_rounds", "INTEGER"),
            ("", "created_at", "TIMESTAMP"),
            ("", "completed_at", "TIMESTAMP")
        ]
    )

    # chat_messages (Bottom-Middle)
    draw_db_table(
        x=6.8, y=3.8, w=5.0, h=4.2,
        table_name="chat_messages",
        columns=[
            ("PK", "id", "INTEGER (AUTO)"),
            ("", "sender_id", "TEXT"),
            ("", "sender_name", "TEXT"),
            ("", "sender_role", "TEXT"),
            ("", "message", "TEXT"),
            ("", "channel", "TEXT"),
            ("", "timestamp", "TIMESTAMP")
        ]
    )

    # system_config (Bottom-Right of core)
    draw_db_table(
        x=12.4, y=3.8, w=4.8, h=4.2,
        table_name="system_config",
        columns=[
            ("PK", "config_key", "TEXT"),
            ("", "config_value", "TEXT"),
            ("", "updated_at", "TIMESTAMP")
        ]
    )

    # 4. Tables in fl_metrics.db
    # round_metrics (Right Top)
    draw_db_table(
        x=18.3, y=7.4, w=4.6, h=5.8,
        table_name="round_metrics",
        columns=[
            ("PK", "id", "INTEGER (AUTO)"),
            ("", "round", "INTEGER"),
            ("", "model_type", "TEXT"),
            ("", "loss", "REAL"),
            ("", "accuracy", "REAL"),
            ("", "precision_macro", "REAL"),
            ("", "precision_micro", "REAL"),
            ("", "precision_weighted", "REAL"),
            ("", "recall_macro", "REAL"),
            ("", "recall_micro", "REAL"),
            ("", "recall_weighted", "REAL"),
            ("", "f1_macro", "REAL"),
            ("", "f1_micro", "REAL"),
            ("", "f1_weighted", "REAL"),
            ("", "roc_auc", "REAL"),
            ("", "sensitivity", "REAL"),
            ("", "specificity", "REAL"),
            ("", "mcc", "REAL"),
            ("", "timestamp", "TIMESTAMP")
        ]
    )

    # client_contributions (Right Bottom)
    draw_db_table(
        x=18.3, y=1.4, w=4.6, h=5.2,
        table_name="client_contributions",
        columns=[
            ("PK", "id", "INTEGER (AUTO)"),
            ("", "round", "INTEGER"),
            ("", "client_id", "TEXT"),
            ("", "model_type", "TEXT"),
            ("", "num_samples", "INTEGER"),
            ("", "local_loss", "REAL"),
            ("", "local_acc", "REAL"),
            ("", "weight_norm", "REAL"),
            ("", "proximal_loss", "REAL"),
            ("", "timestamp", "TIMESTAMP")
        ]
    )

    # 5. Connectors / Relationships (Crow's Foot style orthogonal lines)
    # Endpoint to Incidents (1 : N)
    ax.annotate("", xy=(6.8, 11.2), xytext=(6.0, 11.2),
                arrowprops=dict(arrowstyle="->", color="#0284C7", lw=1.8, shrinkA=0, shrinkB=0))
    ax.text(6.1, 11.4, "1", color="#0284C7", fontsize=9, weight='bold')
    ax.text(6.5, 11.4, "N", color="#0284C7", fontsize=9, weight='bold')

    # Threat Catalog to Incidents (1 : N)
    ax.annotate("", xy=(11.8, 11.2), xytext=(12.4, 11.2),
                arrowprops=dict(arrowstyle="->", color="#0284C7", lw=1.8, shrinkA=0, shrinkB=0))
    ax.text(12.2, 11.4, "1", color="#0284C7", fontsize=9, weight='bold')
    ax.text(11.9, 11.4, "N", color="#0284C7", fontsize=9, weight='bold')

    out_file = os.path.join(ROOT_DIR, "database_architecture_er.png")
    plt.savefig(out_file, dpi=300, bbox_inches='tight')
    plt.close()
    print(f"ER diagram successfully generated and saved to {out_file}")

if __name__ == "__main__":
    generate_database_er_diagram()

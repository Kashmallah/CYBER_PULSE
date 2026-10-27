export interface Endpoint {
  id: string;
  hostname: string;
  ip_address: string;
  os_type: string;
  status: 'online' | 'offline' | 'isolated';
  passcode?: string;
  cpu_usage: number;
  memory_usage: number;
  network_load: number;
  geo_lat: number;
  geo_lng: number;
  location_name: string;
  last_seen: string;
}

export interface ThreatCatalogItem {
  id: number;
  vector_key: string;
  name: string;
  category: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  description: string;
  indicators: string;
  playbook: string;
  recommended_action: string;
}

export interface IncidentLog {
  id: number;
  endpoint_id: string;
  hostname?: string;
  ip_address?: string;
  os_type?: string;
  location_name?: string;
  geo_lat?: number;
  geo_lng?: number;
  vector_key: string;
  attack_name: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  details: string;
  anomaly_score: number;
  shap_top_features: string;
  resolved: number;
  playbook_executed?: string;
  timestamp: string;
}

export interface ChatMessage {
  id: number;
  sender_id: string;
  sender_name: string;
  sender_role: 'SOC_MASTER' | 'SUB_SERVER' | 'ENDPOINT';
  message: string;
  channel: string;
  timestamp: string;
}

export interface FLBenchmarks {
  memory: {
    accuracy: number;
    f1_weighted: number;
    roc_auc: number;
    round: number;
    loss?: number;
  };
  network: {
    accuracy: number;
    f1_weighted: number;
    roc_auc: number;
    round: number;
    loss?: number;
  };
  zeroday: {
    anomaly_threshold: number;
    mean_mse: number;
    std_mse: number;
  };
  history: Array<{
    id: number;
    round: number;
    model_type: string;
    accuracy: number;
    f1_weighted: number;
    roc_auc: number;
    loss: number;
    timestamp: string;
  }>;
}

export interface ShapFeature {
  name: string;
  value: number;
  impact: 'positive' | 'negative';
}

export interface GRCPolicy {
  id: number;
  policy_code: string;
  title: string;
  framework: string; // NIST CSF 2.0, ISO 27001, SOC 2 Type II, PCI-DSS v4.0, Zero Trust
  domain: string; // Access Control, Incident Response, Model Governance & FL, Enclave Isolation, Cryptography, Audit & Logging
  risk_level: 'Critical' | 'High' | 'Medium' | 'Low';
  compliance_status: 'Compliant' | 'Needs Review' | 'Audit Pending' | 'Non-Compliant';
  control_objective: string;
  enforcement_mechanism: string;
  audit_frequency: string;
  last_audited_at: string;
  evidence_reference: string;
}

export interface RACIRow {
  id: number;
  activity_id: string;
  activity_name: string;
  category: string;
  responsible: string; // R
  accountable: string;   // A
  consulted: string;     // C
  informed: string;      // I
  audit_checkpoint: string;
  sign_off_status: 'Approved' | 'In Review' | 'Pending Sign-off';
  updated_at: string;
}

export interface GRCAuditTrail {
  id: number;
  policy_code: string;
  auditor_name: string;
  auditor_role: string;
  audit_result: 'PASS' | 'WARN' | 'FAIL';
  findings: string;
  remediation_plan?: string;
  timestamp: string;
}


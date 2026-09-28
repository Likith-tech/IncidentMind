export interface Incident {
  id: number;
  title: string;
  service: string;
  severity: string;
  environment: string;
  status: string;
  error_logs: string;
  symptoms: string;
  context?: string;
  created_at: string;
  resolved_at?: string;
  analysis?: Analysis;
  root_cause?: string;
  resolution?: string;
}

export interface Analysis {
  summary: string;
  likely_root_cause: string;
  confidence: number;
  recommended_actions: string[];
  relevant_past_incidents: MemoryReference[];
  relevant_runbook?: string;
  why_this_recommendation?: string;
  potential_risks?: string[];
  next_steps?: string[];
  memory_influenced: boolean;
  memory_count: number;
  memory_impact: string;
  hindsight_mode: string;
}

export interface MemoryReference {
  memory_id: number;
  summary: string;
  root_cause?: string;
  resolution?: string;
}

export interface Memory {
  id: number;
  incident_id?: number;
  memory_type: string;
  service: string;
  summary: string;
  root_cause?: string;
  resolution?: string;
  created_at: string;
  mode?: string;
}

export interface DashboardSummary {
  active_incidents: number;
  resolved_incidents: number;
  critical_incidents: number;
  memory_count: number;
  memory_influenced_count: number;
  similar_incidents_found: number;
  avg_resolution_minutes: number;
  recent_incidents: Incident[];
  severity_distribution: Record<string, number>;
  service_health: Record<string, { total: number; resolved: number; critical: number }>;
  hindsight_mode: string;
  llm_mode: string;
}

export interface HealthStatus {
  status: string;
  service: string;
  version: string;
  environment: string;
  hindsight_mode: string;
  llm_mode: string;
  database: string;
}

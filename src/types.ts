export interface SimulationParams {
  verifiers: number;
  cashiers: number;
  biometrics: number;
  doc_failure_prob: number;
  courtesy_alloc: number;
  total_applicants: number;
}

export type AgentType = 'Courtesy' | 'Scheduled';
export type AgentStatus = 'completed' | 'failed_verification';

export interface AgentEventLog {
  run_id: string;
  agent_id: number;
  agent_type: AgentType;
  status: AgentStatus;
  
  // High-level timeline
  arrival_time: number;
  departure_time: number;
  total_time_in_system: number;
  
  // Verification details
  verify_wait_start: number;
  verify_service_start: number;
  verify_service_end: number;
  verify_wait_time: number;
  verify_service_time: number;
  
  // Cashier details (only if status is 'completed')
  cashier_wait_start: number | null;
  cashier_service_start: number | null;
  cashier_service_end: number | null;
  cashier_wait_time: number | null;
  cashier_service_time: number | null;
  
  // Biometrics details (only if status is 'completed')
  biometrics_wait_start: number | null;
  biometrics_service_start: number | null;
  biometrics_service_end: number | null;
  biometrics_wait_time: number | null;
  biometrics_service_time: number | null;
  
  // Accumulated wait times
  initial_wait_time: number; // Verification wait + Cashier wait + Biometrics wait
}

export interface QueueLengthLog {
  time: number;
  verify_queue: number;
  cashier_queue: number;
  biometrics_queue: number;
}

export interface ResourceUtilizationLog {
  time: number;
  verifiers_busy: number;
  cashiers_busy: number;
  biometrics_busy: number;
}

export interface SimulationResult {
  run_id: string;
  parameters: SimulationParams;
  timestamp: string;
  total_processed: number;
  avg_wait_time: number;
  
  // Aggregated analytics
  avg_verify_wait: number;
  avg_cashier_wait: number;
  avg_biometrics_wait: number;
  avg_total_wait: number;
  
  avg_verify_service: number;
  avg_cashier_service: number;
  avg_biometrics_service: number;
  avg_total_system_time: number;
  
  verification_fail_count: number;
  completion_count: number;
  
  // Detailed timeseries for charts
  logs: AgentEventLog[];
  queue_history: QueueLengthLog[];
  utilization_history: ResourceUtilizationLog[];
}

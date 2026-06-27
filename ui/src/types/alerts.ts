export interface AlertRule {
  id: string;
  processId?: number;
  metric: 'cpu' | 'memory' | 'restarts' | 'status';
  operator: '>' | '<' | '==' | '>=' | '<=';
  threshold: number;
  duration?: number;
  enabled: boolean;
}

export interface AlertEvent {
  ruleId: string;
  processId: number;
  ts: number;
}

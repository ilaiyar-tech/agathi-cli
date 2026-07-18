export interface EngineHealth {
  /** Overall health status */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** Timestamp of the health check */
  timestamp: Date;
  /** Optional details per component */
  details?: Record<string, any>;
}

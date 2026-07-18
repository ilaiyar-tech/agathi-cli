export interface EngineMetric {
  /** Unique identifier for the metric */
  id: string;
  /** Numeric value of the metric */
  value: number;
  /** Optional description */
  description?: string;
}

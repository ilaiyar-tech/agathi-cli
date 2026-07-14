export interface PolicyConfig {
  maxRetries: number;
  minConfidenceScore: number;
  timeoutMs: number;
}

export class ExecutionPolicy {
  private config: PolicyConfig;

  constructor(config: Partial<PolicyConfig> = {}) {
    this.config = {
      maxRetries: 3,
      minConfidenceScore: 60,
      timeoutMs: 15000,
      ...config
    };
  }

  public getMaxRetries(): number {
    return this.config.maxRetries;
  }

  public getMinConfidenceScore(): number {
    return this.config.minConfidenceScore;
  }

  public getTimeoutMs(): number {
    return this.config.timeoutMs;
  }

  public shouldAccept(score: number): boolean {
    return score >= this.config.minConfidenceScore;
  }
}

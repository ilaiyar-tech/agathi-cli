export interface IConfiguration {
  /** Retrieve a config value by key */
  get<T = any>(key: string): T | undefined;
  /** Set a config value */
  set<T = any>(key: string, value: T): void;
  /** Load configuration from sources (env, files) */
  load(): Promise<void>;
}

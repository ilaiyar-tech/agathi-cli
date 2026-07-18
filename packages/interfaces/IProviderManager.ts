export interface IProviderManager {
  /** Register a provider implementation */
  registerProvider(id: string, provider: any): void;
  /** Retrieve a provider by id */
  getProvider(id: string): any;
  /** List all registered provider ids */
  listProviders(): string[];
}

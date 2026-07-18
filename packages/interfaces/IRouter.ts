export interface IRouter {
  /** Resolve a model name to a provider and capabilities */
  route(request: any): Promise<{ providerId: string; modelId: string }>; 
}

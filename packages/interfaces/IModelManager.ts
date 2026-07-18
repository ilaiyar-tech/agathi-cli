export interface IModelManager {
  /** Register a model implementation */
  registerModel(id: string, model: any): void;
  /** Retrieve a model by id */
  getModel(id: string): any;
  /** List all registered model ids */
  listModels(): string[];
}

export interface IValidator {
  /** Validate input data against schema */
  validate(schemaId: string, data: any): Promise<{ valid: boolean; errors?: string[] }>;
  /** Register a new schema */
  registerSchema(schemaId: string, schema: any): void;
}

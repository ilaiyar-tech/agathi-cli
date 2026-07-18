export interface IToolRegistry {
  /** Register a tool implementation */
  register(name: string, handler: (...args: any[]) => Promise<any>): void;
  /** Execute a registered tool */
  execute(name: string, args: any[]): Promise<any>;
  /** List available tools */
  list(): string[];
}

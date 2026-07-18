import { engine } from "../execution_engine/index.js";

export interface ToolSchema {
  type: "object";
  properties: Record<string, any>;
  required?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  schema: ToolSchema;
  handler: (input: any) => Promise<any> | any;
}

class tool_registry {
  private readonly tools = new Map<string, ToolDefinition>();

  register(definition: ToolDefinition): void {
    if (this.tools.has(definition.name)) {
      throw new Error(`tool already registered: ${definition.name}`);
    }

    this.tools.set(definition.name, definition);

    // Also register the handler with the execution engine
    engine.register(definition.name, definition.handler);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  list(): string[] {
    return [...this.tools.keys()].sort();
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  getDefinitions(): any[] {
    return Array.from(this.tools.values()).map(t => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.schema
      }
    }));
  }

  async execute(name: string, input: unknown): Promise<unknown> {
    const handler = this.tools.get(name)?.handler;
    if (!handler) {
      throw new Error(`tool not found: ${name}`);
    }
    return handler(input);
  }
}

export const registry = new tool_registry();

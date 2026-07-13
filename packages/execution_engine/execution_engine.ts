export interface ExecutionStep {
  tool: string;
  args: any;
}

export interface ExecutionResult {
  step: ExecutionStep;
  success: boolean;
  output: string;
}

export type ToolHandler = (args: any) => Promise<string> | string;

export class execution_engine {
  private registry = new Map<string, ToolHandler>();

  register(tool: string, handler: ToolHandler) {
    this.registry.set(tool, handler);
  }

  async execute(step: ExecutionStep): Promise<ExecutionResult> {
    const handler = this.registry.get(step.tool);
    if (!handler) {
      return {
        step,
        success: false,
        output: `Tool "${step.tool}" not found.`
      };
    }

    try {
      const output = await handler(step.args);
      return {
        step,
        success: true,
        output
      };
    } catch (e: any) {
      return {
        step,
        success: false,
        output: e.message || "Unknown error executing tool"
      };
    }
  }

  async executeAll(steps: ExecutionStep[]): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];
    for (const step of steps) {
      results.push(await this.execute(step));
    }
    return results;
  }
}

export const engine = new execution_engine();

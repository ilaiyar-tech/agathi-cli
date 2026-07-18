import { registry } from "./tool_registry.js";
import assert from "node:assert";
import { engine } from "../execution_engine/index.js";

async function test_registry() {
  registry.register({
    name: "test_tool",
    description: "A tool for testing",
    schema: {
      type: "object",
      properties: {
        msg: { type: "string" }
      },
      required: ["msg"]
    },
    handler: async (input: any) => {
      return `Received: ${input.msg}`;
    }
  });

  const hasTool = registry.has("test_tool");
  assert.strictEqual(hasTool, true);

  const defs = registry.getDefinitions();
  assert.strictEqual(defs.length, 1);
  assert.strictEqual(defs[0].function.name, "test_tool");

  const result = await registry.execute("test_tool", { msg: "hello" });
  assert.strictEqual(result, "Received: hello");

  // Check execution engine integration
  const engineResult = await engine.execute({
    tool: "test_tool",
    args: { msg: "world" }
  });
  
  assert.strictEqual(engineResult.success, true);
  assert.strictEqual(engineResult.output, "Received: world");

  console.log("tool_registry tests passed.");
}

test_registry().catch(console.error);

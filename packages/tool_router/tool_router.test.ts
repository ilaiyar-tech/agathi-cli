import { tools_router } from "./tool_router.js";
import assert from "node:assert";
import axios from "axios";
import { registry } from "../tools/index.js";

// Mock axios for independent testability
const originalPost = axios.post;
let callCount = 0;

(axios as any).post = async (url: string, payload: any) => {
  callCount++;
  
  if (callCount === 1) {
    // First call: return a tool_call
    return {
      data: {
        choices: [
          {
            message: {
              role: "assistant",
              content: null,
              tool_calls: [
                {
                  id: "call_123",
                  type: "function",
                  function: {
                    name: "run_command",
                    arguments: '{"command":"echo hello"}'
                  }
                }
              ]
            }
          }
        ]
      }
    };
  } else {
    // Second call: return final response
    return {
      data: {
        choices: [
          {
            message: {
              role: "assistant",
              content: "The command output was hello"
            }
          }
        ]
      }
    };
  }
};

async function test_tool_router() {
  try {
    const result = await tools_router.chat({
      messages: [{ role: "user", content: "Say hello" }]
    });

    assert.strictEqual(callCount, 2);
    assert.strictEqual(result.content, "The command output was hello");
    assert.strictEqual(result.messages.length, 4); // user, assistant(tool_call), tool(result), assistant(final)

    console.log("tool_router tests passed.");
  } finally {
    axios.post = originalPost;
  }
}

test_tool_router().catch(console.error);

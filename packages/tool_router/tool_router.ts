import { router as model_router } from "../router/index.js";
import { registry } from "../tools/index.js";
import { engine } from "../execution_engine/index.js";
import axios from "axios";
import { workflow } from "./workflow_manager.js";

export interface ToolRouterOptions {
  model?: string;
  messages: any[];
}

export class tool_router {

  async chat(options: ToolRouterOptions) {
    if (options.model === "chat") {
      workflow.transition("Summary");
    } else {
      workflow.transition("Task");
    }
    let no_tool_retry_count = 0;
    const messages = [...options.messages];
    const tools = registry.getDefinitions();

    if (messages.length > 0 && messages[0].role === "system") {
      messages[0].content += "\n\n" + workflow.getSystemPromptExtension();
    } else {
      messages.unshift({ role: "system", content: workflow.getSystemPromptExtension() });
    }

    while (true) {
      const payload: any = {
        messages,
        temperature: 0
      };

      if (tools.length > 0) {
        payload.tools = tools;
      }

      const response = await axios.post(
        "http://127.0.0.1:8012/v1/chat/completions",
        payload,
        { headers: { "Connection": "close" } }
      );

      const message = response.data.choices?.[0]?.message;
      if (!message) {
        throw new Error("No message returned from model");
      }

      if (!message.tool_calls || message.tool_calls.length === 0) {
        if (message.content) {
          const funcMatch = message.content.match(/<function-call>([\s\S]*?)<\/function-call>/);
          if (funcMatch) {
            try {
              const parsed = JSON.parse(funcMatch[1]);
              message.tool_calls = [{
                id: `call_${Date.now()}`,
                type: "function",
                function: {
                  name: parsed.name,
                  arguments: typeof parsed.arguments === "string" ? parsed.arguments : JSON.stringify(parsed.arguments)
                }
              }];
              message.content = message.content.replace(funcMatch[0], "").trim();
            } catch (e) {}
          } else {
            const altMatch = message.content.match(/\[TOOL CALL\]:\s*([a-zA-Z0-9_]+)\(([\s\S]*?)\)/);
            if (altMatch) {
              try {
                message.tool_calls = [{
                  id: `call_${Date.now()}`,
                  type: "function",
                  function: {
                    name: altMatch[1],
                    arguments: altMatch[2]
                  }
                }];
                message.content = message.content.replace(altMatch[0], "").trim();
              } catch (e) {}
            } else {
              const mdJsonMatch = message.content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
              const jsonMatch = mdJsonMatch || message.content.match(/(\{[\s\S]*?\})/);
              if (jsonMatch) {
                try {
                  const parsed = JSON.parse(jsonMatch[1]);
                  if (parsed.name && parsed.arguments) {
                    message.tool_calls = [{
                      id: `call_${Date.now()}`,
                      type: "function",
                      function: {
                        name: parsed.name,
                        arguments: typeof parsed.arguments === "string" ? parsed.arguments : JSON.stringify(parsed.arguments)
                      }
                    }];
                    message.content = message.content.replace(jsonMatch[0], "").trim();
                  }
                } catch (e) {}
              }
            }
          }
        }
      }

      messages.push(message);

      if (message.tool_calls && message.tool_calls.length > 0) {
        for (const tc of message.tool_calls) {
          const function_name = tc.function.name;
          const function_args = JSON.parse(tc.function.arguments || "{}");

          if (function_name === "finish") {
            workflow.transition("Summary");
            return { content: message.content, messages };
          }

          const result = await engine.execute({
            tool: function_name,
            args: function_args
          });

          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            name: function_name,
            content: typeof result === "string" ? result : JSON.stringify(result)
          });

          if (["write_file", "replace_file_content", "multi_replace_file_content", "edit_file", "patch_file"].includes(function_name)) {
            workflow.transition("Verification");
            const verify_result = await engine.execute({
              tool: "run_command",
              args: { command: "npm run build --if-present && npm run test --if-present" }
            });
            messages.push({
              role: "system",
              content: `[Workflow Auto-Verification] Triggered build/test after file edit:\n${typeof verify_result === "string" ? verify_result : JSON.stringify(verify_result)}\n\nState is now Verification.`
            });
          }
        }
      } else {
        if (workflow.getCurrentState() !== "Summary" && no_tool_retry_count < 3) {
          no_tool_retry_count++;
          messages.push({ role: "assistant", content: message.content || "" });
          messages.push({
            role: "system",
            content: "You outputted text without calling a tool, but the workflow is not in the Summary state. You MUST output a tool call to continue investigating or executing. If you are finished with the task, output [TOOL CALL]: finish()"
          });
          continue;
        }
        workflow.transition("Summary");
        return {
          content: message.content,
          messages
        };
      }
    }
  }

  async chat_stream(
    options: { messages: any[], model?: string },
    onToken: (token: string) => void
  ) {
    if (options.model === "chat") {
      workflow.transition("Summary");
    } else {
      workflow.transition("Task");
    }
    let no_tool_retry_count = 0;
    const messages = [...options.messages];
    const tools = registry.getDefinitions();

    if (messages.length > 0 && messages[0].role === "system") {
      messages[0].content += "\n\n" + workflow.getSystemPromptExtension();
    } else {
      messages.unshift({ role: "system", content: workflow.getSystemPromptExtension() });
    }

    while (true) {
      const payload: any = {
        messages,
        temperature: 0,
        stream: true
      };

      if (tools.length > 0) {
        payload.tools = tools;
      }

      const response = await axios.post(
        "http://127.0.0.1:8012/v1/chat/completions",
        payload,
        { 
          responseType: "stream",
          headers: { "Connection": "close" }
        }
      );

      let content = "";
      let tool_calls_map: any = {};
      let has_tool_calls = false;

      await new Promise<void>((resolve, reject) => {
        let buffer = "";
        response.data.on("data", (chunk: Buffer) => {
          buffer += chunk.toString();
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const json = line.replace("data:", "").trim();
            if (json === "[DONE]") continue;

            try {
              const obj = JSON.parse(json);
              const choice = obj.choices?.[0];
              if (!choice) continue;

              const delta = choice.delta;
              if (delta.content) {
                content += delta.content;
                onToken(delta.content);
              }

              if (delta.tool_calls) {
                has_tool_calls = true;
                for (const tc of delta.tool_calls) {
                  const idx = tc.index ?? 0;
                  if (!tool_calls_map[idx]) {
                    tool_calls_map[idx] = {
                      id: tc.id || "",
                      type: "function",
                      function: { name: "", arguments: "" }
                    };
                  }
                  if (tc.id) tool_calls_map[idx].id = tc.id;
                  if (tc.function?.name) tool_calls_map[idx].function.name += tc.function.name;
                  if (tc.function?.arguments) tool_calls_map[idx].function.arguments += tc.function.arguments;
                }
              }
            } catch (e) {}
          }
        });

        response.data.on("end", () => resolve());
        response.data.on("error", (err: any) => reject(err));
      });

      const funcMatch = content.match(/<function-call>([\s\S]*?)<\/function-call>/);
      if (funcMatch) {
        try {
          const parsed = JSON.parse(funcMatch[1]);
          has_tool_calls = true;
          tool_calls_map[0] = {
            id: `call_${Date.now()}`,
            type: "function",
            function: {
              name: parsed.name,
              arguments: typeof parsed.arguments === "string" ? parsed.arguments : JSON.stringify(parsed.arguments)
            }
          };
          // optionally remove the raw text from content so we don't display raw xml to the user
          content = content.replace(funcMatch[0], "").trim();
        } catch (e) {}
      }

      if (!has_tool_calls) {
        const altMatch = content.match(/\[TOOL CALL\]:\s*([a-zA-Z0-9_]+)\(([\s\S]*?)\)/);
        if (altMatch) {
          try {
            has_tool_calls = true;
            tool_calls_map[0] = {
              id: `call_${Date.now()}`,
              type: "function",
              function: {
                name: altMatch[1],
                arguments: altMatch[2]
              }
            };
            content = content.replace(altMatch[0], "").trim();
          } catch (e) {}
        } else {
          const mdJsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
          const jsonMatch = mdJsonMatch || content.match(/(\{[\s\S]*?\})/);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[1]);
              if (parsed.name && parsed.arguments) {
                has_tool_calls = true;
                tool_calls_map[0] = {
                  id: `call_${Date.now()}`,
                  type: "function",
                  function: {
                    name: parsed.name,
                    arguments: typeof parsed.arguments === "string" ? parsed.arguments : JSON.stringify(parsed.arguments)
                  }
                };
                content = content.replace(jsonMatch[0], "").trim();
              }
            } catch (e) {}
          }
        }
      }

      const assistant_message: any = { role: "assistant" };
      if (content) assistant_message.content = content;

      if (has_tool_calls) {
        const tool_calls = Object.values(tool_calls_map);
        assistant_message.tool_calls = tool_calls;
        messages.push(assistant_message);

        for (const tc of tool_calls as any[]) {
          const name = tc.function.name;
          const args_str = tc.function.arguments;
          let args: any = {};
          try {
            args = JSON.parse(args_str || "{}");
          } catch (e) {}

          if (name === "finish") {
            workflow.transition("Summary");
            return { content, messages };
          }

          if (name === "run_command") {
            onToken(`\n\x1b[33m⚡ Bash:\x1b[36m ${args.command}\x1b[0m\n`);
          } else if (name === "read_file") {
            onToken(`\n\x1b[33m📖 Read:\x1b[36m ${args.path}\x1b[0m\n`);
          } else if (name === "search_files") {
            onToken(`\n\x1b[33m🔍 Search:\x1b[36m ${args.keyword}\x1b[0m\n`);
          } else if (name === "write_file") {
            onToken(`\n\x1b[33m✍ Write:\x1b[36m ${args.path}\x1b[0m\n`);
          } else {
            onToken(`\n\x1b[35m⚙ Tool:\x1b[36m ${name}\x1b[0m\n`);
          }

          const result = await engine.execute({
            tool: name,
            args
          });

          const result_str = typeof result === "string" ? result : JSON.stringify(result);

          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            name: name,
            content: result_str
          });

          if (["write_file", "replace_file_content", "multi_replace_file_content", "edit_file", "patch_file"].includes(name)) {
            workflow.transition("Verification");
            onToken(`\n\x1b[32m✔ Auto-Verification Triggered...\x1b[0m\n`);
            const verify_result = await engine.execute({
              tool: "run_command",
              args: { command: "npm run build --if-present && npm run test --if-present" }
            });
            const v_res_str = typeof verify_result === "string" ? verify_result : JSON.stringify(verify_result);
            messages.push({
              role: "system",
              content: `[Workflow Auto-Verification] Triggered build/test after file edit:\n${v_res_str}\n\nState is now Verification.`
            });
          }
        }

        continue;
      } else {
        if (workflow.getCurrentState() !== "Summary" && no_tool_retry_count < 3) {
          no_tool_retry_count++;
          messages.push(assistant_message);
          messages.push({
            role: "system",
            content: "You outputted text without calling a tool, but the workflow is not in the Summary state. You MUST output a tool call to continue investigating or executing. If you are finished with the task, output [TOOL CALL]: finish()"
          });
          onToken(`\n\x1b[33m⚠ Agent forgot to call a tool. Retrying...\x1b[0m\n`);
          continue;
        }
        workflow.transition("Summary");
        messages.push(assistant_message);
        return {
          content,
          messages
        };
      }
    }
  }

}

export const tools_router = new tool_router();

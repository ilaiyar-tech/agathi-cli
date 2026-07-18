import { router as model_router } from "../router/index.js";
import { registry } from "../tools/index.js";
import { engine } from "../execution_engine/index.js";
import axios from "axios";
import { workflow } from "./workflow_manager.js";
import { validator } from "../validation_engine/index.js";

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
    const executedTools = new Set<string>();

    if (messages.length > 0 && messages[0].role === "system") {
      messages[0].content += "\n\n" + workflow.getSystemPromptExtension();
    } else {
      messages.unshift({ role: "system", content: workflow.getSystemPromptExtension() });
    }

    while (true) {
      const payload: any = {
        messages,
        temperature: 0.1,
        frequency_penalty: 0.5,
        repeat_penalty: 1.1
      };

      if (tools.length > 0 && workflow.getCurrentState() !== "Summary") {
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
          parseCustomToolCalls(message);
        }
      }

      messages.push(message);

      if (message.tool_calls && message.tool_calls.length > 0) {
        for (const tc of message.tool_calls) {
          const function_name = tc.function.name;
          const function_args = JSON.parse(tc.function.arguments || "{}");

          const toolSignature = `${function_name}:${JSON.stringify(function_args)}`;
          if (executedTools.has(toolSignature) && function_name !== "finish") {
            workflow.transition("Summary");
            messages.push({
              role: "system",
              content: `STOPPING DECISION: Tool '${function_name}' called with identical arguments. Action aborted to prevent execution loop. Transitioning to Summary.`
            });
            continue;
          }
          executedTools.add(toolSignature);

          if (function_name === "finish") {
            workflow.transition("Summary");
            if (messages.length > 0 && messages[0].role === "system") {
              const extIndex = messages[0].content.indexOf("CRITICAL WORKFLOW PIPELINE INSTRUCTIONS:");
              if (extIndex !== -1) {
                messages[0].content = messages[0].content.slice(0, extIndex) + workflow.getSystemPromptExtension();
              } else {
                messages[0].content += "\n\n" + workflow.getSystemPromptExtension();
              }
            }
            messages.push({
              role: "tool",
              tool_call_id: tc.id,
              name: function_name,
              content: "{\"success\":true,\"state\":\"Summary\"}"
            });
            continue;
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
            const verify_result = await validator.verifyAll(process.cwd());
            messages.push({
              role: "system",
              content: `[Workflow Auto-Verification] Triggered build/test/lint after file edit:\n${JSON.stringify(verify_result, null, 2)}\n\nState is now Verification.`
            });
          }
        }
      } else {
        const currentState = workflow.getCurrentState();
        if (currentState !== "Summary" && currentState !== "Verification" && no_tool_retry_count < 3) {
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
    const executedTools = new Set<string>();

    if (messages.length > 0 && messages[0].role === "system") {
      messages[0].content += "\n\n" + workflow.getSystemPromptExtension();
    } else {
      messages.unshift({ role: "system", content: workflow.getSystemPromptExtension() });
    }

    while (true) {
      const payload: any = {
        messages,
        temperature: 0.1,
        frequency_penalty: 0.5,
        repeat_penalty: 1.1,
        stream: true
      };

      if (tools.length > 0 && workflow.getCurrentState() !== "Summary") {
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
      let streamBuffer = "";

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
                streamBuffer += delta.content;
                if (streamBuffer.includes("\n")) {
                  const parts = streamBuffer.split("\n");
                  streamBuffer = parts.pop() ?? "";
                  for (const part of parts) {
                    if (filterStreamLine(part) !== null) {
                      onToken(part + "\n");
                    }
                  }
                }
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
 
        response.data.on("end", () => {
          if (streamBuffer && filterStreamLine(streamBuffer) !== null) {
            onToken(streamBuffer);
          }
          resolve();
        });
        response.data.on("error", (err: any) => reject(err));
      });

      const dummyMessage = { content, tool_calls: undefined as any };
      parseCustomToolCalls(dummyMessage);
      if (dummyMessage.tool_calls && dummyMessage.tool_calls.length > 0) {
        has_tool_calls = true;
        tool_calls_map[0] = dummyMessage.tool_calls[0];
        content = dummyMessage.content;
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

          const toolSignature = `${name}:${JSON.stringify(args)}`;
          if (executedTools.has(toolSignature) && name !== "finish") {
            workflow.transition("Summary");
            messages.push({
              role: "system",
              content: `STOPPING DECISION: Tool '${name}' called with identical arguments. Action aborted to prevent execution loop. Transitioning to Summary.`
            });
            continue;
          }
          executedTools.add(toolSignature);

          if (name === "finish") {
            workflow.transition("Summary");
            if (messages.length > 0 && messages[0].role === "system") {
              const extIndex = messages[0].content.indexOf("CRITICAL WORKFLOW PIPELINE INSTRUCTIONS:");
              if (extIndex !== -1) {
                messages[0].content = messages[0].content.slice(0, extIndex) + workflow.getSystemPromptExtension();
              } else {
                messages[0].content += "\n\n" + workflow.getSystemPromptExtension();
              }
            }
            messages.push({
              role: "tool",
              tool_call_id: tc.id,
              name: name,
              content: "{\"success\":true,\"state\":\"Summary\"}"
            });
            continue;
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
            const verify_result = await validator.verifyAll(process.cwd());
            const v_res_str = JSON.stringify(verify_result, null, 2);
            messages.push({
              role: "system",
              content: `[Workflow Auto-Verification] Triggered build/test/lint after file edit:\n${v_res_str}\n\nState is now Verification.`
            });
          }
        }

        continue;
      } else {
        const currentState = workflow.getCurrentState();
        if (currentState !== "Summary" && currentState !== "Verification" && no_tool_retry_count < 3) {
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

function filterStreamLine(text: string): string | null {
  if (text.includes("[TOOL CALL]")) return null;
  if (text.includes("<function-call>")) return null;
  if (text.includes("</function-call>")) return null;
  // If it's a raw JSON dump for tools, hide it
  if (text.trim().startsWith('{"name"') || text.trim().startsWith('{"command"')) return null;
  return text;
}

function extractParenthesisContent(str: string, startIdx: number): string | null {
  let parenCount = 0;
  for (let i = startIdx; i < str.length; i++) {
    if (str[i] === "(") parenCount++;
    else if (str[i] === ")") {
      parenCount--;
      if (parenCount === 0) {
        return str.slice(startIdx + 1, i);
      }
    }
  }
  return null;
}

function extractJson(str: string): string | null {
  const startIdx = str.indexOf("{");
  if (startIdx === -1) return null;

  let braceCount = 0;
  for (let i = startIdx; i < str.length; i++) {
    if (str[i] === "{") braceCount++;
    else if (str[i] === "}") {
      braceCount--;
      if (braceCount === 0) {
        return str.slice(startIdx, i + 1);
      }
    }
  }
  return null;
}

function parseCustomToolCalls(msg: any) {
  const content = msg.content;
  if (!content) return;

  // 1. Check for <function-call>
  const funcMatch = content.match(/<function-call>([\s\S]*?)<\/function-call>/);
  if (funcMatch) {
    try {
      const parsed = JSON.parse(funcMatch[1]);
      msg.tool_calls = [{
        id: `call_${Date.now()}`,
        type: "function",
        function: {
          name: parsed.name,
          arguments: typeof parsed.arguments === "string" ? parsed.arguments : JSON.stringify(parsed.arguments)
        }
      }];
      msg.content = content.replace(funcMatch[0], "").trim();
      return;
    } catch (e) {}
  }

  // 2. Check for [TOOL CALL]: name(args)
  const toolCallPrefix = "[TOOL CALL]:";
  const startIdx = content.indexOf(toolCallPrefix);
  if (startIdx !== -1) {
    const openParenIdx = content.indexOf("(", startIdx);
    if (openParenIdx !== -1) {
      const name = content.slice(startIdx + toolCallPrefix.length, openParenIdx).trim();
      const argsStr = extractParenthesisContent(content, openParenIdx);
      if (argsStr !== null && name) {
        msg.tool_calls = [{
          id: `call_${Date.now()}`,
          type: "function",
          function: {
            name,
            arguments: argsStr
          }
        }];
        const fullCallString = content.slice(startIdx, content.indexOf(")", openParenIdx + argsStr.length) + 1);
        msg.content = content.replace(fullCallString, "").trim();
        return;
      }
    }
  }

  // 3. Check for JSON block
  const jsonStr = extractJson(content);
  if (jsonStr) {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.name && parsed.arguments) {
        msg.tool_calls = [{
          id: `call_${Date.now()}`,
          type: "function",
          function: {
            name: parsed.name,
            arguments: typeof parsed.arguments === "string" ? parsed.arguments : JSON.stringify(parsed.arguments)
          }
        }];
        msg.content = content.replace(jsonStr, "").trim();
        return;
      }
    } catch (e) {
      // Fallback: parse using string/regex extraction if JSON.parse fails due to unescaped quotes
      const nameMatch = jsonStr.match(/"name"\s*:\s*"([a-zA-Z0-9_]+)"/);
      if (nameMatch) {
        const name = nameMatch[1];
        const argsMatch = jsonStr.match(/"arguments"\s*:\s*(\{[\s\S]*\})/);
        if (argsMatch) {
          const argsContent = argsMatch[1];
          const cmdMatch = argsContent.match(/"command"\s*:\s*"([\s\S]*?)"\s*}/) || argsContent.match(/"command"\s*:\s*"([\s\S]*)"/);
          const pathMatch = argsContent.match(/"path"\s*:\s*"([\s\S]*?)"/);
          const contentMatch = argsContent.match(/"content"\s*:\s*"([\s\S]*?)"/);
          
          let parsedArgs: any = {};
          if (cmdMatch) parsedArgs.command = cmdMatch[1];
          if (pathMatch) parsedArgs.path = pathMatch[1];
          if (contentMatch) parsedArgs.content = contentMatch[1];
          
          if (Object.keys(parsedArgs).length > 0) {
            msg.tool_calls = [{
              id: `call_${Date.now()}`,
              type: "function",
              function: {
                name,
                arguments: JSON.stringify(parsedArgs)
              }
            }];
            msg.content = content.replace(jsonStr, "").trim();
            return;
          }
        }
      }
    }
  }
}

import { router as model_router, postModelRequest } from "../router/index.js";
import { registry } from "../tools/index.js";
import { engine } from "../execution_engine/index.js";
import axios from "axios";
import { workflow } from "./workflow_manager.js";
import { validator } from "../validation_engine/index.js";
import { ContextOS } from "../context_engine/index.js";
import { eventBus } from "../core/event_bus.js";
import { Transcoder } from "../transcoder/transcoder.js";

function safeParseJson(jsonStr: string): any {
  const clean = (jsonStr || "").trim();
  if (!clean) return {};
  try {
    return JSON.parse(clean);
  } catch (e) {
    try {
      const repaired = Transcoder.jsonRepair(clean);
      return JSON.parse(repaired);
    } catch (err) {
      const obj: any = {};
      try {
        const keyValPairs = clean.match(/"\w+"\s*:\s*(?:"[^"]*"|\d+|true|false|null|\[[^\]]*\]|\{[^\}]*\})/g);
        if (keyValPairs) {
          for (const pair of keyValPairs) {
            const splitIdx = pair.indexOf(":");
            if (splitIdx !== -1) {
              const k = pair.substring(0, splitIdx).replace(/"/g, "").trim();
              let v = pair.substring(splitIdx + 1).trim();
              if (v.startsWith('"') && v.endsWith('"')) {
                v = v.substring(1, v.length - 1);
              } else if (v === "true") {
                v = true as any;
              } else if (v === "false") {
                v = false as any;
              } else if (v === "null") {
                v = null as any;
              } else if (!isNaN(Number(v))) {
                v = Number(v) as any;
              }
              obj[k] = v;
            }
          }
        }
      } catch (regexErr) {}
      return obj;
    }
  }
}

export interface ToolRouterOptions {
  model?: string;
  messages: any[];
  signal?: AbortSignal;
  contextId?: string;
  sessionId?: string;
  executionId?: string;
}

export class tool_router {

  async chat(options: ToolRouterOptions) {
    if (options.model === "chat") {
      workflow.transition("Summary");
    } else {
      workflow.transition("Task");
    }
    let no_tool_retry_count = 0;
    let toolsExecutedCount = 0;
    const messages = [...options.messages];
    const tools = registry.getDefinitions();
    const executedTools = new Set<string>();

    if (messages.length > 0 && messages[0].role === "system") {
      messages[0].content += "\n\n" + workflow.getSystemPromptExtension();
    } else {
      messages.unshift({ role: "system", content: workflow.getSystemPromptExtension() });
    }

    const MAX_ITERATIONS = 20;
    let iteration = 0;

    while (true) {
      if (iteration++ >= MAX_ITERATIONS) {
        workflow.transition("Summary");
        messages.push({
          role: "system",
          content: `ITERATION LIMIT EXCEEDED: Reached maximum number of tool calls (${MAX_ITERATIONS}). Transitioning to Summary to prevent recursion loops.`
        });
        break;
      }

      const payload: any = {
        messages,
        temperature: 0.1,
        frequency_penalty: 0.5,
        repeat_penalty: 1.1
      };

      if (tools.length > 0 && workflow.getCurrentState() !== "Summary") {
        payload.tools = tools;
      }

      const response = await postModelRequest(
        "/v1/chat/completions",
        payload,
        { 
          headers: { "Connection": "close" },
          signal: options.signal
        }
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
          const function_args = safeParseJson(tc.function.arguments || "{}");

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

          const startTime = Date.now();
          const result = await engine.execute({
            tool: function_name,
            args: function_args
          });
          if (result && result.success) {
            toolsExecutedCount++;
          }
          const durationMs = Date.now() - startTime;

          // Record execution in ContextOS database
          if (options.contextId && options.executionId && options.sessionId) {
            try {
              ContextOS.tools.recordToolExecution({
                contextId: options.contextId,
                executionId: options.executionId,
                sessionId: options.sessionId,
                toolName: function_name,
                args: function_args,
                output: typeof result.output === "string" ? result.output : JSON.stringify(result.output),
                success: result.success,
                durationMs
              });
            } catch (err) {}
          }

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
          messages,
          toolsExecutedCount
        };
      }
    }
  }

  async chat_stream(
    options: { 
      messages: any[], 
      model?: string, 
      signal?: AbortSignal,
      contextId?: string,
      sessionId?: string,
      executionId?: string
    },
    onToken: (token: string) => void
  ) {
    if (options.model === "chat") {
      workflow.transition("Summary");
    } else {
      workflow.transition("Task");
    }
    let no_tool_retry_count = 0;
    let toolsExecutedCount = 0;
    const messages = [...options.messages];
    const tools = registry.getDefinitions();
    const executedTools = new Set<string>();

    if (messages.length > 0 && messages[0].role === "system") {
      messages[0].content += "\n\n" + workflow.getSystemPromptExtension();
    } else {
      messages.unshift({ role: "system", content: workflow.getSystemPromptExtension() });
    }

    const MAX_ITERATIONS = 20;
    let iteration = 0;

    while (true) {
      if (iteration++ >= MAX_ITERATIONS) {
        workflow.transition("Summary");
        messages.push({
          role: "system",
          content: `ITERATION LIMIT EXCEEDED: Reached maximum number of tool calls (${MAX_ITERATIONS}). Transitioning to Summary to prevent recursion loops.`
        });
        break;
      }

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

      const response = await postModelRequest(
        "/v1/chat/completions",
        payload,
        { 
          responseType: "stream",
          headers: { "Connection": "close" },
          signal: options.signal
        }
      );

      let content = "";
      let tool_calls_map: any = {};
      let has_tool_calls = false;
      let streamBuffer = "";

      let aborted = false;
      const onAbort = () => {
        aborted = true;
        try {
          response.data.destroy();
        } catch (e) {}
      };
      if (options.signal) {
        options.signal.addEventListener("abort", onAbort);
      }

      try {
        await new Promise<void>((resolve, reject) => {
          let buffer = "";
          response.data.on("data", (chunk: Buffer) => {
            if (aborted) return;
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
                  if (workflow.getCurrentState() === "Summary") {
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
            if (aborted) {
              reject(new Error("Stream aborted"));
              return;
            }
            if (workflow.getCurrentState() === "Summary") {
              if (streamBuffer && filterStreamLine(streamBuffer) !== null) {
                onToken(streamBuffer);
              }
            }
            resolve();
          });
          response.data.on("error", (err: any) => reject(err));
        });
      } finally {
        if (options.signal) {
          options.signal.removeEventListener("abort", onAbort);
        }
      }

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
            args = safeParseJson(args_str || "{}");
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

          let stageMsg = `Executing ${name}...`;
          if (name === "run_command") {
            const cmd = String(args.command || "");
            stageMsg = cmd.includes("python") ? "Running Python..." : "Running Bash...";
          } else if (name === "read_file" || name === "view_file") {
            stageMsg = "Reading file...";
          } else if (name === "write_file" || name === "write_to_file") {
            stageMsg = "Writing file...";
          } else if (name === "replace_file_content" || name === "multi_replace_file_content") {
            stageMsg = "Updating file...";
          } else if (name === "search_files" || name === "grep_search") {
            stageMsg = "Searching files...";
          } else if (name === "generate_image" || name === "draw_image") {
            stageMsg = "Generating image...";
          } else if (name.startsWith("browser_") || name.includes("page")) {
            stageMsg = "Loading page...";
          } else if (name === "whatsapp") {
            stageMsg = "Sending alert...";
          }

          const progressListener = (event: any) => {
            if (event.type === "TOOL_PROGRESS" && onToken) {
              try {
                onToken(JSON.stringify({
                  type: "progress",
                  tool: name,
                  stage: event.payload.stage,
                  percent: event.payload.percent,
                  status: event.payload.status || "running"
                }));
              } catch (err) {}
            }
          };

          eventBus.on("TOOL_PROGRESS", progressListener);

          if (onToken) {
            onToken(JSON.stringify({
              type: "progress",
              tool: name,
              stage: stageMsg,
              status: "running"
            }));
          }

          const startTime = Date.now();
          let result: any;
          try {
            result = await engine.execute({
              tool: name,
              args
            });
            if (result && result.success) {
              toolsExecutedCount++;
            }
          } finally {
            eventBus.off("TOOL_PROGRESS", progressListener);
          }
          const durationMs = Date.now() - startTime;

          // Record execution in ContextOS database
          if (options.contextId && options.executionId && options.sessionId) {
            try {
              ContextOS.tools.recordToolExecution({
                contextId: options.contextId,
                executionId: options.executionId,
                sessionId: options.sessionId,
                toolName: name,
                args,
                output: typeof result.output === "string" ? result.output : JSON.stringify(result.output),
                success: result.success,
                durationMs
              });
            } catch (err) {}
          }

          const result_str = typeof result === "string" ? result : JSON.stringify(result);

          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            name: name,
            content: result_str
          });

          if (["write_file", "replace_file_content", "multi_replace_file_content", "edit_file", "patch_file"].includes(name)) {
            workflow.transition("Verification");
            if (onToken) {
              onToken(JSON.stringify({
                type: "progress",
                tool: name,
                stage: "Verifying changes...",
                status: "running"
              }));
            }
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
          messages,
          toolsExecutedCount
        };
      }
    }
  }

}

export const tools_router = new tool_router();

function filterStreamLine(text: string): string | null {
  const lower = text.toLowerCase();
  if (lower.includes("[tool call]")) return null;
  if (lower.includes("tool call")) return null;
  if (lower.includes("<function-call>")) return null;
  if (lower.includes("</function-call>")) return null;
  if (lower.includes("<tool_") || lower.includes("</tool_")) return null;
  if (lower.includes("tool_call") || lower.includes("function_call")) return null;
  if (lower.includes("finish(") || lower.includes("finish{")) return null;
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

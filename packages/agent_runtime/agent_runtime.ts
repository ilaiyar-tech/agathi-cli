import crypto from "node:crypto";
import { execSync } from "node:child_process";
import { router } from "../router/index.js";
import { tools_router } from "../tool_router/index.js";
import { planner, Message } from "../prompt_planner/index.js";
import { system_prompt } from "../prompts/system_prompt.js";
import { registry } from "../tools/index.js";
import { ContextOS } from "../context_engine/index.js";
import { WorkspaceChunk } from "../context/context_interfaces.js";
import { IntentAnalyzer, intentEngine } from "../prompt_intelligence/index.js";
import { executionManager } from "../execution_layer/index.js";
import { RuntimeTelemetry } from "./runtime_telemetry.js";
import { logger } from "../logger/index.js";

export interface ExecutionProfile {
  intent: string;
  tools: string[];
  llm: string;
  stream: boolean;
  workspace: boolean;
}

const EXECUTION_PROFILES: Record<string, ExecutionProfile> = {
  chat: {
    intent: "chat",
    tools: [],
    llm: "chat",
    stream: true,
    workspace: false
  },
  file_analysis: {
    intent: "file_analysis",
    tools: ["search_files", "read_file"],
    llm: "coder_pro",
    stream: true,
    workspace: true
  },
  git: {
    intent: "git",
    tools: ["git_status", "git_log"],
    llm: "coder_pro",
    stream: true,
    workspace: true
  },
  terminal: {
    intent: "terminal",
    tools: ["run_command"],
    llm: "coder_pro",
    stream: true,
    workspace: true
  },
  investigation: {
    intent: "investigation",
    tools: ["search_files", "read_file", "run_command"],
    llm: "coder_pro",
    stream: true,
    workspace: true
  }
};

function detectProfile(prompt: string): ExecutionProfile {
  const p = prompt.toLowerCase();
  if (p.includes("browser") || p.includes("google") || p.includes("bing") || p.includes("web") || p.includes("http") || p.includes("url")) {
    return EXECUTION_PROFILES.chat;
  }
  if (
    p.includes("check the files") ||
    p.includes("search files") ||
    p.includes("find in codebase") ||
    p.includes("look for files") ||
    p.includes("find references") ||
    p.includes("search for") ||
    p.includes("locate files")
  ) {
    return EXECUTION_PROFILES.file_analysis;
  }
  if (p.includes("git status") || p.includes("git commit") || p.includes("git log") || p.includes("git diff")) {
    return EXECUTION_PROFILES.git;
  }
  if (p.includes("run command") || p.includes("execute bash") || p.includes("npm run") || p.includes("npm install")) {
    return EXECUTION_PROFILES.terminal;
  }
  const inv = ["why", "how", "trace", "find", "investigate", "diagnose", "check", "analyze", "where", "who started"];
  if (inv.some(keyword => p.includes(keyword))) {
    return EXECUTION_PROFILES.investigation;
  }
  return EXECUTION_PROFILES.chat;
}

function getWorkspaceGitStatus(): string {
  try {
    return execSync("git status --porcelain", { encoding: "utf8", timeout: 2000 }).trim();
  } catch (e) {
    return "";
  }
}

function getExecutionGraphForIntent(intent: string): string {
  switch (intent) {
    case "Website Generation":
      return "Create Workspace ➔ Generate Files ➔ Verify Files ➔ Completed";
    case "File Generation":
      return "Plan File Layout ➔ Write File ➔ Lint Check ➔ Completed";
    case "Coding":
      return "Analyze Requirements ➔ Implement Changes ➔ Run Tests ➔ Completed";
    case "Python":
    case "Bash":
      return "Formulate Shell Command ➔ Execute Process ➔ Verify Exit Code ➔ Completed";
    case "Image Generation":
      return "Construct Image Prompt ➔ Call Image Tool ➔ Verify Output ➔ Completed";
    case "Browser":
    case "Search":
      return "Initialize Browser Session ➔ Query Web Page ➔ Extract Text ➔ Completed";
    default:
      return "Plan Steps ➔ Run Tools ➔ Confirm Changes ➔ Completed";
  }
}

function verifyExecutionSuccess(intent: string, toolsCount: number, filesModified: boolean): boolean {
  if (["Website Generation", "File Generation", "Workspace Generation"].includes(intent)) {
    return filesModified && toolsCount > 0;
  }
  return toolsCount > 0;
}

function sanitizeContent(content: string): string {
  let clean = content;
  clean = clean.replace(/\[TOOL CALL\]:?\s*\w+\([\s\S]*?\)/gi, "");
  clean = clean.replace(/finish\(\{\}\)/gi, "");
  clean = clean.replace(/Summary\s*$/i, "");
  return clean.trim();
}

function cleanKeyword(raw: string): string {
  let cleaned = raw.replace(/[?.!]+/g, "").trim();
  const splitters = [" used in ", " in ", " for ", " that ", " which is "];
  for (const splitter of splitters) {
    if (cleaned.toLowerCase().includes(splitter)) {
      cleaned = cleaned.split(new RegExp(splitter, "i"))[0].trim();
    }
  }
  return cleaned;
}

async function runFileAnalysisPipeline(prompt: string, contextId: string): Promise<string> {
  const match = prompt.match(/(?:check the files for|search for|find|look for|check files containing|about|locate)\s+(.+)/i);
  const rawKeyword = match ? match[1].trim() : prompt.trim();
  const keyword = cleanKeyword(rawKeyword);

  const searchHandler = registry.get("search_files")?.handler;
  const readHandler = registry.get("read_file")?.handler;

  if (!searchHandler || !readHandler) return "";

  try {
    const filePaths = await searchHandler({ keyword });
    if (Array.isArray(filePaths) && filePaths.length > 0) {
      let contextData = `### File Context Gathered for keyword: "${keyword}"\n`;
      const limitPaths = filePaths.slice(0, 3);
      for (const filePath of limitPaths) {
        try {
          const content = await readHandler({ path: filePath });
          ContextOS.workspace.indexFile(contextId, {
            path: filePath,
            content,
            indexedBy: "file_analysis_pipeline"
          });

          let safeContent = content;
          if (content.length > 524288) {
            safeContent = content.slice(0, 524288) + "\n... [Content truncated (exceeded 512KB size limit)]";
          }
          const lines = safeContent.split("\n").map((line: string, idx: number) => `${idx + 1}: ${line}`).join("\n");
          contextData += `\n--- File: ${filePath} ---\n${lines}\n`;
        } catch (e) {}
      }
      return contextData;
    }
  } catch (e) {}
  return "";
}

export class agent_runtime {

  async chat(
    prompt: string,
    session_id: string = "default"
  ) {
    const contextId = `ctx-${session_id}`;
    const executionId = `exec-${crypto.randomUUID()}`;
    const session = executionManager.startSession(executionId);

    const startTime = Date.now();
    let plannerStartTime = 0;
    let plannerEndTime = 0;
    let toolStartTime = 0;
    let toolEndTime = 0;
    let verifyStartTime = 0;
    let verifyEndTime = 0;
    let failures = 0;
    let retries = 0;
    let timeouts = 0;

    logger.info({
      event: "execution_start",
      sessionId: session_id,
      executionId,
      prompt
    }, `Starting execution ${executionId} for session ${session_id}`);

    (ContextOS.sessions as any).createSession(session_id, contextId);

    const intentResult = intentEngine.classify(prompt);
    const requiresExecution = [
      "Workspace Generation",
      "File Generation",
      "Coding",
      "Website Generation",
      "Image Generation",
      "Python",
      "Bash",
      "Tool Execution",
      "Git"
    ].includes(intentResult.intent);

    if (!requiresExecution) {
      executionManager.transition(executionId, "Planning");
      const model = router.detect_model(prompt);
      await router.ensure(model);

      const promptCtx = await ContextOS.prompts.build({
        contextId,
        sessionId: session_id,
        executionId,
        userPrompt: prompt,
        tokenBudget: 4000
      });

      const historical_messages: Message[] = [];
      for (const m of promptCtx.conversation) {
        if (m.role === "system" || m.role === "user" || m.role === "assistant") {
          historical_messages.push({
            role: m.role,
            content: m.content
          });
        }
      }

      const messages = [
        { role: "system", content: "You are tu2pu, a helpful and premium AI coding and development collaborator. You are bilingual and fluent in English, Tamil, and Tanglish (Tamil written in English script). If the user chats in casual Tanglish (e.g., 'enna da', 'enna pandra', 'eppadi irukeenga', 'machan', 'nallarukan', 'saptiya'), respond naturally, warm, and concisely in matching friendly Tanglish (e.g., 'naan nalla iruken machan, neenga eppadi irukeenga?'). Never treat Tamil/Tanglish words as spelling errors or typos. Respond naturally and concisely without calling tools or generating plans." },
        ...historical_messages,
        { role: "user", content: prompt }
      ];

      const response = await router.chat_model(model, messages);
      executionManager.transition(executionId, "Completed");
      
      RuntimeTelemetry.record({
        sessionId: session_id,
        intent: intentResult.intent,
        executionDurationMs: Date.now() - startTime,
        plannerDurationMs: 0,
        toolDurationMs: 0,
        verificationDurationMs: 0,
        failures: 0,
        retries: 0,
        cancellations: 0,
        timeouts: 0,
        success: true
      });

      return { id: executionId, session_id, content: response.content };
    }

    const initialGitStatus = getWorkspaceGitStatus();

    // Construct PromptContext using Builder
    const promptCtx = await ContextOS.prompts.build({
      contextId,
      sessionId: session_id,
      executionId,
      userPrompt: prompt,
      tokenBudget: 4000
    });

    const historical_messages: Message[] = [];
    for (const m of promptCtx.conversation) {
      if (m.role === "system" || m.role === "user" || m.role === "assistant") {
        historical_messages.push({
          role: m.role,
          content: m.content
        });
      }
    }

    const profile = detectProfile(prompt);
    executionManager.transition(executionId, "Planning");
    plannerStartTime = Date.now();

    if (profile.intent === "file_analysis") {
      const contextData = await runFileAnalysisPipeline(prompt, contextId);
      if (contextData) {
        const messages = [
          { role: "system", content: "You are tu2pu, an advanced workspace reasoning engine. You MUST provide structured source attribution in your response. Cite the specific file names and line ranges (e.g. Lines 42-118) for all code snippets, imports, or logic details you mention." },
          ...historical_messages,
          { role: "user", content: `${contextData}\n\nUser query: ${prompt}` }
        ];
        await router.ensure(profile.llm);
        const response = await router.coder(messages);
        
        executionManager.transition(executionId, "Completed");
        return { id: executionId, session_id, content: response.content };
      }
    }

    const session_context = await (ContextOS as any).prompts.collector.collect({
      contextId,
      sessionId: session_id,
      executionId,
      userPrompt: prompt
    });

    const session_context_str = session_context.workspace.map((w: WorkspaceChunk) => `File: ${w.path}\n${w.content}`).join("\n");
    plannerEndTime = Date.now();

    let validator_retries = 0;
    let extraSystemInstruction = "";

    while (validator_retries < 3) {
      executionManager.transition(executionId, "Planning");
      const messages = planner.plan({
        system_prompt: system_prompt + (extraSystemInstruction ? "\n\n" + extraSystemInstruction : ""),
        history: historical_messages,
        context: [session_context_str],
        user_prompt: prompt,
        intentInfo: {
          intent: intentResult.intent,
          confidence: intentResult.confidence,
          requiredCapabilities: intentResult.requiredCapabilities,
          requiredTools: intentResult.requiredTools
        }
      });

      const model = router.detect_model(prompt);
      await router.ensure(model);

      executionManager.transition(executionId, "Executing");
      toolStartTime = Date.now();
      const response = await tools_router.chat({ 
        messages, 
        model,
        contextId,
        sessionId: session_id,
        executionId
      });
      toolEndTime = Date.now();

      if (response && (response as any).timeoutOccurred) {
        timeouts++;
        executionManager.recordTimeout(executionId);
      }

      // Verification
      executionManager.transition(executionId, "Verifying");
      verifyStartTime = Date.now();

      const toolsExecutedCount = (response as any).toolsExecutedCount || 0;
      const finalGitStatus = getWorkspaceGitStatus();
      const filesModified = finalGitStatus !== initialGitStatus;

      const verificationPassed = verifyExecutionSuccess(intentResult.intent, toolsExecutedCount, filesModified);
      verifyEndTime = Date.now();

      if (!verificationPassed) {
        validator_retries++;
        retries++;
        failures++;
        executionManager.recordRetry(executionId);
        extraSystemInstruction = `CRITICAL VALIDATION FAILURE: You attempted to answer without producing any file changes or successfully executing action tools. The user requested: '${intentResult.intent}'. You MUST use specific tools (like write_file, replace_file_content, run_command) to execute this task. Direct textual responses are rejected.`;
        continue;
      }

      executionManager.transition(executionId, "Completed");
      
      RuntimeTelemetry.record({
        sessionId: session_id,
        intent: intentResult.intent,
        executionDurationMs: Date.now() - startTime,
        plannerDurationMs: plannerEndTime - plannerStartTime,
        toolDurationMs: toolEndTime - toolStartTime,
        verificationDurationMs: verifyEndTime - verifyStartTime,
        failures,
        retries,
        cancellations: 0,
        timeouts,
        success: true
      });

      const filteredContent = sanitizeContent(response?.content || "");

      return {
        id: executionId,
        session_id,
        content: filteredContent
      };
    }

    executionManager.transition(executionId, "Failed");

    RuntimeTelemetry.record({
      sessionId: session_id,
      intent: intentResult.intent,
      executionDurationMs: Date.now() - startTime,
      plannerDurationMs: plannerEndTime - plannerStartTime,
      toolDurationMs: toolEndTime - toolStartTime,
      verificationDurationMs: verifyEndTime - verifyStartTime,
      failures,
      retries,
      cancellations: 0,
      timeouts,
      success: false
    });

    return {
      id: executionId,
      session_id,
      content: "Failed to verify workspace action execution. Please try again with a more specific prompt."
    };
  }

  async chat_stream(
    prompt: string,
    session_id: string = "default",
    onToken: (token: string) => void
  ) {
    const contextId = `ctx-${session_id}`;
    const executionId = `exec-${crypto.randomUUID()}`;
    const session = executionManager.startSession(executionId);

    const startTime = Date.now();
    let plannerStartTime = 0;
    let plannerEndTime = 0;
    let toolStartTime = 0;
    let toolEndTime = 0;
    let verifyStartTime = 0;
    let verifyEndTime = 0;
    let failures = 0;
    let retries = 0;
    let timeouts = 0;

    logger.info({
      event: "execution_stream_start",
      sessionId: session_id,
      executionId,
      prompt
    }, `Starting streaming execution ${executionId} for session ${session_id}`);

    const intentResult = intentEngine.classify(prompt);
    const requiresExecution = [
      "Workspace Generation",
      "File Generation",
      "Coding",
      "Website Generation",
      "Image Generation",
      "Python",
      "Bash",
      "Tool Execution",
      "Git"
    ].includes(intentResult.intent);

    if (!requiresExecution) {
      executionManager.transition(executionId, "Planning");
      const model = router.detect_model(prompt);
      await router.ensure(model);

      const promptCtx = await ContextOS.prompts.build({
        contextId,
        sessionId: session_id,
        executionId,
        userPrompt: prompt,
        tokenBudget: 4000
      });

      const historical_messages: Message[] = [];
      for (const m of promptCtx.conversation) {
        if (m.role === "system" || m.role === "user" || m.role === "assistant") {
          historical_messages.push({
            role: m.role,
            content: m.content
          });
        }
      }

      const messages = [
        { role: "system", content: "You are tu2pu, a helpful and premium AI coding and development collaborator. You are bilingual and fluent in English, Tamil, and Tanglish (Tamil written in English script). If the user chats in casual Tanglish (e.g., 'enna da', 'enna pandra', 'eppadi irukeenga', 'machan', 'nallarukan', 'saptiya'), respond naturally, warm, and concisely in matching friendly Tanglish (e.g., 'naan nalla iruken machan, neenga eppadi irukeenga?'). Never treat Tamil/Tanglish words as spelling errors or typos. Respond naturally and concisely without calling tools or generating plans." },
        ...historical_messages,
        { role: "user", content: prompt }
      ];

      let content = "";
      await router.stream_model(model, messages, (token) => {
        content += token;
        onToken(token);
      });
      executionManager.transition(executionId, "Completed");
      
      RuntimeTelemetry.record({
        sessionId: session_id,
        intent: intentResult.intent,
        executionDurationMs: Date.now() - startTime,
        plannerDurationMs: 0,
        toolDurationMs: 0,
        verificationDurationMs: 0,
        failures: 0,
        retries: 0,
        cancellations: 0,
        timeouts: 0,
        success: true
      });

      return { id: executionId, session_id, content };
    }

    const initialGitStatus = getWorkspaceGitStatus();

    // Emit Planning Graph Progress Event
    const graphStr = getExecutionGraphForIntent(intentResult.intent);
    onToken(JSON.stringify({
      type: "progress",
      tool: "planner",
      stage: `Planning... Graph: ${graphStr}`,
      status: "running"
    }));

    const promptCtx = await ContextOS.prompts.build({
      contextId,
      sessionId: session_id,
      executionId,
      userPrompt: prompt,
      tokenBudget: 4000
    });

    const historical_messages: Message[] = [];
    for (const m of promptCtx.conversation) {
      if (m.role === "system" || m.role === "user" || m.role === "assistant") {
        historical_messages.push({
          role: m.role,
          content: m.content
        });
      }
    }

    const profile = detectProfile(prompt);
    executionManager.transition(executionId, "Planning");
    plannerStartTime = Date.now();

    if (profile.intent === "file_analysis") {
      const contextData = await runFileAnalysisPipeline(prompt, contextId);
      if (contextData) {
        onToken(`🔍 Pre-executing file search pipeline...\nFound matching context. Formulating summary response...\n\n`);
        const messages = [
          { role: "system", content: "You are tu2pu, an advanced workspace reasoning engine. You MUST provide structured source attribution in your response. Cite the specific file names and line ranges (e.g. Lines 42-118) for all code snippets, imports, or logic details you mention." },
          ...historical_messages,
          { role: "user", content: `${contextData}\n\nUser query: ${prompt}` }
        ];
        await router.ensure(profile.llm);
        const result = await tools_router.chat_stream({ messages, model: profile.llm }, onToken);
        
        executionManager.transition(executionId, "Completed");
        return { id: executionId, session_id, content: result?.content || "" };
      }
    }

    const session_context = await (ContextOS as any).prompts.collector.collect({
      contextId,
      sessionId: session_id,
      executionId,
      userPrompt: prompt
    });

    const session_context_str = session_context.workspace.map((w: WorkspaceChunk) => `File: ${w.path}\n${w.content}`).join("\n");
    plannerEndTime = Date.now();

    let validator_retries = 0;
    let extraSystemInstruction = "";

    while (validator_retries < 3) {
      executionManager.transition(executionId, "Planning");
      const messages = planner.plan({
        system_prompt: system_prompt + (extraSystemInstruction ? "\n\n" + extraSystemInstruction : ""),
        history: historical_messages,
        context: [session_context_str],
        user_prompt: prompt,
        intentInfo: {
          intent: intentResult.intent,
          confidence: intentResult.confidence,
          requiredCapabilities: intentResult.requiredCapabilities,
          requiredTools: intentResult.requiredTools
        }
      });

      const model = router.detect_model(prompt);
      await router.ensure(model);

      executionManager.transition(executionId, "Executing");
      toolStartTime = Date.now();
      const result = await tools_router.chat_stream({ 
        messages, 
        model,
        contextId,
        sessionId: session_id,
        executionId
      }, onToken);
      toolEndTime = Date.now();

      if (result && (result as any).timeoutOccurred) {
        timeouts++;
        executionManager.recordTimeout(executionId);
      }

      // Verification
      executionManager.transition(executionId, "Verifying");
      verifyStartTime = Date.now();

      const toolsExecutedCount = (result as any).toolsExecutedCount || 0;
      const finalGitStatus = getWorkspaceGitStatus();
      const filesModified = finalGitStatus !== initialGitStatus;

      const verificationPassed = verifyExecutionSuccess(intentResult.intent, toolsExecutedCount, filesModified);
      verifyEndTime = Date.now();

      if (!verificationPassed) {
        validator_retries++;
        retries++;
        failures++;
        executionManager.recordRetry(executionId);
        extraSystemInstruction = `CRITICAL VALIDATION FAILURE: You attempted to answer without producing any file changes or successfully executing action tools. You MUST use specific tools (like write_file, replace_file_content, run_command) to execute this task. Direct textual responses are rejected.`;
        onToken(JSON.stringify({
          type: "progress",
          tool: "verifier",
          stage: "Verification failed. Retrying execution graph...",
          status: "running"
        }));
        continue;
      }

      executionManager.transition(executionId, "Completed");
      
      RuntimeTelemetry.record({
        sessionId: session_id,
        intent: intentResult.intent,
        executionDurationMs: Date.now() - startTime,
        plannerDurationMs: plannerEndTime - plannerStartTime,
        toolDurationMs: toolEndTime - toolStartTime,
        verificationDurationMs: verifyEndTime - verifyStartTime,
        failures,
        retries,
        cancellations: 0,
        timeouts,
        success: true
      });

      const filteredContent = sanitizeContent(result?.content || "");

      return { id: executionId, session_id, content: filteredContent };
    }

    executionManager.transition(executionId, "Failed");

    RuntimeTelemetry.record({
      sessionId: session_id,
      intent: intentResult.intent,
      executionDurationMs: Date.now() - startTime,
      plannerDurationMs: plannerEndTime - plannerStartTime,
      toolDurationMs: toolEndTime - toolStartTime,
      verificationDurationMs: verifyEndTime - verifyStartTime,
      failures,
      retries,
      cancellations: 0,
      timeouts,
      success: false
    });

    return {
      id: executionId,
      session_id,
      content: "Failed to verify workspace action execution. Please try again with a more specific prompt."
    };
  }

}

export const runtime = new agent_runtime();

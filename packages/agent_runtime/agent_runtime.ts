import crypto from "node:crypto";
import { execSync } from "node:child_process";
import { router } from "../router/index.js";
import { tools_router } from "../tool_router/index.js";
import { planner, Message } from "../prompt_planner/index.js";
import { system_prompt } from "../prompts/system_prompt.js";
import { registry } from "../tools/index.js";
import { ContextOS } from "../context_engine/index.js";
import { WorkspaceChunk } from "../context/context_interfaces.js";
import { IntentAnalyzer } from "../prompt_intelligence/prompt_intelligence.js";
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

export function classifyIntent(prompt: string): string {
  const p = prompt.toLowerCase().trim();
  
  const greetings = [
    "hi", "hello", "hey", "hola", "yo", "sup", "what's up",
    "machan", "da", "bro", "enna da", "enna pandra", "nallarukan", "nalla iruken", "eppadi irukenga", "vanakkam"
  ];
  
  if (greetings.some(g => p === g || p.startsWith(g + " ") || p.endsWith(" " + g))) {
    return "Conversation";
  }
  
  if (p.length < 10 && !p.includes("run") && !p.includes("git") && !p.includes("code")) {
    return "Conversation";
  }

  if (p.includes("image") || p.includes("draw") || p.includes("picture") || p.includes("photo") || p.includes("illustration")) {
    return "Image Generation";
  }

  if (p.includes("browse") || p.includes("google") || p.includes("website text") || p.includes("page screenshot") || p.includes("url") || p.includes("open website")) {
    return "Browser";
  }

  if (p.includes("research") || p.includes("documentation") || p.includes("docs") || p.includes("search documentation")) {
    return "Research";
  }

  if (p.includes("python") || p.includes(".py") || p.includes("run script")) {
    return "Python";
  }

  if (p.includes("bash") || p.includes("run command") || p.includes("terminal") || p.includes("execute command")) {
    return "Bash";
  }

  const actionVerbs = ["create", "build", "generate", "write", "make", "setup", "initialize", "new file", "new website", "project"];
  if (actionVerbs.some(verb => p.includes(verb))) {
    return "Workspace Generation";
  }

  const codingKeywords = ["code", "function", "class", "refactor", "bug", "fix", "implementation", "compile", "lint", "syntax"];
  if (codingKeywords.some(kw => p.includes(kw))) {
    return "Coding";
  }

  const analyzer = new IntentAnalyzer();
  const classification = analyzer.classify(prompt);
  if (classification.category === "conversation") {
    return "Conversation";
  }

  return "Workspace Generation";
}

function getWorkspaceGitStatus(): string {
  try {
    return execSync("git status --porcelain", { encoding: "utf8", timeout: 2000 }).trim();
  } catch (e) {
    return "";
  }
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

    logger.info({
      event: "execution_start",
      sessionId: session_id,
      executionId,
      prompt
    }, `Starting execution ${executionId} for session ${session_id}`);

    ContextOS.state.startExecution(contextId, session_id, executionId);
    (ContextOS.sessions as any).createSession(session_id, contextId);

    const intent = classifyIntent(prompt);

    if (intent === "Conversation") {
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
        { role: "system", content: "You are tu2pu, a helpful and premium AI coding and development collaborator. You are bilingual and fluent in English, Tamil, and Tanglish (Tamil written in English script). If the user chats in casual Tanglish (e.g., 'enna pandra', 'eppadi irukeenga', 'machan'), respond naturally, warm, and concisely in matching friendly Tanglish (e.g., 'naan nalla iruken machan, neenga eppadi irukeenga?'). Never treat Tamil/Tanglish words as spelling errors or typos (never reply with 'Did you mean Pandora?'). Respond naturally and concisely without calling tools or generating plans." },
        ...historical_messages,
        { role: "user", content: prompt }
      ];

      const response = await router.chat_model(model, messages);
      ContextOS.state.complete();
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
    ContextOS.state.transition("Execution", "Triggering intent flow");

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
        
        ContextOS.state.complete();
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

    let validator_retries = 0;
    let extraSystemInstruction = "";

    while (validator_retries < 3) {
      const messages = planner.plan({
        system_prompt: system_prompt + (extraSystemInstruction ? "\n\n" + extraSystemInstruction : ""),
        history: historical_messages,
        context: [session_context_str],
        user_prompt: prompt
      });

      const model = router.detect_model(prompt);
      await router.ensure(model);

      ContextOS.state.transition("ToolExecution", `Running interactive tool selection loop (attempt ${validator_retries + 1})`);
      const response = await tools_router.chat({ 
        messages, 
        model,
        contextId,
        sessionId: session_id,
        executionId
      });

      const toolsExecutedCount = (response as any).toolsExecutedCount || 0;
      const isCreateOrGenerate = ["create", "build", "generate", "write", "make"].some(verb => prompt.toLowerCase().includes(verb));
      const finalGitStatus = getWorkspaceGitStatus();
      const filesModified = finalGitStatus !== initialGitStatus;

      if (isCreateOrGenerate && (toolsExecutedCount === 0 || (!filesModified && toolsExecutedCount <= 1))) {
        validator_retries++;
        extraSystemInstruction = `CRITICAL VALIDATION FAILURE: You attempted to answer without producing any file artifacts or modifications in the workspace. The user explicitly requested to '${intent}'. You MUST use specific tools (such as write_file or replace_file_content) to write the files or execute commands. Text-only explanations are rejected. You cannot complete the task without creating/modifying files.`;
        continue;
      }

      ContextOS.state.complete();
      logger.info({
        event: "execution_complete",
        sessionId: session_id,
        executionId
      }, `Completed execution ${executionId} for session ${session_id}`);
      return {
        id: executionId,
        session_id,
        content: response?.content || ""
      };
    }

    ContextOS.state.complete();
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

    logger.info({
      event: "execution_stream_start",
      sessionId: session_id,
      executionId,
      prompt
    }, `Starting streaming execution ${executionId} for session ${session_id}`);

    ContextOS.state.startExecution(contextId, session_id, executionId);

    const intent = classifyIntent(prompt);

    if (intent === "Conversation") {
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
        { role: "system", content: "You are tu2pu, a helpful and premium AI coding and development collaborator. You are bilingual and fluent in English, Tamil, and Tanglish (Tamil written in English script). If the user chats in casual Tanglish (e.g., 'enna pandra', 'eppadi irukeenga', 'machan'), respond naturally, warm, and concisely in matching friendly Tanglish (e.g., 'naan nalla iruken machan, neenga eppadi irukeenga?'). Never treat Tamil/Tanglish words as spelling errors or typos (never reply with 'Did you mean Pandora?'). Respond naturally and concisely without calling tools or generating plans." },
        ...historical_messages,
        { role: "user", content: prompt }
      ];

      let content = "";
      await router.stream_model(model, messages, (token) => {
        content += token;
        onToken(token);
      });
      ContextOS.state.complete();
      return { id: executionId, session_id, content };
    }

    const initialGitStatus = getWorkspaceGitStatus();

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
    ContextOS.state.transition("Execution", "Triggering intent stream");

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
        
        ContextOS.state.complete();
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

    let validator_retries = 0;
    let extraSystemInstruction = "";

    while (validator_retries < 3) {
      const messages = planner.plan({
        system_prompt: system_prompt + (extraSystemInstruction ? "\n\n" + extraSystemInstruction : ""),
        history: historical_messages,
        context: [session_context_str],
        user_prompt: prompt
      });

      const model = router.detect_model(prompt);
      await router.ensure(model);

      ContextOS.state.transition("ToolExecution", `Running interactive tool selection stream (attempt ${validator_retries + 1})`);
      const result = await tools_router.chat_stream({ 
        messages, 
        model,
        contextId,
        sessionId: session_id,
        executionId
      }, onToken);

      const toolsExecutedCount = (result as any).toolsExecutedCount || 0;
      const isCreateOrGenerate = ["create", "build", "generate", "write", "make"].some(verb => prompt.toLowerCase().includes(verb));
      const finalGitStatus = getWorkspaceGitStatus();
      const filesModified = finalGitStatus !== initialGitStatus;

      if (isCreateOrGenerate && (toolsExecutedCount === 0 || (!filesModified && toolsExecutedCount <= 1))) {
        validator_retries++;
        extraSystemInstruction = `CRITICAL VALIDATION FAILURE: You attempted to answer without producing any file artifacts or modifications in the workspace. The user explicitly requested to '${intent}'. You MUST use specific tools (such as write_file or replace_file_content) to write the files or execute commands. Text-only explanations are rejected. You cannot complete the task without creating/modifying files.`;
        onToken(`\n\x1b[33m⚠ Action validation failed: no files written. Retrying action execution...\x1b[0m\n`);
        continue;
      }

      ContextOS.state.complete();
      logger.info({
        event: "execution_stream_complete",
        sessionId: session_id,
        executionId
      }, `Completed streaming execution ${executionId} for session ${session_id}`);
      return { id: executionId, session_id, content: result?.content || "" };
    }

    ContextOS.state.complete();
    return {
      id: executionId,
      session_id,
      content: "Failed to verify workspace action execution. Please try again with a more specific prompt."
    };
  }

}

export const runtime = new agent_runtime();

import crypto from "node:crypto";
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

function isConversational(prompt: string): boolean {
  const analyzer = new IntentAnalyzer();
  const classification = analyzer.classify(prompt);
  if (classification.category === "conversation" && classification.confidence >= 0.7) {
    return true;
  }
  return false;
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
          // Index file in Context OS Workspace Memory
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

    // Initialize state machine
    ContextOS.state.startExecution(contextId, session_id, executionId);

    // Save legacy message to avoid breaking tests relying on memory engine legacy queries
    (ContextOS.sessions as any).createSession(session_id, contextId);
    
    if (isConversational(prompt)) {
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
    
    // Add context to db
    const legacyMemory = (ContextOS as any).sessions; // backward compat db mapping
    const rawMemory = (legacyMemory as any).memory || (ContextOS as any).tools; // fallback helper
    
    // Log prompt in legacy database
    ContextOS.state.transition("Investigation", "Evaluating input intent");
    
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

    const messages = planner.plan({
      system_prompt,
      history: historical_messages,
      context: [session_context_str],
      user_prompt: prompt
    });

    const model = router.detect_model(prompt);
    await router.ensure(model);

    ContextOS.state.transition("ToolExecution", "Running interactive tool selection loop");
    const response = await tools_router.chat({ 
      messages, 
      model,
      contextId,
      sessionId: session_id,
      executionId
    });

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

    if (isConversational(prompt)) {
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

    const messages = planner.plan({
      system_prompt,
      history: historical_messages,
      context: [session_context_str],
      user_prompt: prompt
    });

    const model = router.detect_model(prompt);
    await router.ensure(model);

    ContextOS.state.transition("ToolExecution", "Running interactive tool selection stream");
    const result = await tools_router.chat_stream({ 
      messages, 
      model,
      contextId,
      sessionId: session_id,
      executionId
    }, onToken);

    ContextOS.state.complete();
    logger.info({
      event: "execution_stream_complete",
      sessionId: session_id,
      executionId
    }, `Completed streaming execution ${executionId} for session ${session_id}`);
    return { id: executionId, session_id, content: result?.content || "" };
  }

}

export const runtime = new agent_runtime();

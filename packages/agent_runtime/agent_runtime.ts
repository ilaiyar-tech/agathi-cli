import crypto from "node:crypto";

import { router } from "../router/index.js";
import { memory } from "../memory/index.js";
import { tools_router } from "../tool_router/index.js";
import { context } from "../context_engine/index.js";
import { sessions } from "../session_manager/index.js";

import { planner } from "../prompt_planner/index.js";
import { system_prompt } from "../prompts/system_prompt.js";
import { registry } from "../tools/index.js";

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

async function runFileAnalysisPipeline(prompt: string): Promise<string> {
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
          // Limit file size to 512KB (524288 bytes) to protect context limits
          let safeContent = content;
          if (content.length > 524288) {
            safeContent = content.slice(0, 524288) + "\n... [Content truncated (exceeded 512KB size limit)]";
          }
          // Format with line numbers for source attribution
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
    let session = sessions.get_session(session_id);
    if (!session) {
      session = sessions.create_session({ active: true });
      session.id = session_id;
    }

    memory.add(session_id, "user", prompt);
    const session_context = await context.build_context(session_id);

    const history = memory
      .history(session_id)
      .reverse();

    const historical_messages = history.slice(0, -1).map((item: any) => ({
      role: item.role,
      content: item.content
    }));

    // Declarative Execution Profile
    const profile = detectProfile(prompt);
    if (profile.intent === "file_analysis") {
      const contextData = await runFileAnalysisPipeline(prompt);
      if (contextData) {
        const messages = [
          { role: "system", content: "You are Agathi, an advanced workspace reasoning engine. You MUST provide structured source attribution in your response. Cite the specific file names and line ranges (e.g. Lines 42-118) for all code snippets, imports, or logic details you mention." },
          ...historical_messages,
          { role: "user", content: `${contextData}\n\nUser query: ${prompt}` }
        ];
        await router.ensure(profile.llm);
        const response = await router.coder(messages);
        const content = response.content;
        memory.add(session_id, "assistant", content);
        return { id: crypto.randomUUID(), session_id, content };
      }
    }

    const messages = planner.plan({
      system_prompt,
      history: historical_messages,
      context: session_context,
      user_prompt: prompt
    });

    // Automatic Model Routing
    const model = router.detect_model(prompt);
    await router.ensure(model);

    const response = await tools_router.chat({ messages, model });
    const content = response.content;

    memory.add(
      session_id,
      "assistant",
      content
    );

    return {
      id: crypto.randomUUID(),
      session_id,
      content
    };
  }

  async chat_stream(
    prompt: string,
    session_id: string = "default",
    onToken: (token: string) => void
  ) {
    let session = sessions.get_session(session_id);
    if (!session) {
      session = sessions.create_session({ active: true });
      session.id = session_id;
    }

    memory.add(session_id, "user", prompt);
    const history = memory.history(session_id).reverse();
    const historical_messages = history.slice(0, -1).map((item: any) => ({ role: item.role, content: item.content }));
    const session_context = await context.build_context(session_id);

    // Declarative Execution Profile
    const profile = detectProfile(prompt);
    if (profile.intent === "file_analysis") {
      const contextData = await runFileAnalysisPipeline(prompt);
      if (contextData) {
        onToken(`🔍 Pre-executing file search pipeline...\nFound matching context. Formulating summary response...\n\n`);
        const messages = [
          { role: "system", content: "You are Agathi, an advanced workspace reasoning engine. You MUST provide structured source attribution in your response. Cite the specific file names and line ranges (e.g. Lines 42-118) for all code snippets, imports, or logic details you mention." },
          ...historical_messages,
          { role: "user", content: `${contextData}\n\nUser query: ${prompt}` }
        ];
        await router.ensure(profile.llm);
        const result = await tools_router.chat_stream({ messages, model: profile.llm }, onToken);
        const content = result.content;
        memory.add(session_id, "assistant", content);
        return { id: crypto.randomUUID(), session_id, content };
      }
    }
    
    const messages = planner.plan({
      system_prompt,
      history: historical_messages,
      context: session_context,
      user_prompt: prompt
    });

    // Automatic Model Routing
    const model = router.detect_model(prompt);
    await router.ensure(model);

    const result = await tools_router.chat_stream({ messages, model }, onToken);
    const content = result.content;

    memory.add(session_id, "assistant", content);
    return { id: crypto.randomUUID(), session_id, content };
  }

}

export const runtime = new agent_runtime();

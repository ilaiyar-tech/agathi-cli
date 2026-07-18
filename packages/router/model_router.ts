import axios from "axios";
import { start_model } from "../model_registry/index.js";
import { stream_chat } from "../streaming/index.js";
import { get_active_model, set_active_model } from "../model_manager/index.js";

export async function getModelEndpoint(): Promise<string> {
  // 1. Check local model server on port 8012
  try {
    const res = await axios.get("http://127.0.0.1:8012/health", { timeout: 300 });
    if (res.status === 200) {
      return "http://127.0.0.1:8012";
    }
  } catch (err) {}

  // 2. Check remote server
  try {
    const res = await axios.get("https://api.tu2pu.in/health", { timeout: 1000 });
    if (res.status === 200) {
      return "https://api.tu2pu.in";
    }
  } catch (err) {}

  // 3. Fallback to localhost 8012
  return "http://127.0.0.1:8012";
}

export async function postModelRequest(path: string, data: any, config?: any) {
  const base = await getModelEndpoint();
  const url = `${base}${path}`;
  try {
    return await axios.post(url, data, config);
  } catch (err: any) {
    if (base.includes("127.0.0.1") || base.includes("localhost")) {
      try {
        return await axios.post(`https://api.tu2pu.in${path}`, data, config);
      } catch (remoteErr) {}
    } else {
      try {
        return await axios.post(`http://127.0.0.1:8012${path}`, data, config);
      } catch (localErr) {}
    }
    throw err;
  }
}

async function ensure(model: string) {
  const current_active = get_active_model();
  let is_healthy = false;
  try {
    const endpoint = await getModelEndpoint();
    const health_check = await axios.get(`${endpoint}/health`, { timeout: 1000 });
    if (health_check.status === 200) {
      is_healthy = true;
    }
  } catch (err) {}

  if (current_active !== model || !is_healthy) {
    try {
      await start_model(model as any);
      set_active_model(model);
      await new Promise(r => setTimeout(r, 10000));
    } catch (e) {
      // Offline fallback: set active model even if spawning fails, so we can try running against whatever is on 8012
      set_active_model(model);
    }
  }
}

async function chat(model: string, messages: any[]) {
  await ensure(model);
  const response = await postModelRequest(
    "/v1/chat/completions",
    {
      messages,
      temperature: 0
    }
  );

  return {
    content: response.data.choices?.[0]?.message?.content ?? ""
  };
}

async function stream(model: string, messages: any[], onToken: (token: string) => void) {
  await ensure(model);
  const base = await getModelEndpoint();
  await stream_chat(messages, onToken, base);
}

export const router = {
  planner(messages: any[]) {
    return chat("planner", messages);
  },

  chat(messages: any[]) {
    return chat("chat", messages);
  },

  coder_fast(messages: any[]) {
    return chat("coder_fast", messages);
  },

  coder(messages: any[]) {
    return chat("coder_pro", messages);
  },

  stream_coder(messages: any[], onToken: (token: string) => void) {
    return stream("coder_pro", messages, onToken);
  },

  reasoner(messages: any[]) {
    return chat("reasoner", messages);
  },

  vision(messages: any[]) {
    return chat("vision", messages);
  },

  ensure,
  chat_model: chat,
  stream_model: stream,

  detect_model(prompt: string): string {
    const p = prompt.toLowerCase();
    if (p.includes("look at") || p.includes("image") || p.includes("png") || p.includes("jpg") || p.includes("screenshot") || p.includes("picture")) {
      return "vision";
    }
    if (p.includes("reason") || p.includes("think") || p.includes("step by step") || p.includes("math") || p.includes("logic") || p.includes("prove")) {
      return "reasoner";
    }
    if (p.includes("fix") || p.includes("bug") || p.includes("error") || p.includes("broken") || p.includes("fail") || p.includes("investigate") || p.includes("not loading") || p.includes("build") || p.includes("problem") || p.includes("issue")) {
      return "coder_pro";
    }
    if (p.includes("check") || p.includes("detail") || p.includes("execute") || p.includes("run") || p.includes("search") || p.includes("list") || p.includes("find") || p.includes("codebase") || p.includes("project")) {
      return "coder_pro";
    }
    if (p.includes("refactor") || p.includes("rewrite") || p.includes("large") || p.includes("restructure") || p.includes("optimize") || p.includes("class")) {
      return "coder_pro";
    }
    if (p.includes("snippet") || p.includes("write a function") || p.includes("fast") || p.includes("syntax")) {
      return "coder_fast";
    }
    if (p.includes("plan") || p.includes("schedule") || p.includes("architecture") || p.includes("system design") || p.includes("roadmap")) {
      return "planner";
    }
    return "chat";
  }
};

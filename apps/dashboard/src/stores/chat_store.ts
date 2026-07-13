import {create} from "zustand";
import * as backend from "../services/api";

type Message={
role:"user"|"assistant";
content:string;
};

type ChatSession={
id: string;
name: string;
messages: Message[];
};

type Store={
sessions: ChatSession[];
activeSessionId: string | null;
messages:Message[];
busy:boolean;
abortController: AbortController | null;
pinnedSessionIds: string[];

loadSessions:()=>Promise<void>;
createSession:()=>Promise<void>;
setActiveSession:(id:string)=>void;
deleteSession:(id:string)=>Promise<void>;
renameSession:(id:string, name:string)=>Promise<void>;
togglePinSession:(id:string)=>void;
send:(prompt:string, isRegenerate?: boolean)=>Promise<void>;
stopGeneration:()=>void;
clear:()=>void;
};

const savedPinned = localStorage.getItem('pinnedSessionIds');
const initialPinned = savedPinned ? JSON.parse(savedPinned) : [];

export const use_chat_store=create<Store>((set, get)=>({
sessions: [],
activeSessionId: null,
messages:[],
busy:false,
abortController: null,
pinnedSessionIds: initialPinned,

async loadSessions() {
  try {
    const { data } = await backend.getChats();
    set({ sessions: data });
    if (data.length > 0 && !get().activeSessionId) {
      set({ activeSessionId: data[0].id, messages: data[0].messages || [] });
    } else if (data.length === 0) {
      await get().createSession();
    }
  } catch (e) {
    console.error("Failed to load sessions", e);
  }
},

async createSession() {
  const { data } = await backend.createChat("New Chat");
  set(state => ({
    sessions: [data, ...state.sessions],
    activeSessionId: data.id,
    messages: []
  }));
},

setActiveSession(id: string) {
  const session = get().sessions.find(s => s.id === id);
  if (session) {
    set({ activeSessionId: id, messages: session.messages || [] });
  }
},

async deleteSession(id: string) {
  await backend.deleteChat(id);
  const state = get();
  const newSessions = state.sessions.filter(s => s.id !== id);
  set({ sessions: newSessions });
  if (state.activeSessionId === id) {
    if (newSessions.length > 0) {
      set({ activeSessionId: newSessions[0].id, messages: newSessions[0].messages || [] });
    } else {
      await get().createSession();
    }
  }
},

async renameSession(id: string, name: string) {
  await backend.updateChat(id, { name });
  set(state => ({
    sessions: state.sessions.map(s => s.id === id ? { ...s, name } : s)
  }));
},

togglePinSession(id: string) {
  set(state => {
    const isPinned = state.pinnedSessionIds.includes(id);
    const newPinned = isPinned 
      ? state.pinnedSessionIds.filter(pid => pid !== id)
      : [...state.pinnedSessionIds, id];
    
    localStorage.setItem('pinnedSessionIds', JSON.stringify(newPinned));
    return { pinnedSessionIds: newPinned };
  });
},

stopGeneration() {
  const { abortController } = get();
  if (abortController) {
    abortController.abort();
    set({ busy: false, abortController: null });
  }
},

async send(prompt, isRegenerate = false){
let sessionId = get().activeSessionId;
if (!sessionId) {
  await get().createSession();
  sessionId = get().activeSessionId!;
}

const currentMessages = get().messages;
let newMessages = currentMessages;

if (isRegenerate) {
  // Remove last assistant message if regenerating
  if (currentMessages.length > 0 && currentMessages[currentMessages.length - 1].role === 'assistant') {
    newMessages = currentMessages.slice(0, -1);
  }
  // Ensure the prompt is not appended twice if regenerating
} else {
  newMessages = [
    ...currentMessages,
    {
      role:"user" as const,
      content:prompt
    }
  ];
}

const abortController = new AbortController();

set({
busy:true,
messages: newMessages,
abortController
});

// Save to backend immediately
await backend.updateChat(sessionId, { messages: newMessages });

try{
  // For streaming
  let streamedContent = "";
  
  // Create assistant placeholder
  set(() => ({
    messages: [
      ...newMessages,
      { role: "assistant", content: "" }
    ]
  }));

  const response = await fetch("http://127.0.0.1:8100/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, session_id: sessionId }),
    signal: abortController.signal
  });

  if (!response.body) throw new Error("No response body");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split("\n");
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const dataStr = line.replace("data: ", "");
        try {
          const data = JSON.parse(dataStr);
          if (data.token) {
            streamedContent += data.token;
            set(state => {
              const msgs = [...state.messages];
              if (msgs.length > 0 && msgs[msgs.length - 1].role === "assistant") {
                msgs[msgs.length - 1].content = streamedContent;
              }
              return { messages: msgs };
            });
          }
        } catch(e) {}
      }
    }
  }

  set({ busy: false, abortController: null });
  await backend.updateChat(sessionId, { messages: get().messages });

}catch(e:any){
  if (e.name === 'AbortError') {
    console.log("Generation aborted");
    await backend.updateChat(sessionId, { messages: get().messages });
    return;
  }

  const errorMessages = [
    ...newMessages,
    {
      role:"assistant" as const,
      content: e?.message ?? "Server Error"
    }
  ];

  set({
    busy:false,
    messages: errorMessages,
    abortController: null
  });

  await backend.updateChat(sessionId, { messages: errorMessages });
}

},

clear(){
set({
messages:[]
});
}

}));

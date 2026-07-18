import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { MdAdd, MdClose, MdFullscreen, MdFullscreenExit, MdDeleteOutline, MdContentCopy, MdContentPaste } from "react-icons/md";

interface Tab {
  id: string;
  name: string;
  terminal?: Terminal;
  fitAddon?: FitAddon;
  socket?: WebSocket;
  isClosed?: boolean;
}

export function terminal_panel() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const nextTabNum = useRef(1);

  // Initialize first tab
  useEffect(() => {
    createNewTab();
    return () => {
      // Cleanup all tabs
      tabs.forEach(tab => {
        tab.isClosed = true;
        tab.socket?.close();
        tab.terminal?.dispose();
      });
    };
  }, []);

  const createNewTab = () => {
    const id = Math.random().toString(36).substring(7);
    const tabName = `Terminal ${nextTabNum.current++}`;
    const newTab: Tab = { id, name: tabName };

    setTabs(prev => [...prev, newTab]);
    setActiveTabId(id);
  };

  const closeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const tabToClose = tabs.find(t => t.id === id);
    if (tabToClose) {
      tabToClose.isClosed = true;
      tabToClose.socket?.close();
      tabToClose.terminal?.dispose();
    }

    const remaining = tabs.filter(t => t.id !== id);
    setTabs(remaining);

    if (activeTabId === id && remaining.length > 0) {
      setActiveTabId(remaining[remaining.length - 1].id);
    }
  };

  // Instantiates the terminal inside the container when activeTabId changes or container renders
  useEffect(() => {
    tabs.forEach(tab => {
      if (tab.terminal) return; // already initialized

      const el = containerRefs.current[tab.id];
      if (!el) return;

      const terminal = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: "Fira Code, monospace",
        theme: {
          background: "#020306",
          foreground: "#f3f4f6",
          green: "#10b981",
          cyan: "#06b6d4",
          magenta: "#8b5cf6",
        },
      });

      const fit = new FitAddon();
      terminal.loadAddon(fit);
      terminal.open(el);
      fit.fit();

      terminal.writeln("");
      terminal.writeln("\x1b[1;35mtu2pu AI Terminal Shell\x1b[0m");
      terminal.writeln("Real-time persistent process attached.");
      terminal.writeln("");

      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsHost = import.meta.env.VITE_API_URL
        ? new URL(import.meta.env.VITE_API_URL).host
        : "127.0.0.1:8100";

      const connectSocket = () => {
        if (tab.isClosed) return;
        const socket = new WebSocket(`${wsProtocol}//${wsHost}/ws/terminal`);

        socket.onopen = () => {
          socket.send(
            JSON.stringify({
              type: "resize",
              cols: terminal.cols,
              rows: terminal.rows,
            })
          );
        };

        socket.onmessage = (e) => {
          try {
            const message = JSON.parse(e.data);
            if (message.type === "stdout" || message.type === "stderr") {
              terminal.write(message.data);
            } else if (message.type === "exit") {
              terminal.writeln(`\r\nShell exited (${message.code ?? "--"}).`);
            }
          } catch {
            terminal.write(e.data);
          }
        };

        socket.onclose = () => {
          if (!tab.isClosed) {
            setTimeout(connectSocket, 3000);
          }
        };

        tab.socket = socket;
      };

      connectSocket();

      terminal.onData((data) => {
        if (tab.socket?.readyState === WebSocket.OPEN) {
          tab.socket.send(JSON.stringify({ type: "stdin", data }));
        }
      });

      tab.terminal = terminal;
      tab.fitAddon = fit;
    });
  }, [tabs, activeTabId]);

  // Handle resizing on window resize / fullscreen change
  useEffect(() => {
    const handleResize = () => {
      tabs.forEach(tab => {
        if (tab.fitAddon && tab.terminal && tab.socket?.readyState === WebSocket.OPEN) {
          tab.fitAddon.fit();
          tab.socket.send(
            JSON.stringify({
              type: "resize",
              cols: tab.terminal.cols,
              rows: tab.terminal.rows,
            })
          );
        }
      });
    };

    window.addEventListener("resize", handleResize);
    // Trigger quick delay resize to let DOM update
    const timer = setTimeout(handleResize, 100);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
    };
  }, [tabs, isFullscreen, activeTabId]);

  const activeTab = tabs.find(t => t.id === activeTabId);

  const clearTerminal = () => {
    activeTab?.terminal?.clear();
    activeTab?.terminal?.focus();
  };

  const copySelection = () => {
    if (activeTab?.terminal) {
      const selection = activeTab.terminal.getSelection();
      navigator.clipboard.writeText(selection);
    }
  };

  const pasteClipboard = async () => {
    if (activeTab?.terminal && activeTab?.socket?.readyState === WebSocket.OPEN) {
      const text = await navigator.clipboard.readText();
      activeTab.socket.send(JSON.stringify({ type: "stdin", data: text }));
      activeTab.terminal.focus();
    }
  };

  return (
    <div 
      className={`rounded-3xl border border-white/5 bg-black/40 backdrop-blur-xl transition-all duration-300 ${
        isFullscreen 
          ? "fixed inset-4 z-50 flex flex-col p-6" 
          : "p-6"
      }`}
    >
      {/* Terminal Actions and Tabs header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
        {/* Tabs layout */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`group flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer border transition-all ${
                activeTabId === tab.id
                  ? "bg-purple-950/40 border-purple-500/30 text-white shadow-lg"
                  : "bg-transparent border-transparent text-gray-500 hover:text-white hover:bg-white/5"
              }`}
            >
              <span>{tab.name}</span>
              {tabs.length > 1 && (
                <button
                  onClick={(e) => closeTab(tab.id, e)}
                  className="rounded-full p-0.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <MdClose size={12} />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={createNewTab}
            className="flex items-center justify-center rounded-lg p-1.5 text-gray-500 hover:bg-white/5 hover:text-white transition-colors"
            title="Open new tab"
          >
            <MdAdd size={16} />
          </button>
        </div>

        {/* Toolbar actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={copySelection}
            className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5 text-xs font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
            title="Copy Selection"
          >
            <MdContentCopy size={14} />
            <span>Copy</span>
          </button>
          <button
            onClick={pasteClipboard}
            className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5 text-xs font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
            title="Paste Stdin"
          >
            <MdContentPaste size={14} />
            <span>Paste</span>
          </button>
          <button
            onClick={clearTerminal}
            className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5 text-xs font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
            title="Clear Output"
          >
            <MdDeleteOutline size={14} />
            <span>Clear</span>
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5 text-xs font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <MdFullscreenExit size={14} /> : <MdFullscreen size={14} />}
            <span>{isFullscreen ? "Exit" : "Full"}</span>
          </button>
        </div>
      </div>

      {/* Terminal shells containers */}
      <div className={`relative bg-[#020306] rounded-2xl border border-white/5 overflow-hidden ${
        isFullscreen ? "flex-1 min-h-0" : ""
      }`}>
        {tabs.map((tab) => (
          <div
            key={tab.id}
            ref={(ref) => {
              containerRefs.current[tab.id] = ref;
            }}
            className={`w-full p-4 ${
              activeTabId === tab.id ? "block" : "hidden"
            } ${isFullscreen ? "h-full" : "h-[600px]"}`}
          />
        ))}
      </div>
    </div>
  );
}

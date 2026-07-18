import { useEffect } from "react";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { normalize_system } from "../hooks/use_dashboard";

interface Props {
  children: ReactNode;
}

export function WebSocketProvider({ children }: Props) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const topics = [
      { name: "system", queryKey: ["system"], formatter: normalize_system },
      { name: "provider", queryKey: ["active-provider"], formatter: (data: any) => data.active ? { active: data.active } : data },
      { name: "downloads", queryKey: ["downloads"] },
      { name: "jobs", queryKey: ["jobs"] },
      { name: "queue", queryKey: ["queue"] },
      { name: "gpu", queryKey: ["gpu"] },
      { name: "logs", queryKey: ["logs"] }
    ];

    const sockets: { [key: string]: WebSocket } = {};
    const reconnectTimers: { [key: string]: any } = {};

    const connect = (topic: string, queryKey: string[], formatter?: Function) => {
      const wsUrl = `ws://127.0.0.1:8100/ws/${topic}`;
      const ws = new WebSocket(wsUrl);
      sockets[topic] = ws;

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === "connected") return;

          // Special logic for logs: append them to cache
          if (topic === "logs") {
            queryClient.setQueryData(queryKey, (old: any[] | undefined) => {
              const current = Array.isArray(old) ? old : [];
              const formattedLog = `${new Date(parsed.time || Date.now()).toLocaleTimeString()} [${parsed.message || 'SYSTEM'}]`;
              return [...current, formattedLog].slice(-100);
            });
          } else {
            const formatted = formatter ? formatter(parsed) : parsed;
            queryClient.setQueryData(queryKey, formatted);
          }
        } catch (err) {
          console.error(`Error parsing WebSocket data for topic: ${topic}`, err);
        }
      };

      ws.onclose = () => {
        // Try reconnecting after 3 seconds
        reconnectTimers[topic] = setTimeout(() => {
          connect(topic, queryKey, formatter);
        }, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    topics.forEach((t) => {
      connect(t.name, t.queryKey, t.formatter);
    });

    return () => {
      topics.forEach((t) => {
        if (sockets[t.name]) {
          sockets[t.name].onclose = null; // Prevent reconnect loop
          sockets[t.name].close();
        }
        if (reconnectTimers[t.name]) {
          clearTimeout(reconnectTimers[t.name]);
        }
      });
    };
  }, [queryClient]);

  return <>{children}</>;
}

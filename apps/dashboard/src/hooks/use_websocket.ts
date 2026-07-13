import { useEffect, useState, useRef } from "react";

export function use_websocket<T>(topic: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      setIsLoading(true);
      const wsUrl = `ws://127.0.0.1:8100/ws/${topic}`;
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          setData(parsed);
          setIsLoading(false);
        } catch (err) {
          console.error("Failed to parse websocket message:", err);
        }
      };

      ws.onerror = () => {
        setError(new Error("WebSocket error"));
        setIsLoading(false);
        ws.close();
      };

      ws.onclose = () => {
        setIsLoading(false);
        reconnectTimer = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.onclose = null;
        socketRef.current.close();
      }
      clearTimeout(reconnectTimer);
    };
  }, [topic]);

  return { data, error, isLoading };
}

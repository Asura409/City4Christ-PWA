import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/auth/session";
import { createRealtimeClient, TICKET_PATH } from "@/messages/realtimeClient";

export function useRealtimeMessages({ enabled, onEvent, onReady } = {}) {
  const callbacks = useRef({ onEvent, onReady });
  const clientRef = useRef(null);
  callbacks.current = { onEvent, onReady };
  const [status, setStatus] = useState(enabled ? "connecting" : "idle");

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      return undefined;
    }
    let active = true;
    const client = createRealtimeClient({
      baseURL: api.baseURL,
      getTicket: async (signal) => {
        const result = await api.request(TICKET_PATH, { method: "POST", signal });
        return result.data?.ticket;
      },
      onStatus: (next) => { if (active) setStatus(next); },
      onEvent: (event) => callbacks.current.onEvent?.(event),
      onReady: () => callbacks.current.onReady?.(),
    });
    clientRef.current = client;
    const reconnectWhenOnline = () => { void client.reconnectNow(); };
    globalThis.addEventListener?.("online", reconnectWhenOnline);
    void client.start();
    return () => {
      active = false;
      if (clientRef.current === client) clientRef.current = null;
      globalThis.removeEventListener?.("online", reconnectWhenOnline);
      client.stop();
    };
  }, [enabled]);

  const send = useCallback((frame) => clientRef.current?.send(frame) ?? false, []);
  return { status, send };
}

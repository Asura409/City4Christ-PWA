const REALTIME_PATH = "/api/v1/realtime";
const TICKET_PATH = "/api/v1/realtime/tickets";

export function websocketURL(baseURL) {
  const url = new URL(REALTIME_PATH, baseURL);
  if (url.protocol === "https:") url.protocol = "wss:";
  else if (url.protocol === "http:") url.protocol = "ws:";
  else throw new Error("Realtime messaging requires an HTTP API origin.");
  return url.toString();
}

export function normalizeRealtimeEvent(value) {
  if (!value || typeof value !== "object") return null;
  if (value.scope !== "direct" && value.scope !== "group") return null;
  const event = { type: value.type, scope: value.scope };
  if (value.scope === "direct") {
    if (typeof value.conversationId !== "string" || !value.conversationId) return null;
    event.conversationId = value.conversationId;
  } else {
    if (typeof value.groupId !== "string" || !value.groupId) return null;
    event.groupId = value.groupId;
  }
  if (value.type === "presence.snapshot" || value.type === "presence.online" || value.type === "presence.offline") {
    if (value.scope === "direct") {
      if (typeof value.senderId !== "string" || !value.senderId || typeof value.online !== "boolean") return null;
      event.senderId = value.senderId;
      event.online = value.online;
    } else {
      if (!Number.isSafeInteger(value.onlineCount) || value.onlineCount < 0) return null;
      event.onlineCount = value.onlineCount;
      if (value.senderId !== undefined) {
        if (typeof value.senderId !== "string" || !value.senderId) return null;
        event.senderId = value.senderId;
      }
    }
    return event;
  }
  if (value.type === "typing.start" || value.type === "typing.stop") {
    if (typeof value.senderId !== "string" || !value.senderId) return null;
    event.senderId = value.senderId;
    return event;
  }
  if (value.type !== "message.created" && value.type !== "message.updated" && value.type !== "message.deleted") return null;
  if (typeof value.messageId !== "string" || !value.messageId) return null;
  event.messageId = value.messageId;
  if (Number.isSafeInteger(value.sequence) && value.sequence > 0) event.sequence = value.sequence;
  if ((value.type === "message.created" || value.type === "message.updated") && !event.sequence) return null;
  return event;
}

export function mergeMessageHistory(previous, incoming) {
  const byId = new Map();
  for (const message of previous) byId.set(message.id, message);
  for (const message of incoming) byId.set(message.id, { ...byId.get(message.id), ...message });
  return [...byId.values()].sort((left, right) => left.sequence - right.sequence);
}

export function createRealtimeClient({
  baseURL,
  getTicket,
  WebSocketImpl = globalThis.WebSocket,
  onStatus = () => {},
  onEvent = () => {},
  onReady = () => {},
  retryBaseMs = 500,
  retryMaxMs = 30_000,
  setTimeoutImpl = globalThis.setTimeout,
  clearTimeoutImpl = globalThis.clearTimeout,
} = {}) {
  if (typeof getTicket !== "function") throw new TypeError("getTicket is required.");
  let socket = null;
  let reconnectTimer = null;
  let ticketController = null;
  let stopped = true;
  let connecting = false;
  let attempts = 0;
  let status = "idle";
  let authenticatedSocket = null;

  function setStatus(next) {
    if (status === next) return;
    status = next;
    onStatus(next);
  }

  function clearReconnect() {
    if (reconnectTimer === null) return;
    clearTimeoutImpl(reconnectTimer);
    reconnectTimer = null;
  }

  function scheduleReconnect() {
    if (stopped || reconnectTimer !== null) return;
    setStatus("reconnecting");
    const delay = Math.min(retryBaseMs * (2 ** Math.min(attempts, 10)), retryMaxMs);
    attempts++;
    reconnectTimer = setTimeoutImpl(() => {
      reconnectTimer = null;
      void connect();
    }, delay);
  }

  async function connect() {
    if (stopped || connecting || socket) return;
    if (typeof WebSocketImpl !== "function") {
      setStatus("unavailable");
      return;
    }
    connecting = true;
    ticketController = new AbortController();
    try {
      setStatus(attempts === 0 ? "connecting" : "reconnecting");
      const ticket = await getTicket(ticketController.signal);
      if (stopped) return;
      if (typeof ticket !== "string" || ticket.length === 0) throw new Error("Realtime ticket response was incomplete.");
      const next = new WebSocketImpl(websocketURL(baseURL));
      socket = next;
      let authenticated = false;
      next.onopen = () => {
        if (stopped || socket !== next) {
          next.close(1000, "client stopped");
          return;
        }
        try {
          next.send(JSON.stringify({ type: "authenticate", ticket }));
        } catch {
          next.close(1011, "authentication frame failed");
        }
      };
      next.onmessage = (message) => {
        if (socket !== next || typeof message.data !== "string") return;
        let parsed;
        try { parsed = JSON.parse(message.data); } catch { return; }
        if (parsed?.type === "ready") {
          if (authenticated) return;
          authenticated = true;
          authenticatedSocket = next;
          attempts = 0;
          setStatus("connected");
          onReady();
          return;
        }
        const event = normalizeRealtimeEvent(parsed);
        if (event) onEvent(event);
      };
      next.onclose = (event) => {
        if (socket !== next) return;
        socket = null;
        if (authenticatedSocket === next) authenticatedSocket = null;
        if (stopped) return;
        if (event?.code === 1008) {
          stop("auth_required");
          return;
        }
        scheduleReconnect();
      };
      next.onerror = () => {};
    } catch (error) {
      if (stopped) return;
      if (error?.status === 401 || error?.status === 403) {
        stop("auth_required");
      } else {
        scheduleReconnect();
      }
    } finally {
      connecting = false;
      ticketController = null;
    }
  }

  function start() {
    if (!stopped) return Promise.resolve();
    stopped = false;
    attempts = 0;
    setStatus("connecting");
    return connect();
  }

  function reconnectNow() {
    if (stopped || socket || connecting) return Promise.resolve();
    clearReconnect();
    return connect();
  }

  function stop(finalStatus = "idle") {
    stopped = true;
    clearReconnect();
    ticketController?.abort();
    const current = socket;
    socket = null;
    authenticatedSocket = null;
    if (current && current.readyState < 2) current.close(1000, "client stopped");
    setStatus(finalStatus);
  }

  function send(frame) {
    const allowedType = frame?.type === "typing.start" || frame?.type === "typing.stop" || frame?.type === "presence.subscribe" || frame?.type === "presence.unsubscribe";
    if (!allowedType || authenticatedSocket !== socket || socket?.readyState !== 1) return false;
    const target = frame.scope === "direct" && typeof frame.conversationId === "string"
      ? { scope: "direct", conversationId: frame.conversationId }
      : frame.scope === "group" && typeof frame.groupId === "string"
        ? { scope: "group", groupId: frame.groupId }
        : null;
    if (!target) return false;
    try { socket.send(JSON.stringify({ type: frame.type, ...target })); return true; }
    catch { return false; }
  }

  return { start, stop, reconnectNow, send, getStatus: () => status };
}

export { TICKET_PATH };

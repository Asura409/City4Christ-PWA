// Match the backend's strict ten-minute direct-message mutation boundary.
export const DIRECT_MESSAGE_WINDOW_MS = 10 * 60 * 1000;
export function canMutateDirectMessage(message, now = Date.now()) {
  const created = Date.parse(message?.createdAt || "");
  return Boolean(message) && !message.deleted && Number.isFinite(created) && now < created + DIRECT_MESSAGE_WINDOW_MS;
}

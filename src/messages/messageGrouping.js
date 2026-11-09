import { ukDateKey } from "../../js/time.js";
function dayKey(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : ukDateKey(date);
}

export function sameMessageGroup(previous, current) {
  if (!previous || !current || previous.senderId !== current.senderId) return false;
  if (!dayKey(previous.createdAt) || dayKey(previous.createdAt) !== dayKey(current.createdAt)) return false;
  const previousTime = new Date(previous.createdAt).getTime();
  const currentTime = new Date(current.createdAt).getTime();
  return Number.isFinite(previousTime) && Number.isFinite(currentTime) && Math.abs(currentTime - previousTime) <= 5 * 60 * 1000;
}

export function messageGroupPosition(messages, index) {
  const previous = messages[index - 1];
  const current = messages[index];
  const next = messages[index + 1];
  return {
    first: !sameMessageGroup(previous, current),
    last: !sameMessageGroup(current, next),
  };
}

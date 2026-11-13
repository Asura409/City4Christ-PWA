import { useEffect, useState } from "react";
import { DIRECT_MESSAGE_WINDOW_MS } from "./mutationWindow";
export function useDirectMessageClock(messages) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    let timer;
    function tick() {
      const current = Date.now();
      setNow(current);
      const future = messages.filter((item) => !item.deleted).map((item) => Date.parse(item.createdAt) + DIRECT_MESSAGE_WINDOW_MS).filter((at) => Number.isFinite(at) && at > current);
      if (future.length) timer = setTimeout(tick, Math.min(Math.min(...future) - current + 1, 2147483647));
    }
    tick();
    return () => clearTimeout(timer);
  }, [messages]);
  return now;
}

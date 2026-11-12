import { useEffect, useState } from "react";
import { api, useSession } from "../auth/session";
import { hasCapability } from "../../js/access.js";
export function useBroadcastAccess() {
  const { profile } = useSession();
  const [state, setState] = useState({ busy: true, allowed: false, error: "" });
  useEffect(() => {
    let active = true, request = 0;
    async function check() {
      const current = ++request;
      if (!profile) { if (active) setState({ busy: false, allowed: false, error: "" }); return; }
      try {
        const { data } = await api.request("/api/v1/me/access");
        if (active && current === request) setState({ busy: false, allowed: hasCapability(data, "sermons.manage"), error: "" });
      } catch (error) {
        if (active && current === request) setState({ busy: false, allowed: false, error: error.message });
      }
    }
    void check(); window.addEventListener("focus", check);
    return () => { active = false; request++; window.removeEventListener("focus", check); };
  }, [profile]);
  return state;
}

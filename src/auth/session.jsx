import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createClient } from "../../js/api.js";
export const api = createClient({
  apiURL: globalThis.City4ChristConfig?.API_URL,
});
const Context = createContext(null);
export function SessionProvider({ children }) {
  const [profile, setProfile] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const generation = useRef(0);
  async function restore() {
    const current = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const { data } = await api.me();
      if (current === generation.current) setProfile(data);
    } catch (e) {
      if (current === generation.current) {
        setProfile(null);
        if (e.status !== 401) setError(e.message);
      }
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }
  useEffect(() => {
    void restore();
    const onShow = (e) => {
      if (e.persisted) void restore();
    };
    addEventListener("pageshow", onShow);
    return () => {
      ++generation.current;
      removeEventListener("pageshow", onShow);
    };
  }, []);
  async function login(email, password) {
    const current = ++generation.current;
    setError("");
    setProfile(null);
    try {
      await api.login(email, password);
      const { data } = await api.me();
      if (current === generation.current) setProfile(data);
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }
  async function logout() {
    ++generation.current;
    await api.logout();
    setProfile(null);
  }
  return (
    <Context.Provider
      value={{ profile, setProfile, loading, error, restore, login, logout }}
    >
      {children}
    </Context.Provider>
  );
}
export const useSession = () => useContext(Context);

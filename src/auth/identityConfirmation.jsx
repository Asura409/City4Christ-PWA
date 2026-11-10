import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { SessionConfirmation } from "./SessionConfirmation";
import { isConfirmationError } from "./confirmation";

const Context = createContext(null);

// One dialog at the root of the authenticated app. Sensitive callers ask for a
// confirmation and only then continue, so pages never render permanent proof
// forms or send people to account settings.
export function IdentityConfirmationProvider({ children }) {
  const [current, setCurrent] = useState(null);
  const currentRef = useRef(null);
  const queue = useRef([]);
  const nextId = useRef(0);

  const present = useCallback(() => {
    const item = currentRef.current;
    setCurrent(item);
  }, []);

  const settle = useCallback(
    (id, value) => {
      const item = currentRef.current;
      if (!item || item.id !== id) return;
      item.resolve(value);
      const next = queue.current.shift() || null;
      currentRef.current = next;
      present();
    },
    [present],
  );

  const confirm = useCallback(
    ({ requireMFA = false, reason = "" } = {}) =>
      new Promise((resolve) => {
        const item = { id: ++nextId.current, requireMFA, reason, resolve };
        if (currentRef.current) {
          queue.current.push(item);
          return;
        }
        currentRef.current = item;
        present();
      }),
    [present],
  );

  return (
    <Context.Provider value={{ confirm }}>
      {children}
      {current && (
        <SessionConfirmation
          key={current.id}
          open
          requireMFA={current.requireMFA}
          reason={current.reason}
          onReady={(ready) => {
            if (ready) settle(current.id, true);
          }}
          onClose={() => settle(current.id, false)}
        />
      )}
    </Context.Provider>
  );
}

export function useConfirmIdentity() {
  const value = useContext(Context);
  if (!value) throw new Error("Identity confirmation is unavailable.");
  return value.confirm;
}

// Runs a sensitive action and, when the server asks for fresh proof, opens the
// popup once and retries the same action after the user confirms. A cancelled
// popup rethrows the original error and never submits anything.
export function useConfirmedAction() {
  const confirm = useConfirmIdentity();
  return useCallback(
    async (action) => {
      try {
        return await action();
      } catch (error) {
        if (!isConfirmationError(error)) throw error;
        const confirmed = await confirm({
          requireMFA: error.code === "mfa_required",
          reason:
            error.code === "mfa_required"
              ? "Enter your authenticator code to continue."
              : "Confirm your identity to continue.",
        });
        if (!confirmed) throw error;
        return action();
      }
    },
    [confirm],
  );
}

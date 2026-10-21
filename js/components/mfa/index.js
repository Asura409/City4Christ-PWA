import { element, onClick, onSubmit } from "../../ui.js";
import { mfaView } from "./view.js";
export function bindMFA(api, page) {
  if (!["profile", "settings", "staff", "auth"].includes(page))
    return { refresh: async () => {}, clear: () => {} };
  const v = mfaView();
  let generation = 0,
    enrollmentId = "",
    timer;
  function clearInputs() {
    for (const input of [v.confirm.input, v.verify.input, v.recovery.input])
      input.value = "";
    v.disableCheck.checked = false;
  }
  function privateClear() {
    enrollmentId = "";
    v.setup.hidden = true;
    v.secret.textContent = "";
    v.qr.removeAttribute("src");
    v.confirm.form.hidden = true;
    v.codes.replaceChildren();
    v.backups.hidden = true;
    v.hide.hidden = true;
    clearInputs();
  }
  function clear() {
    generation++;
    clearTimeout(timer);
    privateClear();
    v.panel.hidden = true;
    v.enabled.hidden = true;
    v.state.textContent = "";
  }
  function render(data) {
    if (
      typeof data?.enabled !== "boolean" ||
      !Number.isInteger(data.recoveryCodesRemaining) ||
      data.recoveryCodesRemaining < 0
    )
      throw new Error("Authenticator status is unavailable.");
    v.panel.hidden = false;
    v.start.hidden = data.enabled;
    v.enabled.hidden = !data.enabled;
    clearTimeout(timer);
    if (!data.enabled) {
      v.state.textContent = data.pending
        ? "Setup is pending. Complete it now or start again."
        : "Authenticator protection is not enabled.";
      return;
    }
    const remaining = Date.parse(data.freshUntil) - Date.now();
    v.state.textContent =
      `Authenticator enabled. ${data.recoveryCodesRemaining} recovery codes remaining. ` +
      (remaining > 0
        ? "Authenticator confirmed for this session."
        : "Verify a code before a sensitive action.");
    if (remaining > 0)
      timer = setTimeout(
        () => {
          v.state.textContent =
            "Authenticator confirmation expired. Confirm your identity and verify a new code.";
        },
        Math.min(remaining, 2147483647),
      );
  }
  async function refresh() {
    const version = ++generation;
    try {
      const { data } = await api.mfaStatus();
      if (version === generation) render(data);
      return data;
    } catch (error) {
      if (version === generation) clear();
      throw error;
    }
  }
  function backups(data) {
    if (
      !Array.isArray(data.recoveryCodes) ||
      data.recoveryCodes.length !== 10 ||
      data.recoveryCodes.some((x) => typeof x !== "string")
    )
      throw new Error(
        "Recovery codes were unavailable. Verify an authenticator code and generate a new set.",
      );
    privateClear();
    v.codes.replaceChildren(
      ...data.recoveryCodes.map((code) => element("li", {}, [code])),
    );
    v.backups.hidden = false;
    v.hide.hidden = false;
  }
  async function operation(fn, apply) {
    const version = ++generation;
    try {
      const result = await fn();
      if (version === generation) {
        apply?.(result.data);
        await refresh();
      }
    } finally {
      clearInputs();
    }
  }
  onClick(v.start, () =>
    operation(
      () => api.beginMFA(),
      (data) => {
        privateClear();
        if (typeof data?.id !== "string" || typeof data.secret !== "string")
          throw new Error("Authenticator setup was unavailable.");
        enrollmentId = data.id;
        v.secret.textContent = data.secret;
        v.qr.hidden = !data.qrImage?.startsWith("data:image/png;base64,");
        if (!v.qr.hidden) v.qr.src = data.qrImage;
        v.setup.hidden = false;
        v.confirm.form.hidden = false;
        v.hide.hidden = false;
      },
    ),
  );
  onSubmit(v.confirm.form, () =>
    operation(
      () => api.confirmMFA(enrollmentId, v.confirm.input.value),
      backups,
    ),
  );
  onSubmit(v.verify.form, () =>
    operation(() => api.verifyMFA(v.verify.input.value)),
  );
  onSubmit(v.recovery.form, () =>
    operation(() => api.recoverMFA(v.recovery.input.value)),
  );
  onClick(v.regenerate, () =>
    operation(() => api.regenerateMFARecovery(), backups),
  );
  onSubmit(v.disable, () => operation(() => api.disableMFA(), privateClear));
  onClick(v.hide, async () => {
    privateClear();
  });
  onClick(v.check, refresh);
  window.addEventListener("pagehide", clear);
  return { refresh, clear };
}

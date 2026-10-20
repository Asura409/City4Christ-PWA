import { $, onClick, onSubmit, status, value } from "../ui.js";

// The token remains in this closure only. Remove it from browser history before
// any API call; URL fragments are never sent in the page's HTTP request.
export function passwordRecovery({ api, tab, notifyLogout }) {
  window.addEventListener("hashchange", () => {
    if (new URLSearchParams(location.hash.slice(1)).has("reset_token"))
      location.reload();
  });
  const forgot = $("#forgot-form"),
    reset = $("#reset-form");
  const params = new URLSearchParams(location.hash.slice(1));
  let token = params.get("reset_token") || "";
  const hasReset = params.has("reset_token");
  if (hasReset)
    history.replaceState(null, "", location.pathname + location.search);
  onClick($("#forgot-password"), () => {
    forgot.elements.email.value = $("#login-form").elements.email.value;
    tab("forgot");
    status(
      "Enter your verified account email. Google-only accounts should use Continue with Google.",
    );
  });
  onSubmit(forgot, async () => {
    const returnTo = new URL("auth.html", location.href).href;
    const { data } = await api.forgotPassword(value(forgot, "email"), returnTo);
    status(data.message, "success");
  });
  onSubmit(reset, async () => {
    if (value(reset, "password") !== value(reset, "confirmPassword")) {
      status("The passwords do not match.", "error");
      return;
    }
    await api.resetPassword(token, value(reset, "password"));
    token = "";
    reset.reset();
    tab("login");
    notifyLogout?.();
    status(
      "Password updated. All previous sessions have ended. Sign in with your new password.",
      "success",
    );
  });
  if (hasReset) {
    tab("reset");
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
      token = "";
      tab("forgot");
      status("Reset link is invalid or expired. Request a new one.", "error");
    }
  }
  return hasReset;
}

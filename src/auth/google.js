const messages = {
  account_link_required:
    "Sign in with your password, then choose Link Google on your profile. Accounts are linked only with your confirmation.",
  identity_conflict:
    "This Google account is already linked to another account.",
  registration_closed: "New registrations are currently closed.",
  invalid_session:
    "Sign in again, then link Google from your profile within five minutes.",
  mfa_required: "Confirm your authenticator code before linking Google.",
  reauthentication_failed:
    "Google identity confirmation failed. Try again from your profile.",
  google_sign_in_failed:
    "Google sign-in could not be completed. Please try again.",
};
export function googleErrorMessage(code) {
  return Object.hasOwn(messages, code) ? messages[code] : messages.google_sign_in_failed;
}
export function googleReturnURL(intent = "login", origin = location.origin) {
  return new URL(
    intent === "link" ? "/account/auth.html" : "/oauth/auth.html",
    origin,
  ).href;
}
export function googleProviderURL(raw) {
  const destination = new URL(raw);
  if (
    destination.protocol !== "https:" ||
    destination.hostname !== "accounts.google.com" ||
    destination.port ||
    destination.username ||
    destination.password
  ) {
    throw new Error(
      "Google returned an invalid destination. Please try again.",
    );
  }
  return destination.href;
}
export function googleCallbackRoute(path, search) {
  if (!["/oauth/auth.html", "/account/auth.html"].includes(path)) return null;
  const params = new URLSearchParams(search);
  const safe = new URLSearchParams({
    intent: path === "/account/auth.html" ? "link" : "login",
  });
  if (params.has("auth_error")) {
    const code = params.get("auth_error");
    safe.set(
      "auth_error",
      Object.hasOwn(messages, code) ? code : "google_sign_in_failed",
    );
  }
  return "/#/google-return?" + safe;
}

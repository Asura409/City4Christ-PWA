import { $, status, failure, onSubmit, onClick, value } from "../ui.js";
import { passwordRecovery } from "./password-recovery.js";
export async function authPage({
  api,
  access,
  reauthentication,
  mfa,
  session,
  setProfile,
  notifyLogout,
}) {
  const login = $("#login-form"),
    register = $("#register-form"),
    verify = $("#verify-form");
  function tab(name) {
    document
      .querySelectorAll("[data-auth-tab]")
      .forEach((b) =>
        b.setAttribute("aria-selected", String(b.dataset.authTab === name)),
      );
    for (const form of document.querySelectorAll(".auth-panel"))
      form.hidden = form.id !== name + "-form";
  }
  document
    .querySelectorAll("[data-auth-tab]")
    .forEach((b) => b.addEventListener("click", () => tab(b.dataset.authTab)));
  function signed(profile) {
    setProfile(profile);
    void access?.refresh().catch(() => {});
    void reauthentication?.refresh().catch(() => {});
    void mfa?.refresh().catch(() => {});
    $("#auth-forms").hidden = true;
    $("#signed-in").hidden = false;
    $("#signed-in-name").textContent = `Welcome, ${profile.firstName}`;
  }
  onSubmit(login, async () => {
    await api.login(value(login, "email"), value(login, "password"));
    login.elements.password.value = "";
    const { data } = await api.me();
    signed(data);
    status("You are signed in.", "success");
  });
  onSubmit(register, async () => {
    if (value(register, "password") !== value(register, "confirmPassword")) {
      status("The passwords do not match.", "error");
      return;
    }
    const body = Object.fromEntries(
      ["firstName", "lastName", "email", "password"].map((k) => [
        k,
        value(register, k),
      ]),
    );
    await api.register(body);
    verify.elements.email.value = body.email;
    login.elements.email.value = body.email;
    register.elements.password.value = "";
    register.elements.confirmPassword.value = "";
    tab("verify");
    status("Check your email for the verification code.", "success");
  });
  onSubmit(verify, async () => {
    const email = value(verify, "email");
    await api.verify(email, value(verify, "code"));
    verify.elements.code.value = "";
    login.elements.email.value = email;
    tab("login");
    status("Email verified. Sign in with your password.", "success");
  });
  const resend = $("#resend-code");
  let eligibleAt = 0;
  onClick(resend, async () => {
    if (!verify.elements.email.reportValidity()) return;
    if (Date.now() < eligibleAt) {
      status("Please wait before requesting another code.");
      return;
    }
    await api.resend(value(verify, "email"));
    eligibleAt = Date.now() + 60000;
    status(
      "If verification is needed, an email will be sent when eligible. Wait sixty seconds before requesting another code.",
    );
  });
  onClick($("[data-google]"), async () => {
    location.assign(
      api.googleStartURL(new URL("auth.html", location.href).href),
    );
  });
  const error = new URL(location.href).searchParams.get("auth_error");
  if (error) {
    failure({
      code: error,
      message: "Google sign-in could not be completed. Please try again.",
    });
    history.replaceState(null, "", location.pathname);
  }
  if (new URL(location.href).searchParams.has("reauthentication"))
    history.replaceState(null, "", location.pathname);
  if (passwordRecovery({ api, tab, notifyLogout })) return;
  try {
    signed(await session());
  } catch (e) {
    if (e.status !== 401) failure(e);
  }
}

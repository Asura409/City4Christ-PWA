import { $, element } from "../../ui.js";
export function mfaView() {
  const button = (label) =>
    element("button", { type: "button", class: "secondary" }, [label]);
  function codeForm(label, action, name) {
    const input = element("input", {
      name,
      type: "text",
      autocomplete: "off",
      required: "",
      maxlength: name === "recoveryCode" ? 43 : 6,
    });
    if (name !== "recoveryCode") {
      input.inputMode = "numeric";
      input.pattern = "[0-9]{6}";
    }
    const form = element("form", { "aria-label": action }, [
      element("label", {}, [label, input]),
      element("div", { class: "actions" }, [element("button", {}, [action])]),
    ]);
    return { form, input };
  }
  const panel = element(
    "section",
    { class: "panel", "aria-label": "Authenticator protection", hidden: "" },
    [
      element("h2", {}, ["Authenticator protection"]),
      element("p", { class: "muted" }, [
        "Add an authenticator app to protect sensitive actions. First confirm your identity above. Ordinary sign-in still creates the first-factor session.",
      ]),
    ],
  );
  const state = element("p", { "aria-live": "polite" });
  const start = button("Set up authenticator");
  const secret = element("code", {
    class: "account-id",
    "data-mfa-setup-secret": "",
  });
  const qr = element("img", {
    alt: "Authenticator setup QR code",
    class: "mfa-setup-qr",
    width: 256,
    height: 256,
  });
  const setup = element("div", { hidden: "" }, [
    element("p", {}, [
      "Scan this QR code or add a time-based account manually in your authenticator app using this private setup key:",
    ]),
    qr,
    secret,
    element("p", { class: "muted" }, [
      "Setup expires in ten minutes. Keep this key private; it is shown only during this setup.",
    ]),
  ]);
  const confirm = codeForm(
    "Setup verification code",
    "Enable authenticator",
    "setupCode",
  );
  confirm.form.hidden = true;
  const verify = codeForm(
    "Authenticator code",
    "Verify authenticator",
    "totpCode",
  );
  const recovery = codeForm(
    "Recovery code",
    "Use recovery code",
    "recoveryCode",
  );
  const regenerate = button("Generate new recovery codes");
  const disableCheck = element("input", { type: "checkbox", required: "" });
  const disable = element("form", { "aria-label": "Disable authenticator" }, [
    element("label", { class: "check-label" }, [
      disableCheck,
      "I want to disable authenticator protection",
    ]),
    element("div", { class: "actions" }, [
      element("button", { class: "secondary" }, ["Disable authenticator"]),
    ]),
  ]);
  const enabled = element("div", { hidden: "" }, [
    verify.form,
    recovery.form,
    element("div", { class: "actions" }, [regenerate]),
    disable,
  ]);
  const codes = element("ul", { class: "account-id" });
  const backups = element("div", { hidden: "" }, [
    element("p", {}, [
      "Save these recovery codes safely. They are shown only once; each code works once.",
    ]),
    codes,
  ]);
  const hide = button("Hide private details");
  hide.hidden = true;
  const check = button("Check authenticator status");
  panel.append(
    state,
    start,
    setup,
    confirm.form,
    backups,
    enabled,
    element("div", { class: "actions" }, [hide, check]),
  );
  ($("main") || document.body).append(panel);
  return {
    panel,
    state,
    start,
    setup,
    secret,
    qr,
    confirm,
    verify,
    recovery,
    enabled,
    regenerate,
    disable,
    disableCheck,
    codes,
    backups,
    hide,
    check,
  };
}

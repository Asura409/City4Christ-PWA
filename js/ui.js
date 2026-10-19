export const $ = (selector, root = document) => root.querySelector(selector);
export function element(tag, attributes = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) {
    if (key === "class") node.className = value;
    else node.setAttribute(key, String(value));
  }
  for (const child of children)
    node.append(
      child instanceof Node ? child : document.createTextNode(String(child)),
    );
  return node;
}
export function status(message = "", kind = "info", fields = {}) {
  const box = $("#page-status");
  if (!box) return;
  box.replaceChildren();
  box.className = `status ${kind}`;
  box.setAttribute("role", kind === "error" ? "alert" : "status");
  if (message) box.append(document.createTextNode(message));
  const entries = Object.entries(fields);
  if (entries.length)
    box.append(
      element(
        "ul",
        {},
        entries.map(([key, value]) => element("li", {}, [`${key}: ${value}`])),
      ),
    );
}
export function failure(error) {
  if (error?.name === "AbortError") return;
  const messages = {
    account_link_required:
      "This email already has an account. Sign in with your password, then explicitly link Google from your profile.",
    identity_conflict: "That Google account is already linked elsewhere.",
    registration_closed: "New registrations are currently closed.",
    version_conflict:
      "This sermon changed. Reload it before editing; your changes have not been saved.",
    sermon_not_found: "This sermon is unavailable or not published.",
    invalid_session: "Please sign in again.",
    email_unverified: "Verify your email before signing in.",
  };
  status(
    messages[error.code] ||
      (error.status === 404
        ? "This feature is not available on this preview service yet."
        : error.message) ||
      "The request could not be completed.",
    "error",
    error.fields,
  );
  if (error.status === 401)
    $("#page-status")?.append(
      element("p", {}, [element("a", { href: "auth.html" }, ["Sign in"])]),
    );
}
export async function busy(container, operation) {
  const buttons = [...container.querySelectorAll("button")],
    previous = buttons.map((b) => b.disabled);
  container.setAttribute("aria-busy", "true");
  buttons.forEach((b) => (b.disabled = true));
  try {
    return await operation();
  } catch (error) {
    failure(error);
  } finally {
    container.removeAttribute("aria-busy");
    buttons.forEach((b, i) => (b.disabled = previous[i]));
  }
}
export function onSubmit(form, operation) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void busy(form, () => operation(event.submitter));
  });
}
export function onClick(button, operation) {
  if (!button) return;
  button.addEventListener("click", () => {
    const holder = {
      querySelectorAll: () => [button],
      setAttribute: (...a) => button.setAttribute(...a),
      removeAttribute: (...a) => button.removeAttribute(...a),
    };
    void busy(holder, operation);
  });
}
export const value = (form, name) => form.elements.namedItem(name).value;
export function localDateInput(raw) {
  const d = new Date(raw);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 19);
}
export function dateLabel(raw) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(raw),
  );
}
export function videoLink(raw) {
  try {
    const u = new URL(raw);
    if (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      ["www.youtube.com", "youtube.com", "youtu.be"].includes(u.hostname)
    )
      return element(
        "a",
        {
          href: u.href,
          target: "_blank",
          rel: "noopener noreferrer",
          class: "button-link",
        },
        ["Watch sermon"],
      );
  } catch {}
  return null;
}

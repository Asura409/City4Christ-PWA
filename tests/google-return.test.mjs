import test from "node:test";
import assert from "node:assert/strict";
import {
  googleReturnURL,
  googleCallbackRoute,
  googleProviderURL,
  googleErrorMessage,
} from "../src/auth/google.js";
test("Google callback stays on the React interface and forwards only known status", () => {
  assert.equal(
    googleReturnURL("login", "https://preview.example"),
    "https://preview.example/oauth/auth.html",
  );
  assert.equal(
    googleReturnURL("link", "https://preview.example"),
    "https://preview.example/account/auth.html",
  );
  assert.equal(
    googleCallbackRoute(
      "/account/auth.html",
      "?accessToken=secret&next=https://evil.example",
    ),
    "/#/google-return?intent=link",
  );
  assert.equal(
    googleCallbackRoute(
      "/oauth/auth.html",
      "?auth_error=account_link_required",
    ),
    "/#/google-return?intent=login&auth_error=account_link_required",
  );
  assert.equal(
    googleCallbackRoute("/oauth/auth.html", "?auth_error=untrusted-text"),
    "/#/google-return?intent=login&auth_error=google_sign_in_failed",
  );
  assert.equal(googleCallbackRoute("/auth.html", ""), null);
});
test("Google navigation rejects external, credentialed and insecure destinations", () => {
  assert.equal(
    googleProviderURL("https://accounts.google.com/o/oauth2/auth?state=test"),
    "https://accounts.google.com/o/oauth2/auth?state=test",
  );
  for (const value of [
    "https://evil.example",
    "http://accounts.google.com/auth",
    "https://accounts.google.com.evil.example",
    "https://user:password@accounts.google.com/auth",
  ])
    assert.throws(() => googleProviderURL(value));
});

test("Google error messages never expose inherited objects or arbitrary callback text", () => {
 for(const code of ['__proto__','constructor','untrusted-text'])assert.equal(typeof googleErrorMessage(code),'string');
 assert.equal(googleErrorMessage('__proto__'),googleErrorMessage('google_sign_in_failed'));
});

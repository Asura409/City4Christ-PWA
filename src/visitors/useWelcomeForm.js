import { useEffect, useRef, useState } from "react";
import { welcomeConfig, submitVisitor } from "./api";
export function useWelcomeForm() {
  const [config, setConfig] = useState(null),
    [form, setForm] = useState({
      fullName: "",
      email: "",
      phone: "",
      consent: false,
    }),
    [error, setError] = useState(""),
    [fields, setFields] = useState({}),
    [busy, setBusy] = useState(false),
    [submitted, setSubmitted] = useState(false),
    [revision, setRevision] = useState(0);
  const request = useRef(null);
  useEffect(() => {
    const c = new AbortController();
    setConfig(null);
    setError("");
    setFields({});
    request.current = null;
    setForm((x) => ({ ...x, consent: false }));
    welcomeConfig(c.signal)
      .then(setConfig)
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      });
    return () => c.abort();
  }, [revision]);
  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setError("");
    setFields({});
    if (!form.email.trim() && !form.phone.trim()) {
      setError("Provide an email address or phone number.");
      return;
    }
    const values = { ...form, policyVersion: config.policyVersion };
    const fingerprint = JSON.stringify(values);
    if (request.current?.fingerprint !== fingerprint)
      request.current = { fingerprint, id: crypto.randomUUID() };
    setBusy(true);
    try {
      await submitVisitor({ ...values, submissionId: request.current.id });
      setSubmitted(true);
      setForm({ fullName: "", email: "", phone: "", consent: false });
      request.current = null;
    } catch (e) {
      setError(e.message);
      setFields(e.fields || {});
    } finally {
      setBusy(false);
    }
  }
  return {
    config,
    form,
    setForm,
    error,
    fields,
    busy,
    submitted,
    submit,
    reload: () => setRevision((x) => x + 1),
  };
}

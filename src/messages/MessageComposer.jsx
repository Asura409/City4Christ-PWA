import React, { useId, useRef, useState } from "react";
import { uploadMessageMedia } from "@/posts/api";

const ACCEPTED_TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "audio/mpeg", "audio/mp4", "audio/wav", "audio/x-wav", "audio/ogg",
  "video/mp4", "video/webm",
].join(",");

export default function MessageComposer({ label, placeholder, disabled = false, onSend, onTyping }) {
  const id = useId();
  const input = useRef(null);
  const [draft, setDraft] = useState("");
  const [files, setFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [error, setError] = useState("");

  function addFiles(selected) {
    setError("");
    const next = [...files, ...Array.from(selected).map((file) => ({ file, uploadId: "" }))];
    if (next.length > 4) {
      setError("Attach up to four files to a message.");
      return;
    }
    setFiles(next);
  }

  async function submit(event) {
    event.preventDefault();
    const body = draft.trim();
    if (disabled || sending || !body) return;
    setSending(true);
    setError("");
    let readyFiles = [...files];
    try {
      for (let index = 0; index < readyFiles.length; index++) {
        if (readyFiles[index].uploadId) continue;
        setUploadStatus(`Uploading ${readyFiles[index].file.name}…`);
        const uploadId = await uploadMessageMedia(readyFiles[index].file, {
          onStatus: setUploadStatus,
        });
        readyFiles[index] = { ...readyFiles[index], uploadId };
        setFiles([...readyFiles]);
      }
      setUploadStatus("");
      const accepted = await onSend({
        body,
        attachmentIds: readyFiles.map((item) => item.uploadId),
      });
      if (!accepted) return;
      setDraft("");
      setFiles([]);
      if (input.current) input.current.value = "";
    } catch (cause) {
      setError(cause?.message || "The message could not be sent.");
    } finally {
      setSending(false);
      setUploadStatus("");
    }
  }

  return (
    <form className="message-composer" aria-label={label} onSubmit={submit}>
      <label className="sr-only" htmlFor={`${id}-body`}>{label === "Send a group message" ? "Group message" : "Message"}</label>
      <textarea
        id={`${id}-body`}
        aria-label={label === "Send a group message" ? "Group message" : "Message"}
        value={draft}
        maxLength={4000}
        rows={2}
        placeholder={placeholder}
        onChange={(event) => { setDraft(event.target.value); onTyping?.(Boolean(event.target.value.trim())); }}
        onBlur={() => onTyping?.(false)}
        disabled={disabled || sending}
      />
      <div className="message-composer-tools">
        <input
          ref={input}
          className="sr-only"
          type="file"
          accept={ACCEPTED_TYPES}
          multiple
          aria-label="Attach images, audio, or video"
          onChange={(event) => { addFiles(event.target.files || []); event.target.value = ""; }}
          disabled={disabled || sending || files.length >= 4}
        />
        <button
          className="btn soft message-attach-button"
          type="button"
          onClick={() => input.current?.click()}
          disabled={disabled || sending || files.length >= 4}
        >Attach</button>
        <button className="btn dark" type="submit" disabled={disabled || sending || !draft.trim()}>
          {sending ? "Sending…" : "Send"}
        </button>
      </div>
      {files.length > 0 && <ul className="message-attachment-pending" aria-label="Files to attach">
        {files.map((item, index) => <li key={`${item.file.name}-${index}`}>
          <span>{item.file.name}{item.uploadId ? " · scanned" : ""}</span>
          <button type="button" aria-label={`Remove ${item.file.name}`} onClick={() => setFiles((current) => current.filter((_, i) => i !== index))} disabled={sending}>Remove</button>
        </li>)}
      </ul>}
      {uploadStatus && <p className="message-upload-status" role="status">{uploadStatus}</p>}
      {error && <p className="messages-error" role="alert">{error}</p>}
    </form>
  );
}

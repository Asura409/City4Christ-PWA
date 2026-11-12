import React, { useEffect, useRef, useState } from "react";
import { Icon } from "@/lib/icons";
import { PassageLookup } from "@/bible/PassageLookup";
import { formatPassageText } from "@/bible/formatPassageText";
import { Avatar } from "./Avatar";
import { useToast } from "./Toast";

const TYPES = [
  {
    id: "post",
    icon: "sparkle",
    label: "Post",
    desc: "Share an update",
    placeholder: "What's on your heart? Share with your church…",
    success: "Posted",
  },
];

export function CreateSheet({
  open,
  defaultType = "post",
  onClose,
  onPost,
  audienceLabel = "Sharing with the church",
}) {
  const toast = useToast();
  const [type, setType] = useState(defaultType);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploadStatus, setUploadStatus] = useState("");
  const [scriptureOpen, setScriptureOpen] = useState(false);
  const taRef = useRef(null);
  const fileRef = useRef(null);
  const scriptureCloseRef = useRef(null);

  useEffect(() => {
    setType(defaultType);
  }, [defaultType]);
  useEffect(() => {
    if (open)
      setTimeout(() => taRef.current?.focus({ preventScroll: true }), 320);
    else setScriptureOpen(false);
  }, [open]);

  useEffect(() => {
    if (!scriptureOpen) return undefined;
    const previous = document.activeElement;
    const frame = requestAnimationFrame(() => scriptureCloseRef.current?.focus());
    document.body.classList.add("scripture-picker-open");
    function onKeyDown(event) {
      if (event.key === "Escape") {
        event.stopPropagation();
        setScriptureOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.body.classList.remove("scripture-picker-open");
      document.removeEventListener("keydown", onKeyDown);
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [scriptureOpen]);

  const ct = TYPES.find((t) => t.id === type);

  async function share() {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await onPost?.({ body: text.trim(), files, setUploadStatus });
      toast(ct.success);
      setText("");
      setFiles([]);
      setUploadStatus("");
      onClose();
    } catch (error) {
      toast(error.message || "Could not publish your post.");
    } finally {
      setSaving(false);
    }
  }

  function addFiles(event) {
    const selected = Array.from(event.target.files || []);
    event.target.value = "";
    const allowed = selected.filter((file) =>
      /^(image\/(jpeg|png|webp|gif)|audio\/(mpeg|mp4|wav|ogg|x-wav)|video\/(mp4|webm))$/.test(
        file.type,
      ),
    );
    if (allowed.length !== selected.length)
      toast("Choose JPG, PNG, WebP, GIF, MP3, WAV, OGG, MP4, or WebM files.");
    const next = [...files, ...allowed];
    if (next.length > 4) {
      toast("Posts can include up to 4 files.");
      return;
    }
    const tooLarge = next.find(
      (file) =>
        file.size >
        (file.type.startsWith("image/")
          ? 20
          : file.type.startsWith("audio/")
            ? 50
            : 100) *
          1024 *
          1024,
    );
    if (tooLarge) {
      toast(`${tooLarge.name} is too large for this media type.`);
      return;
    }
    setFiles(next);
  }

  function addScripture(passage) {
    const passageText = formatPassageText(passage);
    const attribution = `— ${passage.reference}${passage.translation?.name ? ` (${passage.translation.name})` : ""}`;
    const block = `${passageText}\n\n${attribution}`;
    const base = text.trimEnd();
    const next = base ? `${base}\n\n${block}` : block;
    if (next.length > 5000) {
      toast(
        "That passage would make your post longer than 5,000 characters. Choose a shorter passage.",
      );
      return;
    }
    setText(next);
    setScriptureOpen(false);
    toast("Scripture added to your post.");
    setTimeout(() => taRef.current?.focus({ preventScroll: true }), 0);
  }

  return (
    <div
      className={`create${open ? " show" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="crTitle"
      aria-hidden={!open}
    >
      <div className="cr-top">
        <button className="round" onClick={onClose} aria-label="Close">
          <Icon name="close" />
        </button>
        <h2 id="crTitle">Create</h2>
        <button
          className="btn gold cr-share"
          disabled={!text.trim() || saving}
          onClick={share}
        >
          {saving ? "Sharing…" : "Share"}
        </button>
      </div>
      <div className="cr-scroll">
        <div
          className="cr-types"
          role="radiogroup"
          aria-label="What are you sharing?"
        >
          {TYPES.map((t) => (
            <button
              key={t.id}
              className="cr-type"
              role="radio"
              aria-checked={type === t.id}
              onClick={() => setType(t.id)}
            >
              <Icon name={t.icon} />
              <b>{t.label}</b>
              <small>{t.desc}</small>
            </button>
          ))}
        </div>
        <div className="cr-compose">
          <div className="cr-who">
            <Avatar name="You" size={40} />
            <div>
              <b>You</b>
              <span>Sharing with your church</span>
            </div>
          </div>
          <p className="lead">{audienceLabel}</p>
          <textarea
            ref={taRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={ct.placeholder}
            maxLength={5000}
            aria-label="Your message"
          />
          <div className="cr-meta">
            <span>{text.length}/5000</span>
          </div>
          {files.length > 0 && (
            <ul className="cr-attachments" aria-label="Selected attachments">
              {files.map((file, index) => (
                <li key={`${file.name}-${index}`}>
                  <span>
                    {file.name} · {Math.max(1, Math.ceil(file.size / 1024))} KB
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setFiles((current) =>
                        current.filter((_, i) => i !== index),
                      )
                    }
                    aria-label={`Remove ${file.name}`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          {uploadStatus && (
            <p role="status" className="cr-upload-status">
              {uploadStatus}
            </p>
          )}
        </div>
      </div>
      <div className="cr-tools">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={saving}
        >
          <Icon name="image" />
          Photo, audio or video
        </button>
        <input
          ref={fileRef}
          hidden
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif,audio/mpeg,audio/mp4,audio/wav,audio/x-wav,audio/ogg,video/mp4,video/webm"
          aria-label="Attach photos, audio, or video"
          onChange={addFiles}
        />
        <button type="button" onClick={() => setScriptureOpen(true)}>
          <Icon name="book" />
          Add scripture
        </button>
      </div>
      {scriptureOpen && (
        <div
          className="scripture-picker"
          onClick={() => setScriptureOpen(false)}
        >
          <section
            className="scripture-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="scriptureTitle"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="scripture-head">
              <div>
                <p className="scripture-kicker">BIBLE</p>
                <h2 id="scriptureTitle">Add scripture</h2>
                <p>Choose a book, chapter and verses to add to your post.</p>
              </div>
              <button
                ref={scriptureCloseRef}
                className="round"
                type="button"
                onClick={() => setScriptureOpen(false)}
                aria-label="Close scripture picker"
              >
                <Icon name="close" />
              </button>
            </header>
            <div className="scripture-body">
              <PassageLookup
                embedded
                autoLookup={false}
                onUse={addScripture}
                useLabel="Add to post"
                useHelp="Choose a passage of no more than 4,000 characters to add to your post."
              />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

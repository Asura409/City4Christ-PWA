// Keep verse boundaries when a passage is copied into another editor.
// Providers that return structured verses can be rendered consistently even
// when their plain-text response joins the verses together.
export function formatPassageText(passage) {
  const verses = Array.isArray(passage?.verses)
    ? passage.verses.filter(
        (verse) =>
          Number.isInteger(verse?.number) &&
          verse.number > 0 &&
          typeof verse.text === "string" &&
          verse.text.trim(),
      )
    : [];

  if (!verses.length) return String(passage?.text || "").trim();

  return verses
    .map((verse) => `[${verse.number}] ${verse.text.trim()}`)
    .join(" ");
}

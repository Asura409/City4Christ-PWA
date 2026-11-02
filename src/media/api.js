import { api } from "@/auth/session";

export async function uploadMedia(
  file,
  purpose,
  { onStatus = () => {}, signal } = {},
) {
  const reservation = (
    await api.request("/api/v1/uploads/presign", {
      method: "POST",
      body: { purpose, contentType: file.type, size: file.size },
      signal,
    })
  ).data;
  const headers = { ...(reservation.headers || {}) };
  delete headers["Content-Length"];
  delete headers["content-length"];
  const uploaded = await fetch(reservation.url, {
    method: reservation.method || "PUT",
    headers,
    body: file,
    mode: "cors",
    credentials: "omit",
    signal,
  });
  if (!uploaded.ok)
    throw new Error("Could not upload this file. Please try again.");
  await api.request(
    `/api/v1/uploads/${encodeURIComponent(reservation.uploadId)}/complete`,
    {
      method: "POST",
      body: {},
      signal,
    },
  );
  onStatus("Scanning your file for safety…");
  const deadline = Date.now() + 120_000;
  let delay = 1000;
  while (Date.now() < deadline) {
    const result = (
      await api.request(
        `/api/v1/uploads/${encodeURIComponent(reservation.uploadId)}`,
        { signal },
      )
    ).data;
    if (result.status === "available") return reservation.uploadId;
    if (["rejected", "scan_failed", "expired"].includes(result.status)) {
      throw new Error(
        "This file could not be cleared for sharing. Choose another file.",
      );
    }
    await new Promise((resolve) => setTimeout(resolve, delay));
    delay = Math.min(Math.round(delay * 1.5), 5000);
  }
  throw new Error(
    "File scanning is taking longer than expected. Please try sharing again shortly.",
  );
}

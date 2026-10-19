import http from "node:http";
import { readFile, realpath, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
const root = await realpath(resolve("dist"));
const index = process.argv.indexOf("--port"),
  port = Number(
    index >= 0 ? process.argv[index + 1] : process.env.PORT || 4173,
  );
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};
const server = http.createServer(async (req, res) => {
  try {
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405).end();
      return;
    }
    let path = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    if (path.endsWith("/")) path += "index.html";
    const file = await realpath(resolve(root, "." + path));
    if (!file.startsWith(root + sep) || !(await stat(file)).isFile()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, {
      "Content-Type": mime[extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(req.method === "HEAD" ? undefined : await readFile(file));
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
  }
});
server.listen(port, "127.0.0.1", () =>
  console.log(`Preview at http://127.0.0.1:${port}`),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => server.close(() => process.exit(0)));

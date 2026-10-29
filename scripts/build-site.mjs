import { build as viteBuild } from "vite";
import { build as connectedBuild } from "./build.mjs";
import { validateAPIURL } from "../js/api.js";
import {
  mkdtemp,
  cp,
  readFile,
  writeFile,
  rm,
  readdir,
  mkdir,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
export async function buildSite({
  apiURL = process.env.API_URL,
  mediaOrigin = process.env.MEDIA_ORIGIN || "",
  outDir = join(root, "dist"),
} = {}) {
  if (!apiURL) throw new Error("Set API_URL before building.");
  const origin = apiURL === "/" ? "" : validateAPIURL(apiURL);
  if (mediaOrigin) {
    let parsed;
    try { parsed = new URL(mediaOrigin); } catch { throw new Error("MEDIA_ORIGIN must be a Cloudflare R2 HTTPS origin."); }
    if (parsed.protocol !== "https:" || !/^[a-f0-9]{32}\.r2\.cloudflarestorage\.com$/i.test(parsed.hostname) || parsed.port || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash)
      throw new Error("MEDIA_ORIGIN must be a Cloudflare R2 HTTPS origin without credentials, path, query or fragment.");
    mediaOrigin = parsed.origin;
  }
  if (resolve(outDir) === resolve(root))
    throw new Error("Build output must not overwrite source files.");
  const temporary = await mkdtemp(join(tmpdir(), "c4c-vite-"));
  try {
    await viteBuild({
      root,
      build: { outDir: temporary, emptyOutDir: true, assetsDir: "app-assets" },
      logLevel: "warn",
    });
    await connectedBuild({ apiURL, outDir });
    await cp(join(temporary, "app-assets"), join(outDir, "app-assets"), {
      recursive: true,
    });
    const html = (
      await readFile(join(temporary, "index.html"), "utf8")
    ).replace("__API_ORIGIN__", origin).replaceAll("__MEDIA_ORIGIN__", mediaOrigin);
    await writeFile(join(outDir, "index.html"), html);
    // Dedicated allowlisted callback pages render the same React application.
    for (const section of ['oauth', 'account']) {
      await mkdir(join(outDir, section), {recursive: true});
      await writeFile(join(outDir, section, 'auth.html'), html);
    }
    const assets = (await readdir(join(outDir, "app-assets")))
      .sort()
      .map((name) => "app-assets/" + name);
    const hash = createHash("sha256").update(html);
    for (const asset of assets)
      hash.update(await readFile(join(outDir, asset)));
    const workerPath = join(outDir, "service-worker.js");
    const worker = await readFile(workerPath, "utf8");
    hash.update(worker);
    await writeFile(
      workerPath,
      worker
        .replace(
          /city4christ-preview-[a-f0-9]{16}/,
          "city4christ-preview-" + hash.digest("hex").slice(0, 16),
        )
        .replace(
          "const FILES = [",
          "const FILES = [" +
            assets.map((asset) => JSON.stringify(asset) + ",").join(""),
        ),
    );
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    await buildSite();
    console.log("React app and connected preview pages built in dist/.");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

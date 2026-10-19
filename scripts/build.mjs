import { cp, mkdir, readdir, rm, writeFile, readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { validateAPIURL } from "../js/api.js";
const root = fileURLToPath(new URL("../", import.meta.url));
export async function build({
  apiURL = process.env.API_URL,
  outDir = join(root, "dist"),
} = {}) {
  if (!apiURL)
    throw new Error("Set API_URL before building (see .env.example).");
  validateAPIURL(apiURL, "https://same-origin.invalid");
  const out = resolve(outDir);
  if (out === resolve(root))
    throw new Error("Build output must not overwrite source files.");
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (
      entry.isFile() &&
      (entry.name.endsWith(".html") ||
        ["manifest.json", "service-worker.js"].includes(entry.name))
    )
      await cp(join(root, entry.name), join(out, entry.name));
  }
  for (const name of ["css", "js", "assets"])
    await cp(join(root, name), join(out, name), { recursive: true });
  await writeFile(
    join(out, "js/config.js"),
    `// Public deployment configuration; never put secrets here.\nglobalThis.City4ChristConfig = Object.freeze(${JSON.stringify({ API_URL: apiURL === "/" ? "/" : validateAPIURL(apiURL) })});\n`,
  );
  const hash = createHash("sha256");
  async function fingerprint(dir) {
    for (const entry of (await readdir(dir, { withFileTypes: true })).sort(
      (a, b) => a.name.localeCompare(b.name),
    )) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await fingerprint(path);
      else if (/\.(html|js|css|json)$/.test(entry.name))
        hash.update(await readFile(path));
    }
  }
  await fingerprint(out);
  const worker = await readFile(join(out, "service-worker.js"), "utf8");
  await writeFile(
    join(out, "service-worker.js"),
    worker.replace("__BUILD_ID__", hash.digest("hex").slice(0, 16)),
  );
  return out;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    await build();
    console.log("Static preview built in dist/.");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

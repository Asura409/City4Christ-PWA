import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { validateAPIURL } from "./js/api.js";

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, import.meta.dirname, "");
  const apiURL = process.env.API_URL || environment.API_URL || "/";
  const apiOrigin = apiURL === "/" ? "" : validateAPIURL(apiURL);
  return {
    plugins: [
      react(),
      {
        name: "city4christ-development-config",
        apply: "serve",
        configureServer(server) {
          server.middlewares.use("/js/config.js", (_request, response) => {
            response.setHeader("Content-Type", "text/javascript");
            response.setHeader("Cache-Control", "no-store");
            response.end(
              "globalThis.City4ChristConfig=Object.freeze(" +
                JSON.stringify({ API_URL: apiURL }) +
                ");",
            );
          });
        },
        transformIndexHtml(html) {
          return html.replace("__API_ORIGIN__", apiOrigin + " ws: wss:");
        },
      },
    ],
    resolve: { alias: { "@": resolve(import.meta.dirname, "src") } },
    build: { outDir: "dist", emptyOutDir: true },
  };
});

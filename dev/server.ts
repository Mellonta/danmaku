import { watch } from "node:fs";
import { resolve } from "node:path";
import { proxyDandanplay } from "./live-proxy";

const root = resolve(import.meta.dir, "..");
let revision = Date.now();
let debounce: ReturnType<typeof setTimeout> | undefined;

for (const directory of ["src", "dev"]) {
  watch(resolve(root, directory), { recursive: true }, () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      revision = Date.now();
    }, 150);
  });
}

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 5173,
  async fetch(request) {
    const path = new URL(request.url).pathname;
    const headers = { "Cache-Control": "no-store" };
    if (path === "/dandanplay") return proxyDandanplay(request);
    // Explicit routes: never expose the repository, key.sh, or release artifacts.
    if (path === "/") {
      return new Response(Bun.file(resolve(import.meta.dir, "index.html")), {
        headers,
      });
    }
    if (path === "/style.css") {
      return new Response(Bun.file(resolve(import.meta.dir, "style.css")), {
        headers,
      });
    }
    if (path === "/version") return Response.json(revision, { headers });
    if (path === "/app.js") {
      const build = await Bun.build({
        entrypoints: [resolve(import.meta.dir, "main.ts")],
        target: "browser",
        sourcemap: "inline",
        define: { "process.env.NODE_ENV": JSON.stringify("development") },
      });
      const output = build.outputs[0];
      if (!build.success || !output) {
        const message = build.logs.map((log) => log.message).join("\n");
        console.error(message);
        return new Response(`throw new Error(${JSON.stringify(message)});`, {
          headers: { ...headers, "Content-Type": "text/javascript" },
        });
      }
      return new Response(output, {
        headers: { ...headers, "Content-Type": "text/javascript" },
      });
    }
    return new Response("Not found", { status: 404, headers });
  },
});

console.log(`Danmaku development harness: ${server.url.toString()}`);

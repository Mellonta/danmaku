import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { generateSignature } from "../src/signature";

export function declarationValue(
  declaration: string,
  name: "AppId" | "AppSecret",
): string {
  if (!new RegExp(`\\bconst\\s+${name}\\s*=`).test(declaration))
    throw new Error("Invalid key.sh declaration");
  // key.sh may contain an obfuscated JavaScript expression, as in build.sh.
  // Evaluate in isolation with no filesystem/network bindings and a time limit.
  const value: unknown = runInNewContext(
    `${declaration}\n${name}`,
    { atob },
    {
      timeout: 1000,
      contextCodeGeneration: { strings: false, wasm: false },
    },
  );
  if (typeof value !== "string" || !value || value.includes("<ENTER_"))
    throw new Error("Invalid key.sh declaration");
  return value;
}

async function credentials() {
  // Match build.sh's shell declaration format, without tracing or exposing values.
  const process = Bun.spawn(
    [
      "bash",
      "-c",
      'set +x; source "$1" >/dev/null 2>&1 || exit 1; printf "%s\\0%s" "$APP_ID" "$APP_SECRET"',
      "harness",
      resolve(import.meta.dir, "../key.sh"),
    ],
    { stdout: "pipe", stderr: "ignore" },
  );
  const output = await new Response(process.stdout).text();
  if ((await process.exited) !== 0)
    throw new Error(
      "Could not load key.sh. Use the same key.sh as the release build.",
    );
  const [id = "", secret = ""] = output.split("\0");
  return {
    id: declarationValue(id, "AppId"),
    secret: declarationValue(secret, "AppSecret"),
  };
}

export function upstreamUrl(path: unknown): URL {
  if (typeof path !== "string" || !path.startsWith("/api/v2/"))
    throw new Error("Unsupported API path");
  const url = new URL(path, "https://api.dandanplay.net");
  const search = url.pathname === "/api/v2/search/episodes";
  if (
    url.origin !== "https://api.dandanplay.net" ||
    (!search && !/^\/api\/v2\/comment\/[1-9]\d*$/.test(url.pathname))
  )
    throw new Error("Unsupported API path");
  const allowed = search
    ? ["anime", "episode", "v2"]
    : ["withRelated", "chConvert"];
  if ([...url.searchParams.keys()].some((key) => !allowed.includes(key)))
    throw new Error("Unsupported API parameter");
  return url;
}

export function downloadRedirect(location: string, base: URL): URL {
  const url = new URL(location, base);
  if (
    url.protocol !== "https:" ||
    !(
      url.hostname === "dandanplay.net" ||
      url.hostname.endsWith(".dandanplay.net")
    ) ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443")
  ) {
    throw new Error("Unsupported Dandanplay redirect");
  }
  return url;
}

export async function proxyDandanplay(request: Request): Promise<Response> {
  const headers = { "Cache-Control": "no-store" };
  const error = (message: string, status: number) =>
    Response.json(
      { success: false, errorMessage: message },
      { status, headers },
    );
  if (
    request.method !== "POST" ||
    !request.headers.get("Content-Type")?.startsWith("application/json")
  )
    return error("Expected a JSON POST", 405);
  if (
    new URL(request.url).hostname !== "127.0.0.1" ||
    (request.headers.get("Origin") &&
      request.headers.get("Origin") !== new URL(request.url).origin)
  )
    return error("Only same-origin requests are allowed", 403);
  let url: URL;
  try {
    const body = await request.text();
    if (body.length > 4096) return error("Request too large", 413);
    const data: unknown = JSON.parse(body);
    if (typeof data !== "object" || data === null || !("path" in data))
      return error("Missing API path", 400);
    url = upstreamUrl(data.path);
  } catch {
    return error("Invalid API request", 400);
  }
  let keys: Awaited<ReturnType<typeof credentials>>;
  try {
    keys = await credentials();
  } catch {
    return error(
      "Cannot read credentials from key.sh. Check APP_ID and APP_SECRET declarations used by build.sh.",
      503,
    );
  }
  const timestamp = String(Math.floor(Date.now() / 1000));
  try {
    const signal = AbortSignal.any([
      request.signal,
      AbortSignal.timeout(15_000),
    ]);
    let response = await fetch(url, {
      headers: {
        "X-AppId": keys.id,
        "X-Timestamp": timestamp,
        "X-Signature": generateSignature(
          keys.id,
          timestamp,
          url.pathname,
          keys.secret,
        ),
      },
      signal,
      redirect: "manual",
    });
    for (
      let hop = 0;
      [301, 302, 303, 307, 308].includes(response.status);
      hop++
    ) {
      if (hop === 3) throw new Error("Too many Dandanplay redirects");
      const location = response.headers.get("Location");
      if (!location) throw new Error("Missing redirect destination");
      url = downloadRedirect(location, url);
      await response.body?.cancel();
      // Comment downloads use Dandanplay's CDN. Do not forward API auth headers.
      response = await fetch(url, { signal, redirect: "manual" });
    }
    return new Response(response.body, {
      status: response.status,
      headers: {
        ...headers,
        "Content-Type":
          response.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch {
    return error(
      "Dandanplay connection failed or timed out. Check the server's network access.",
      502,
    );
  }
}

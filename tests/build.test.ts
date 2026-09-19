import { expect, test } from "bun:test";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildRelease, injectCredentials } from "../scripts/build";

const source =
  'const AppId = "<ENTER_APP_ID>";\nconst AppSecret = "<ENTER_APP_SECRET>";\nexport const credentials = [AppId, AppSecret];';
const keys = {
  appId: 'const AppId = "test-app";',
  appSecret:
    'function decode() { return "test-$&-secret"; } const AppSecret = decode();',
};

test("credential injection preserves literal replacement characters and rejects missing placeholders", () => {
  expect(injectCredentials(source, keys)).toContain(keys.appSecret);
  expect(() => injectCredentials(source, { ...keys, appId: "" })).toThrow();
  expect(() => injectCredentials(source + source, keys)).toThrow();
  expect(() => injectCredentials("no placeholders", keys)).toThrow();
});

test("release builds leave source untouched and preserve the last release on failure", async () => {
  const root = await mkdtemp(join(tmpdir(), "danmaku-build-test-"));
  try {
    await mkdir(join(root, "src"));
    await Bun.write(join(root, "src/dandanplay.ts"), source);
    await Bun.write(
      join(root, "src/index.tsx"),
      'import { credentials } from "./dandanplay"; console.log(credentials);',
    );
    await Bun.write(
      join(root, "src/meta.ts"),
      "// ==UserScript==\n// @version 0.0.7\n// ==/UserScript==\n",
    );
    await buildRelease(root, keys);
    const release = await Bun.file(join(root, "dist/danmu.user.js")).text();
    expect(release).toStartWith("// ==UserScript==");
    expect(release).toContain("test-app");
    expect(release).not.toContain("<ENTER_");
    expect(await Bun.file(join(root, "src/dandanplay.ts")).text()).toBe(source);
    let failed = false;
    try {
      await buildRelease(root, { ...keys, appSecret: "const AppSecret = ;" });
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
    expect(await Bun.file(join(root, "dist/danmu.user.js")).text()).toBe(
      release,
    );
    expect(await Bun.file(join(root, "src/dandanplay.ts")).text()).toBe(source);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

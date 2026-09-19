import { mkdir, realpath, rename, rm } from "node:fs/promises";
import { resolve } from "node:path";

interface KeyDeclarations {
  appId: string;
  appSecret: string;
}

/** Callback replacements preserve literal $, &, and obfuscated helper declarations. */
export function injectCredentials(
  source: string,
  keys: KeyDeclarations,
): string {
  for (const [name, placeholder, declaration] of [
    ["AppId", "<ENTER_APP_ID>", keys.appId],
    ["AppSecret", "<ENTER_APP_SECRET>", keys.appSecret],
  ] as const) {
    if (
      !declaration ||
      !new RegExp(`\\bconst\\s+${name}\\s*=`).test(declaration)
    )
      throw new Error("Invalid key.sh declarations");
    const target = `const ${name} = "${placeholder}";`;
    if (source.split(target).length !== 2)
      throw new Error("Expected exactly one credential placeholder");
    source = source.replace(target, () => declaration);
  }
  return source;
}

export async function buildRelease(
  root: string,
  keys: KeyDeclarations,
): Promise<void> {
  const apiPath = await realpath(resolve(root, "src/dandanplay.ts"));
  const source = injectCredentials(await Bun.file(apiPath).text(), keys);
  const state = { injected: false };
  const build = await Bun.build({
    entrypoints: [resolve(root, "src/index.tsx")],
    target: "browser",
    minify: true,
    plugins: [
      {
        name: "release-credentials",
        setup(builder) {
          builder.onLoad({ filter: /[/\\]dandanplay\.ts$/ }, (args) => {
            if (args.path === apiPath) {
              state.injected = true;
              return { contents: source, loader: "ts" };
            }
            return undefined;
          });
        },
      },
    ],
  });
  const output = build.outputs[0];
  // Compiler diagnostics can quote injected declarations; never log them.
  if (!build.success || !output || !state.injected)
    throw new Error(
      "Release build failed. Run typecheck and the credential-free build to diagnose source errors; otherwise check key.sh declarations.",
    );
  const metadata = await Bun.file(resolve(root, "src/meta.ts")).text();
  const directory = resolve(root, "dist");
  await mkdir(directory, { recursive: true });
  const temporary = resolve(directory, `.danmu-${crypto.randomUUID()}.tmp`);
  try {
    await Bun.write(temporary, metadata + "\n" + (await output.text()));
    await rename(temporary, resolve(directory, "danmu.user.js"));
  } finally {
    await rm(temporary, { force: true });
  }
}

if (import.meta.main) {
  try {
    await buildRelease(resolve(import.meta.dir, ".."), {
      appId: process.env.APP_ID ?? "",
      appSecret: process.env.APP_SECRET ?? "",
    });
    console.log("Built dist/danmu.user.js");
  } catch {
    console.error(
      "Release build failed; source and existing release are unchanged. Check key.sh, then run typecheck and the credential-free build.",
    );
    process.exitCode = 1;
  }
}

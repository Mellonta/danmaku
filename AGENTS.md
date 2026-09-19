# Repository guidance

## Purpose

This is a Tampermonkey/Violentmonkey userscript that displays Dandanplay bullet
comments over the Plex web player. The application uses React 19, Ant Design 6,
TypeScript, and Bun. The installable artifact is `dist/danmu.user.js`.

## Local workflow

- Install the locked dependencies with `bun install --frozen-lockfile`.
- Run `bun run dev` for the local player harness at http://127.0.0.1:5173.
  It uses the real userscript entry and a synthetic media clock. Offline fixtures
  need no keys; live mode is the default and uses the existing key.sh through a
  loopback-only Dandanplay proxy. Neither mode needs Plex or downloaded video.
  Use the production controls in the player bar; fixtures and diagnostics are
  under Developer tools. Source edits reload into live mode. Keep harness-only
  behavior in `dev/`, outside release entry points.
- Type-check application and tests with `bun run typecheck`.
- Check lint without modifying files with `bun run lint:check`.
- Run the regression suite with `bun test` (Bun with Happy DOM).
- `bun run lint` applies ESLint fixes; `bun run prettier` formats source and harness files.
- For a build check without credentials or changes to `dist`, run
  `bun build ./src/index.tsx --minify --outfile /tmp/danmu-check.js`.
- Build the installable userscript locally with `bash -e build.sh`.

Keep the existing `key.sh` and `build.sh` release workflow unless the user asks to
change it. `key.sh` is ignored by Git. Its `APP_ID` and `APP_SECRET` values are
JavaScript declarations used to replace the exact `AppId` and `AppSecret`
placeholder declarations in `src/dandanplay.ts`; preserve that contract.

The build sources key.sh without tracing, then runs scripts/build.ts. It injects
credential declarations in memory and atomically replaces dist/danmu.user.js only
after bundling succeeds. Source files are never rewritten. Do not log compiler
diagnostics from the credential-injected build: they may quote declarations.

Shared credentials are intentionally embedded in the distributed userscript.
Do not commit `key.sh`, print its values, or introduce a server, credential setup
screen, or GitHub Actions release pipeline without a user request.

## Architecture and conventions

- `dev/main.ts` wires the harness; `player.ts` owns its media/DOM lifecycle,
  `request-log.ts` tracks requests by unique ID, and `title-lab.ts` owns diagnostics.
- `app.tsx` composes settings, `usePlexPlayer`, and `useComments`.
- `useComments` owns candidate search and corrections; `useEpisodeComments`
  owns cancellable comment loading. Ambiguous or
  truncated search results require selection. `match-storage.ts` persists only
  explicit corrections by normalized title on the current origin; reset must
  remove the correction. Conversion changes must not repeat the title search.
- `plex.ts` owns DOM selectors and observation; `title.ts` parses episode titles.
- `dandanplay.ts` owns signed, cancellable API requests and response validation;
  `signature.ts` implements the signing algorithm.
- `comments.ts` converts API comments to the renderer's public comment type.
- `components/` contains the menu, settings, buttons, and overlay. Each effect
  owns the DOM nodes, observers, or timers it creates and removes them on cleanup.
- Keep Plex DOM integration, API requests, comment conversion, and UI concerns
  separate. Centralize Plex selectors; hashed class names can change upstream.
- Dandanplay requests use `GM_xmlhttpRequest` for cross-origin access, with
  `anonymous: true`. Sign the API path with the existing SHA-256/base64 scheme.
- Treat network responses as `unknown` and validate the fields the app consumes.
- Prefer descriptive names, explicit public types, narrow unions, and type-only
  imports. Use `.ts` for modules without JSX. Avoid `any`, unchecked assertions,
  duplicated library types, and unnecessary state or effects.
- Async work must handle failures and ignore or abort stale requests. Effects
  must clean up observers, timers, event handlers, and rendering instances,
  including when React StrictMode repeats mounting.
- Preserve the existing control layout, conversion options, and exclusion of
  bottom comments unless the user requests a behavior change.
- Add focused regression coverage for meaningful behavior changes. Run type
  checking, lint, tests when present, and a bundle build before completing work.

## Releases

`dist/danmu.user.js` is tracked. Treat existing changes to it as user work; do not
silently replace them during a source-only check. When preparing a new release,
bump `@version` in `src/meta.ts` and rebuild the artifact using the local workflow.

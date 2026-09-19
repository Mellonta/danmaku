# Plex 弹幕

网页客户端的弹幕插件，支持 Plex 4.116

[ViolentMonkey](https://violentmonkey.github.io) 或者 [TamperMonkey](https://www.tampermonkey.net) 加载 [dist/danmu.user.js](dist/danmu.user.js)

## Demo

![demo](demo/screenshot.png)

### 设置栏

![menu](demo/menu.png)

## Alternatives

[lsl330/plex-danmaku](https://github.com/lsl330/plex-danmaku)

[Mr-Quin/danmaku-anywhere](https://github.com/Mr-Quin/danmaku-anywhere)

## Useful Links

[AutoBangumi](https://www.autobangumi.org)

[弹弹Play API](https://api.dandanplay.net/swagger/ui/index)

[Plex命名规范](https://support.plex.tv/articles/naming-and-organizing-your-tv-show-files)

[weizhenye/Danmaku](https://github.com/weizhenye/Danmaku)

## Development

### Matching an episode

Click the danmaku gear icon to see matching status and settings.
Choose **Search / match episode** to open **弹弹play · Match episode**:

- A single complete search result loads automatically. Multiple results (or
  a truncated result set) show **Choose match** and wait for your selection.
- Edit the series name or episode to correct a mismatch. You can choose
  **Original search** or **New search (v2)**; original search remains the default.
- Clicking a candidate saves a correction for the exact normalized Plex title
  in this site's browser storage. Reopening that title skips search and loads
  the chosen episode. This is not a season-wide rule or a stable Plex item ID;
  identical titles on the same origin share the correction.
- **Reset match** removes the saved correction and restores the parsed query.
  **Reload comments** retries the selected episode without searching again.
- Status distinguishes searching, choosing, no match, loading, no comments,
  and errors. Changing Chinese conversion reloads only the selected episode's
  comments. Automatic matches are not persisted.

The source integrates the [弹弹play开放弹幕网络](https://www.dandanplay.com).

Install Bun and a Node.js version supported by ESLint 10 (for example, Node 24).

```sh
bun install --frozen-lockfile
bun run typecheck
bun run lint:check
bun test
```

`bun run lint` applies lint fixes; `bun run prettier` formats `src/` and `dev/`.
Tests use mocked Dandanplay requests and Happy DOM; they do not need API keys or
a running Plex server.

The application is organized around two hooks: `usePlexPlayer` tracks the current
player DOM and title, and `useComments` manages candidate selection and comment
loading with separate cancellable requests. `match-storage.ts` stores explicit
corrections. API validation lives in `dandanplay.ts`, title parsing in `title.ts`,
and comment conversion in `comments.ts`. Components own the menu and overlay
elements they attach to Plex.

### Local player harness

```sh
bun run dev
```

Open http://127.0.0.1:5173. The player uses **live Dandanplay by default** with
credentials from your existing `key.sh`. No Plex server, downloaded video, or
userscript manager is needed.

Enter the Plex browser title and click **Load title**. Use the same danmaku
switch and settings icon in the playback bar as in production.
Open the gear menu and choose **Search / match episode** to correct a title, search, choose an episode, or reset a saved
match. All of these are the actual production components, with no separate
harness search override. Press Play or seek along the one-hour simulated timeline
to see comments at their recorded timestamps.

The harness bundles the real `src/index.tsx` entry point with React StrictMode,
a Plex-shaped DOM, and a simulated video clock. Edits to `src/` or `dev/` reload
the page into live mode. Compile errors appear on the page and in the terminal.
The development server binds only to loopback.

**Developer tools** contains request logs, parsed queries, raw responses,
lifecycle checks, and a comparison of original/v2 live search. For tests without
keys or a network connection, explicitly select **Use offline fixtures** there.
Offline mode returns canned Local Orbit results and ignores search text; the
mode badge makes this visible. **Load title** returns to live mode.
Saved corrections persist across reloads; reset them in the match picker when
testing search scenarios again.

Live requests use the existing ignored `key.sh`, including obfuscated JavaScript
declarations. A development-only proxy reads the file and signs requests using
the shared signature helper and [Dandanplay's documented authentication](https://doc.dandanplay.com/open/).
Credentials stay in the server process; the proxy accepts only episode searches
and comment reads against `api.dandanplay.net`. It does not inject keys into
source, run `build.sh`, or regenerate `dist/`. Live requests run on page load and subsequent title/player/settings actions. Network access to Dandanplay is required for live tests.

- Play, pause, restart, seek, and change speed; use the actual userscript icons
  to toggle comments and adjust conversion, opacity, and font size.
- Change episodes, resize or minimize the player, close and reopen the same
  episode, or replace its DOM to exercise lifecycle cleanup.
- Choose empty results, malformed data, HTTP errors, network failures, or
  timeouts. Increase response delay and quickly switch episodes to check
  cancellation in the request log. Timeout scenarios fire after the chosen
  delay instead of waiting for the production 15-second deadline.
- Check **Live state**: successful playback should have one overlay and one
  menu; closing the player should leave neither.

Edit `dev/fixtures.ts` for sample API data, `dev/media.ts` for the synthetic
timeline, and `dev/index.html` / `dev/style.css` for the surrounding player.
The same gear popup anchors to its button in both Plex and the harness. Live mode verifies title parsing and API matching, but it cannot verify
the DOM of your installed Plex version, video decoding/buffering, or userscript
manager permissions; do a final smoke test in Plex before releasing.

## Local build

Keep `key.sh` in the repository root (it is ignored by Git). It supplies `APP_ID`
and `APP_SECRET` as JavaScript declaration strings, which the build substitutes
in memory for the placeholder declarations in `src/dandanplay.ts`.

```sh
bash -e build.sh
```

This generates `dist/danmu.user.js` with the shared credentials embedded.
`build.sh` loads the declarations and runs `scripts/build.ts`, which injects them
in memory. Source files stay unchanged, and a failed build preserves the previous
release. For a release, increment `@version` in `src/meta.ts` before building and install the generated userscript
in Tampermonkey or Violentmonkey.

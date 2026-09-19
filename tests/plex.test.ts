import { afterEach, expect, test } from "bun:test";
import { observePlexPlayer, readPlexPlayer } from "../src/plex";

let disconnect: (() => void) | undefined;
afterEach(() => {
  disconnect?.();
  disconnect = undefined;
  document.body.replaceChildren();
});

async function flushMutations() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function createPlayer() {
  const plex = document.createElement("div");
  plex.id = "plex";
  plex.className = "show-video-player extra-class";
  plex.innerHTML = `
    <div class="extra Player-fullPlayerContainer-newHash"><video></video></div>
    <div class="PlayerControls-buttonGroupCenter-newHash extra"></div>
  `;
  return plex;
}

test("detects players mounted later and replaced by Plex", async () => {
  let changes = 0;
  disconnect = observePlexPlayer(() => {
    changes++;
  });
  expect(readPlexPlayer().container).toBeNull();
  const first = createPlayer();
  document.body.appendChild(first);
  await flushMutations();
  expect(readPlexPlayer().container).toBe(first.querySelector("div"));
  expect(readPlexPlayer().media).toBe(first.querySelector("video"));
  expect(readPlexPlayer().minimized).toBe(false);
  const replacement = createPlayer();
  first.replaceWith(replacement);
  await flushMutations();
  expect(readPlexPlayer().controls).toBe(
    replacement.querySelector<HTMLElement>("div:last-child"),
  );
  expect(changes).toBeGreaterThanOrEqual(3);
});

test("observes title text edits and minimized state", async () => {
  const plex = createPlayer();
  document.body.appendChild(plex);
  document.title = "Show - S1 · E1";
  const titleText = document.querySelector("title")?.firstChild;
  if (!titleText) throw new Error("Missing fixture title");
  let changes = 0;
  disconnect = observePlexPlayer(() => {
    changes++;
  });
  titleText.textContent = "▶ Show - S1 · E2";
  plex.classList.remove("show-video-player");
  await flushMutations();
  expect(readPlexPlayer().title).toBe("Show - S1 · E2");
  expect(readPlexPlayer().minimized).toBe(true);
  expect(changes).toBeGreaterThan(1);
});

test("ignores comment rendering and stops after cleanup", async () => {
  const overlay = document.createElement("div");
  overlay.setAttribute("data-danmaku-root", "");
  document.body.appendChild(overlay);
  let changes = 0;
  disconnect = observePlexPlayer(() => {
    changes++;
  });
  overlay.appendChild(document.createElement("span"));
  await flushMutations();
  expect(changes).toBe(1);
  disconnect();
  document.body.appendChild(createPlayer());
  await flushMutations();
  expect(changes).toBe(1);
});

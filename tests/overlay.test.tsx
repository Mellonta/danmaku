import { afterEach, beforeEach, expect, test } from "bun:test";
import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import DanmakuOverlay from "../src/components/danmaku-overlay";

const originalResizeObserver = globalThis.ResizeObserver;
const observers: TestResizeObserver[] = [];
class TestResizeObserver implements ResizeObserver {
  disconnected = false;
  constructor(private readonly callback: ResizeObserverCallback) {
    observers.push(this);
  }
  observe(): void {
    /* Size changes are driven explicitly by the test. */
  }
  unobserve(): void {
    /* The production component disconnects the observer. */
  }
  disconnect(): void {
    this.disconnected = true;
  }
  resize(): void {
    this.callback([], this);
  }
}

let root: Root;
let rootNode: HTMLElement;
let container: HTMLElement;
let media: HTMLVideoElement;
const comments = [{ cid: 1, p: "1,1,16777215", m: "Hello" }];

async function render(enabled = true, fontSize = 25) {
  await act(async () => {
    root.render(
      <StrictMode>
        <DanmakuOverlay
          container={container}
          media={media}
          enabled={enabled}
          comments={comments}
          fontSize={fontSize}
          opacity={90}
        />
      </StrictMode>,
    );
    await Promise.resolve();
  });
}

beforeEach(() => {
  observers.length = 0;
  globalThis.ResizeObserver = TestResizeObserver;
  container = document.createElement("div");
  media = document.createElement("video");
  container.appendChild(media);
  rootNode = document.createElement("div");
  document.body.append(container, rootNode);
  root = createRoot(rootNode);
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
    await Promise.resolve();
  });
  container.remove();
  rootNode.remove();
  globalThis.ResizeObserver = originalResizeObserver;
});

test("keeps one overlay under StrictMode and removes it when disabled", async () => {
  await render();
  expect(container.querySelectorAll("[data-danmaku-root]")).toHaveLength(1);
  await render(true, 30);
  expect(container.querySelectorAll("[data-danmaku-root]")).toHaveLength(1);
  await render(false);
  expect(container.querySelectorAll("[data-danmaku-root]")).toHaveLength(0);
  expect(observers.every((observer) => observer.disconnected)).toBe(true);
});

test("resizes the renderer when its container changes size", async () => {
  await render();
  const overlay = container.querySelector<HTMLElement>("[data-danmaku-root]");
  const observer = observers.at(-1);
  if (!overlay || !observer) throw new Error("Missing overlay fixture");
  Object.defineProperties(overlay, {
    offsetWidth: { value: 1280 },
    offsetHeight: { value: 720 },
  });
  observer.resize();
  const stage = overlay.firstElementChild;
  expect(stage?.getAttribute("style")).toContain("width: 1280px");
  expect(stage?.getAttribute("style")).toContain("height: 720px");
});

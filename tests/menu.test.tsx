import { expect, test } from "bun:test";
import { act } from "react";
import { createRoot } from "react-dom/client";
import DanmakuMenu from "../src/components/danmaku-menu";
import { ChineseConversion } from "../src/dandanplay";
import type { CommentMatch } from "../src/hooks/use-comments";
import { getPopupContainer, POPUP_Z_INDEX } from "../src/components/popup";

const noop = () => {
  /* UI-only fixture. */
};
const match: CommentMatch = {
  title: "Series - S1 · E1",
  query: { title: "Series", episode: "1" },
  v2: false,
  status: "no-match",
  selected: null,
  candidates: [],
  hasMore: false,
  saved: false,
  storageError: null,
  error: null,
  comments: [],
  search: noop,
  choose: noop,
  reset: noop,
  retryComments: noop,
};

async function click(button: HTMLButtonElement | null): Promise<void> {
  if (!button) throw new Error("Missing control");
  await act(async () => {
    button.click();
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
}

test("gear menu opens search above the player, even with danmaku disabled", async () => {
  const host = document.createElement("div");
  const controls = document.createElement("div");
  const fullscreen = document.createElement("div");
  document.body.append(host, controls, fullscreen);
  const original = Object.getOwnPropertyDescriptor(
    document,
    "fullscreenElement",
  );
  Object.defineProperty(document, "fullscreenElement", {
    configurable: true,
    value: fullscreen,
  });
  const root = createRoot(host);
  try {
    await act(async () => {
      root.render(
        <DanmakuMenu
          container={controls}
          match={match}
          enabled={false}
          onToggle={noop}
          fontSize={25}
          opacity={90}
          conversion={ChineseConversion.None}
          onFontSizeChange={noop}
          onOpacityChange={noop}
          onConversionChange={noop}
        />,
      );
      await Promise.resolve();
    });
    expect(controls.textContent).toBe("");
    const gear = controls.querySelector<HTMLButtonElement>(
      'button[aria-label="弹幕设置"]',
    );
    expect(gear?.disabled).toBe(false);
    expect(getPopupContainer()).toBe(fullscreen);
    await click(gear);
    expect(gear?.getAttribute("aria-expanded")).toBe("true");
    const search = [...fullscreen.querySelectorAll("button")].find((button) =>
      button.textContent.includes("Search / match episode"),
    );
    await click(search ?? null);
    expect(fullscreen.querySelector('[role="dialog"]')).not.toBeNull();
    expect(fullscreen.querySelector("#danmaku-anime")).not.toBeNull();
    const wrapper = fullscreen.querySelector<HTMLElement>(".ant-modal-wrap");
    expect(wrapper?.style.zIndex).toBe(String(POPUP_Z_INDEX));
    expect(gear?.getAttribute("aria-expanded")).toBe("false");
    const selector = fullscreen.querySelector<HTMLElement>(".ant-select");
    if (!selector) throw new Error("Missing search-engine selector");
    await act(async () => {
      selector.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      selector.click();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    const dropdown = document.querySelector(".ant-select-dropdown");
    expect(dropdown).not.toBeNull();
    expect(fullscreen.contains(dropdown)).toBe(true);
  } finally {
    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    if (original)
      Object.defineProperty(document, "fullscreenElement", original);
    else Reflect.deleteProperty(document, "fullscreenElement");
    host.remove();
    controls.remove();
    fullscreen.remove();
  }
});

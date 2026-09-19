import { afterEach, expect, test } from "bun:test";
import { readMatch, writeMatch } from "../src/match-storage";

const originalStorage = Object.getOwnPropertyDescriptor(
  globalThis,
  "localStorage",
);
afterEach(() => {
  if (originalStorage)
    Object.defineProperty(globalThis, "localStorage", originalStorage);
  localStorage.clear();
});

test("validates stored corrections and keeps separate episode titles", () => {
  const candidate = { episodeId: 123, animeTitle: "Show", episodeTitle: "One" };
  expect(writeMatch("Show - S1 · E1", candidate)).toBe(true);
  expect(readMatch("Show - S1 · E1")).toEqual(candidate);
  expect(readMatch("Show - S1 · E2")).toBeNull();
  localStorage.setItem("danmaku:match:v1:Broken", '{"episodeId":-1}');
  expect(readMatch("Broken")).toBeNull();
  expect(writeMatch("Show - S1 · E1", null)).toBe(true);
  expect(readMatch("Show - S1 · E1")).toBeNull();
});

test("storage failures do not prevent playback or silently claim persistence", () => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() {
      throw new Error("Storage blocked");
    },
  });
  expect(readMatch("Show")).toBeNull();
  expect(
    writeMatch("Show", {
      episodeId: 1,
      animeTitle: "Show",
      episodeTitle: "One",
    }),
  ).toBe(false);
  expect(writeMatch("Show", null)).toBe(false);
});

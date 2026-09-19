import { expect, test } from "bun:test";
import { normalizePlexTitle, parsePlexTitle } from "../src/title";

test.each([
  ["Show - S1 · E2", "Show", "2"],
  ["Show - S01 · E02", "Show", "2"],
  ["Show - S2 · E3", "Show 第二季", "3"],
  ["Show - S21 · E3", "Show 第二十一季", "3"],
  ["Show - S100 · E3", "Show 第100季", "3"],
  ["Movie", "Movie", "movie"],
])("parses %s", (title, expectedTitle, episode) => {
  expect(parsePlexTitle(title)).toEqual({ title: expectedTitle, episode });
});

test("normalizes playback markers and ignores Plex navigation titles", () => {
  expect(normalizePlexTitle(" ▶ Show - S1 · E1 ")).toBe("Show - S1 · E1");
  expect(normalizePlexTitle("Plex")).toBeNull();
  expect(normalizePlexTitle(" ")).toBeNull();
});

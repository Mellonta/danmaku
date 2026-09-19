import { afterEach, describe, expect, test } from "bun:test";
import { createMediaClock } from "../dev/media";
import { installMockRequests } from "../dev/fixtures";
import { createRequestLog, type RequestRecord } from "../dev/request-log";
import {
  ChineseConversion,
  fetchComments,
  searchEpisodes,
} from "../src/dandanplay";

const originalRequest = Object.getOwnPropertyDescriptor(
  globalThis,
  "GM_xmlhttpRequest",
);
afterEach(() => {
  if (originalRequest)
    Object.defineProperty(globalThis, "GM_xmlhttpRequest", originalRequest);
  else Reflect.deleteProperty(globalThis, "GM_xmlhttpRequest");
});

describe("harness media clock", () => {
  test("advances only while playing and honors speed, seeks, and the end", async () => {
    const video = document.createElement("video");
    const clock = createMediaClock(video, 10);
    const events: string[] = [];
    for (const name of [
      "play",
      "playing",
      "pause",
      "seeking",
      "seeked",
      "ended",
    ]) {
      video.addEventListener(name, () => {
        events.push(name);
      });
    }
    clock.advance(2);
    expect(video.currentTime).toBe(0);
    await video.play();
    clock.advance(2);
    expect(video.currentTime).toBe(2);
    video.playbackRate = 2;
    clock.advance(2);
    expect(video.currentTime).toBe(6);
    video.pause();
    clock.advance(1);
    expect(video.currentTime).toBe(6);
    video.currentTime = 9;
    await video.play();
    clock.advance(1);
    expect(video.currentTime).toBe(10);
    expect(video.paused).toBe(true);
    expect(video.ended).toBe(true);
    expect(events).toEqual([
      "play",
      "playing",
      "pause",
      "seeking",
      "seeked",
      "play",
      "playing",
      "pause",
      "ended",
    ]);
    await video.play();
    expect(video.currentTime).toBe(0);
    expect(video.paused).toBe(false);
  });
});

describe("harness API fixtures with the real client", () => {
  test("returns episode-specific comments and conversion variants", async () => {
    installMockRequests(
      () => ({ scenario: "normal", latency: 0 }),
      () => {
        /* This test only asserts the API result. */
      },
    );
    const id = await searchEpisodes({ title: "Local Orbit", episode: "2" });
    expect(id.candidates[0]?.episodeId).toBe(2);
    const comments = await fetchComments(2, ChineseConversion.Traditional);
    expect(comments[0]?.m).toContain("E2 · 彈幕測試 · 繁體");
    expect(comments.length).toBeGreaterThan(50);
  });

  test("supports no-match and empty-comment states", async () => {
    installMockRequests(
      () => ({ scenario: "no-match", latency: 0 }),
      () => {
        /* This test only asserts the API result. */
      },
    );
    expect(
      (await searchEpisodes({ title: "Local Orbit", episode: "1" })).candidates,
    ).toEqual([]);
    installMockRequests(
      () => ({ scenario: "empty", latency: 0 }),
      () => {
        /* This test only asserts the API result. */
      },
    );
    expect(await fetchComments(1, ChineseConversion.None)).toEqual([]);
  });

  for (const scenario of [
    "http-error",
    "network-error",
    "timeout",
    "invalid",
  ] as const) {
    test(`rejects the ${scenario} fixture`, async () => {
      installMockRequests(
        () => ({ scenario, latency: 0 }),
        () => {
          /* This test only asserts the API result. */
        },
      );
      let error: unknown;
      try {
        await fetchComments(1, ChineseConversion.None);
      } catch (caught) {
        error = caught;
      }
      expect(error).toBeInstanceOf(Error);
    });
  }

  test("aborts delayed requests without delivering a response", async () => {
    const updates: RequestRecord[] = [];
    installMockRequests(
      () => ({ scenario: "normal", latency: 10 }),
      (record) => {
        updates.push({ ...record });
      },
    );
    const controller = new AbortController();
    const result = searchEpisodes(
      { title: "Local Orbit", episode: "1" },
      controller.signal,
    ).catch((error: unknown) => error);
    controller.abort();
    expect(await result).toBeInstanceOf(DOMException);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(updates.map(({ status }) => status)).toEqual(["pending", "aborted"]);
  });
});

test("request logs keep overlapping requests distinct across transport reinstalls", async () => {
  const list = document.createElement("ol");
  const log = createRequestLog(list);
  const install = () => {
    installMockRequests(() => ({ scenario: "normal", latency: 0 }), log.update);
  };
  install();
  const first = searchEpisodes({ title: "Local Orbit", episode: "1" });
  install();
  const second = searchEpisodes({ title: "Local Orbit", episode: "1" });
  await Promise.all([first, second]);
  expect(list.children).toHaveLength(2);
  expect(
    [...list.querySelectorAll(".request-status")].map(
      (item) => item.textContent,
    ),
  ).toEqual(["200", "200"]);
  log.clear();
  expect(list.children).toHaveLength(0);
});

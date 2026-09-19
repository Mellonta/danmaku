import { expect, test } from "bun:test";
import {
  declarationValue,
  downloadRedirect,
  proxyDandanplay,
  upstreamUrl,
} from "../dev/live-proxy";
import { describeSearch } from "../dev/title-lab";

test("loads literal and obfuscated build declarations without exposing them", () => {
  expect(declarationValue('const AppId = "test-app";', "AppId")).toBe(
    "test-app",
  );
  expect(
    declarationValue(
      "function decode(){return ['test','secret'].join('-')} const AppSecret = decode();",
      "AppSecret",
    ),
  ).toBe("test-secret");
  expect(() =>
    declarationValue('const AppId = "<ENTER_APP_ID>";', "AppId"),
  ).toThrow();
  expect(() =>
    declarationValue("const AppSecret = process.env.SECRET;", "AppSecret"),
  ).toThrow();
});

test("allows only the userscript's read-only Dandanplay routes", () => {
  expect(
    upstreamUrl(
      "/api/v2/search/episodes?anime=A%26B&episode=1",
    ).searchParams.get("anime"),
  ).toBe("A&B");
  expect(
    upstreamUrl("/api/v2/comment/123?withRelated=true&chConvert=2").hostname,
  ).toBe("api.dandanplay.net");
  for (const path of [
    "https://example.com",
    "//example.com",
    "/key.sh",
    "/api/v2/search/episodes?url=https://example.com",
    "/api/v2/comment/0",
  ]) {
    expect(() => upstreamUrl(path)).toThrow();
  }
});

test("rejects cross-origin proxy calls before accessing credentials", async () => {
  const request = new Request("http://127.0.0.1:5173/dandanplay", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ path: "/api/v2/search/episodes" }),
  });
  // Happy DOM strips browser-forbidden headers during Request construction.
  request.headers.set("Origin", "https://example.com");
  const response = await proxyDandanplay(request);
  expect(response.status).toBe(403);
});

test("accepts HTTPS Dandanplay download redirects only", () => {
  const base = new URL("https://api.dandanplay.net/api/v2/comment/123");
  expect(
    downloadRedirect("https://cas2.dandanplay.net/comments/123", base).hostname,
  ).toBe("cas2.dandanplay.net");
  for (const location of [
    "http://cas2.dandanplay.net/comments/123",
    "https://dandanplay.net.example.com/",
    "https://127.0.0.1/",
    "https://user:pass@cas2.dandanplay.net/",
  ]) {
    expect(() => downloadRedirect(location, base)).toThrow();
  }
});

test("explains no matches separately from API errors", () => {
  expect(describeSearch({ success: true, animes: [] }).message).toContain(
    "No matching episode",
  );
  expect(
    describeSearch({ success: false, errorMessage: "Invalid app" }).message,
  ).toBe("Invalid app");
});

test("shows every candidate and reports ambiguity", () => {
  const summary = describeSearch({
    success: true,
    errorMessage: "",
    animes: [
      {
        animeTitle: "Series A",
        episodes: [
          { episodeId: 1, episodeTitle: "Episode 1" },
          { episodeId: 2, episodeTitle: "Episode 2" },
        ],
      },
      {
        animeTitle: "Series B",
        episodes: [{ episodeId: 3, episodeTitle: "Episode 1" }],
      },
    ],
  });
  expect(summary.candidates).toHaveLength(3);
  expect(summary.message).toContain("Multiple candidates");
  expect(summary.candidates[0]).toContain("Series A / Episode 1 (ID 1)");
  expect(summary.candidates[2]).toContain("Series B");
  expect(
    describeSearch({
      animes: [{ episodes: [] }, { episodes: [{ episodeId: 2 }] }],
    }).message,
  ).toContain("One candidate");
});

import { nextRequestId, type RequestRecord } from "./request-log";
import type { DandanplayComment } from "../src/dandanplay";

export type Scenario =
  | "normal"
  | "ambiguous"
  | "no-match"
  | "empty"
  | "http-error"
  | "network-error"
  | "timeout"
  | "invalid";

export function isScenario(value: string): value is Scenario {
  return [
    "normal",
    "ambiguous",
    "no-match",
    "empty",
    "http-error",
    "network-error",
    "timeout",
    "invalid",
  ].includes(value);
}

export function fixtureResponse(url: URL, scenario: Scenario): unknown {
  if (url.pathname === "/api/v2/search/episodes") {
    const episode = Number(url.searchParams.get("episode"));
    const episodeId =
      Number.isSafeInteger(episode) && episode > 0 ? episode : 1;
    return {
      success: true,
      animes:
        scenario === "no-match"
          ? []
          : [
              {
                animeTitle: "Local Orbit",
                episodes: [{ episodeId, episodeTitle: `Episode ${episodeId}` }],
              },
              ...(scenario === "ambiguous"
                ? [
                    {
                      animeTitle: "Local Orbit · Another season",
                      episodes: [
                        {
                          episodeId: episodeId + 100,
                          episodeTitle: `Episode ${episodeId}`,
                        },
                      ],
                    },
                  ]
                : []),
            ],
    };
  }
  if (scenario === "invalid") return { comments: [{ cid: "invalid" }] };
  if (scenario === "empty") return { comments: [] };
  const conversion = url.searchParams.get("chConvert");
  const caption =
    conversion === "1"
      ? "弹幕测试 · 简体"
      : conversion === "2"
        ? "彈幕測試 · 繁體"
        : "弹幕 / 彈幕 · 原文";
  const messages = [
    caption,
    "No video download needed",
    "Seeking keeps comments in sync",
    "Hello, local universe ✨",
    "Resize the player while playing",
    "日本語のコメントもテスト",
    "颜色、字号、不透明度",
    "Change episode to test cancellation",
  ];
  const colors = [16777215, 6737151, 16763904, 16742594];
  const comments: DandanplayComment[] = Array.from(
    { length: 100 },
    (_, index) => ({
      cid: index + 1,
      p: `${(index * 1.2).toFixed(1)},${index % 9 === 0 ? 5 : index % 13 === 0 ? 6 : 1},${colors[index % colors.length] ?? 16777215}`,
      m: `E${url.pathname.split("/").at(-1) ?? "1"} · ${messages[index % messages.length] ?? caption}`,
    }),
  );
  comments.push({
    cid: 101,
    p: "2,4,16777215",
    m: "Bottom comment: should be filtered out",
  });
  return { comments };
}

interface MockSettings {
  scenario: Scenario;
  latency: number;
}
export function installMockRequests(
  settings: () => MockSettings,
  onUpdate: (record: RequestRecord) => void,
) {
  Object.assign(globalThis, {
    GM_xmlhttpRequest(options: Tampermonkey.Request<undefined>) {
      if (typeof options.url !== "string")
        throw new Error("Expected a request URL");
      const url = new URL(options.url);
      const { scenario, latency } = settings();
      const record: RequestRecord = {
        id: nextRequestId(),
        path: url.pathname + url.search,
        scenario,
        status: "pending",
      };
      let settled = false;
      const finish = (status: string) => {
        settled = true;
        record.status = status;
        onUpdate(record);
      };
      onUpdate(record);
      const timer = setTimeout(() => {
        const response: Tampermonkey.Response<undefined> = {
          response: fixtureResponse(url, scenario),
          responseText: "",
          responseXML: null,
          responseHeaders: "",
          readyState: 4,
          status: scenario === "http-error" ? 503 : 200,
          statusText: scenario === "http-error" ? "Service Unavailable" : "OK",
          finalUrl: url.toString(),
          context: undefined,
        };
        if (scenario === "timeout") {
          finish("timeout");
          options.ontimeout?.();
        } else if (scenario === "network-error") {
          finish("network error");
          const error = {
            ...response,
            status: 0,
            error: "Simulated offline request",
          };
          options.onerror?.call(error, error);
        } else {
          finish(String(response.status));
          options.onload?.call(response, response);
        }
      }, latency);
      return {
        abort() {
          if (settled) return;
          clearTimeout(timer);
          finish("aborted");
          options.onabort?.();
        },
      };
    },
  });
}

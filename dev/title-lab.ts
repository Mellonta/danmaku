import { element } from "./dom";
import { parseEpisodeSearch } from "../src/dandanplay";
import { normalizePlexTitle, parsePlexTitle } from "../src/title";
import type { LiveRecord } from "./live-requests";

function node(id: string): HTMLElement {
  return element(id, HTMLElement);
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function describeSearch(data: unknown): {
  message: string;
  candidates: string[];
} {
  try {
    const result = parseEpisodeSearch(data);
    const candidates = result.candidates.map(
      (item) =>
        `${item.animeTitle} / ${item.episodeTitle} (ID ${item.episodeId})`,
    );
    const single = candidates.length === 1 && !result.hasMore;
    return {
      candidates,
      message: single
        ? `One candidate: ${candidates[0] ?? ""}`
        : candidates.length
          ? "Multiple candidates: use Choose match in the player controls."
          : "No matching episode. Try an alternate name or episode query.",
    };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "Invalid API response",
      candidates: [],
    };
  }
}

export function setupTitleLab(
  run: (title: string) => void,
  fixtures: () => void,
) {
  const title = element("plex-title", HTMLInputElement);
  const status = node("lookup-status");
  const matches = node("candidates");
  const response = node("api-response");
  const comments = node("comment-status");
  let searchSeen = false;
  function inspect() {
    const normalized = normalizePlexTitle(title.value);
    const query = normalized ? parsePlexTitle(normalized) : null;
    node("parsed-query").textContent = query
      ? `Normalized title: ${normalized ?? ""}\nanime = ${JSON.stringify(query.title)}\nepisode = ${JSON.stringify(query.episode)}${query.episode === "movie" ? "\nMovie fallback: the title did not match the Plex episode pattern." : ""}`
      : "The userscript ignores this title (empty or contains ‘Plex’). No request will be sent.";
  }
  let comparison: AbortController | null = null;
  node("compare-engines").onclick = () => {
    comparison?.abort();
    const controller = new AbortController();
    comparison = controller;
    const normalized = normalizePlexTitle(title.value);
    if (!normalized) {
      node("legacy-result").textContent = "Enter a playable Plex title first.";
      node("v2-result").textContent = "";
      return;
    }
    const query = parsePlexTitle(normalized);
    for (const v2 of [false, true]) {
      const target = node(v2 ? "v2-result" : "legacy-result");
      const name = v2 ? "v2" : "Original";
      target.textContent = `${name}: searching…`;
      void (async () => {
        try {
          const path =
            "/api/v2/search/episodes?" +
            new URLSearchParams({
              anime: query.title,
              episode: query.episode,
              v2: String(v2),
            }).toString();
          const response = await fetch("/dandanplay", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path }),
            signal: controller.signal,
          });
          const data: unknown = await response.json();
          if (controller.signal.aborted) return;
          const summary = describeSearch(data);
          target.textContent = `${name} · HTTP ${response.status}\n${summary.message}\n${summary.candidates.join("\n")}`;
        } catch (error) {
          if (!controller.signal.aborted)
            target.textContent = `${name}: ${error instanceof Error ? error.message : "Request failed"}`;
        }
      })();
    }
  };
  title.oninput = () => {
    comparison?.abort();
    node("legacy-result").textContent = "Original: not run";
    node("v2-result").textContent = "v2: not run";
    inspect();
  };
  inspect();
  function test() {
    searchSeen = false;
    node("actual-query").textContent = "";
    matches.replaceChildren();
    response.textContent = "";
    comments.textContent = "";
    node("lookup-mode").textContent = "LIVE · Dandanplay";
    document.body.dataset.mode = "live";
    status.textContent = normalizePlexTitle(title.value)
      ? "Waiting for the userscript search…"
      : "Title ignored by the userscript; no request sent.";
    run(title.value);
  }
  node("title-form").onsubmit = (event) => {
    event.preventDefault();
    test();
  };
  node("use-fixtures").onclick = () => {
    node("actual-query").textContent = "";
    node("lookup-mode").textContent =
      "OFFLINE · fake responses (search text ignored)";
    document.body.dataset.mode = "offline";
    status.textContent =
      "Fixture mode. Enter a Plex title and run a live test to diagnose matching.";
    matches.replaceChildren();
    response.textContent = "";
    comments.textContent = "";
    fixtures();
  };
  function report(result: LiveRecord) {
    if (result.status === "aborted") return;
    if (result.path.startsWith("/api/v2/search/episodes")) {
      searchSeen = true;
      node("actual-query").textContent = result.path;
      status.textContent = `Search: ${result.status}`;
      if (result.data !== undefined) {
        const description = describeSearch(result.data);
        status.textContent = `HTTP ${result.status} · ${description.message}`;
        matches.replaceChildren(
          ...description.candidates.map((text) => {
            const item = document.createElement("li");
            item.textContent = text;
            return item;
          }),
        );
        response.textContent = JSON.stringify(result.data, null, 2);
      }
    } else {
      if (!searchSeen)
        status.textContent =
          "Using a saved correction. Open the player's match controls to inspect it or Reset match to search again.";
      const data = result.data;
      comments.textContent =
        record(data) && Array.isArray(data.comments)
          ? `${data.comments.length} comments received from ${result.path}. Press Play to preview. Real comments may start later; seek through the timeline.`
          : `Comments: ${result.status}${record(data) && typeof data.errorMessage === "string" ? ` · ${data.errorMessage}` : ""}`;
    }
  }
  return { report, start: test };
}

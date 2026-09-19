import { generateSignature } from "./signature";
import type { EpisodeQuery } from "./title";

// build.sh replaces these exact declarations with the values from key.sh.
const AppId = "<ENTER_APP_ID>";
const AppSecret = "<ENTER_APP_SECRET>";

const API_ORIGIN = "https://api.dandanplay.net";
const REQUEST_TIMEOUT_MS = 15_000;

export enum ChineseConversion {
  None = 0,
  Simplified = 1,
  Traditional = 2,
}

export interface DandanplayComment {
  cid: number;
  p: string;
  m: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isComment(value: unknown): value is DandanplayComment {
  return (
    isRecord(value) &&
    typeof value.cid === "number" &&
    Number.isSafeInteger(value.cid) &&
    typeof value.p === "string" &&
    typeof value.m === "string"
  );
}

function parseResponse(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new Error("Invalid Dandanplay response");
  if (value.success === false) {
    throw new Error(
      typeof value.errorMessage === "string"
        ? value.errorMessage
        : "Dandanplay request failed",
    );
  }
  return value;
}

function requestJson(
  path: string,
  parameters: Record<string, string>,
  signal?: AbortSignal,
): Promise<unknown> {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const url = new URL(path, API_ORIGIN);
  url.search = new URLSearchParams(parameters).toString();

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Request aborted", "AbortError"));
      return;
    }

    let request: Tampermonkey.AbortHandle<void> | undefined;
    const cleanup = () => signal?.removeEventListener("abort", abort);
    const fail = (error: Error) => {
      cleanup();
      reject(error);
    };
    const abort = () => {
      fail(new DOMException("Request aborted", "AbortError"));
      request?.abort();
    };
    signal?.addEventListener("abort", abort, { once: true });

    try {
      request = GM_xmlhttpRequest({
        method: "GET",
        url: url.toString(),
        headers: {
          "X-AppId": AppId,
          "X-Timestamp": timestamp,
          "X-Signature": generateSignature(AppId, timestamp, path, AppSecret),
        },
        responseType: "json",
        anonymous: true,
        timeout: REQUEST_TIMEOUT_MS,
        onload: ({ status, response }) => {
          cleanup();
          if (status < 200 || status >= 300) {
            reject(new Error(`Dandanplay request failed (HTTP ${status})`));
            return;
          }
          const data: unknown = response;
          resolve(data);
        },
        onerror: () => {
          fail(new Error("Could not reach Dandanplay"));
        },
        ontimeout: () => {
          fail(new Error("Dandanplay request timed out"));
        },
        onabort: () => {
          fail(new DOMException("Request aborted", "AbortError"));
        },
      });
    } catch (error) {
      cleanup();
      reject(
        error instanceof Error
          ? error
          : new Error("Dandanplay request failed", { cause: error }),
      );
    }
  });
}

export async function fetchEpisodeId(
  query: EpisodeQuery,
  signal?: AbortSignal,
): Promise<number | null> {
  const response = parseResponse(
    await requestJson(
      "/api/v2/search/episodes",
      { anime: query.title, episode: query.episode },
      signal,
    ),
  );
  const animes: unknown = response.animes;
  if (!Array.isArray(animes))
    throw new Error("Invalid Dandanplay search results");
  const anime: unknown = animes[0];
  if (anime === undefined) return null;
  if (!isRecord(anime)) throw new Error("Invalid Dandanplay anime");
  const episodes: unknown = anime.episodes;
  if (episodes === undefined) return null;
  if (!Array.isArray(episodes)) throw new Error("Invalid Dandanplay episodes");
  const episode: unknown = episodes[0];
  if (episode === undefined) return null;
  if (
    !isRecord(episode) ||
    typeof episode.episodeId !== "number" ||
    !Number.isSafeInteger(episode.episodeId) ||
    episode.episodeId <= 0
  ) {
    throw new Error("Invalid Dandanplay episode ID");
  }
  return episode.episodeId;
}

export async function fetchComments(
  episodeId: number,
  conversion: ChineseConversion,
  signal?: AbortSignal,
): Promise<DandanplayComment[]> {
  const response = parseResponse(
    await requestJson(
      `/api/v2/comment/${episodeId}`,
      { withRelated: "true", chConvert: String(conversion) },
      signal,
    ),
  );
  const comments: unknown = response.comments;
  if (!Array.isArray(comments) || !comments.every(isComment)) {
    throw new Error("Invalid Dandanplay comments");
  }
  return comments;
}

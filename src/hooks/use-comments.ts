import { useEffect, useRef, useState } from "react";
import {
  searchEpisodes,
  type ChineseConversion,
  type DandanplayComment,
  type EpisodeCandidate,
} from "../dandanplay";
import { parsePlexTitle, type EpisodeQuery } from "../title";
import { readMatch, writeMatch } from "../match-storage";
import { useEpisodeComments } from "./use-episode-comments";

interface SearchRequest {
  title: string;
  query: EpisodeQuery;
  v2: boolean;
}
interface MatchState {
  title: string;
  phase: "searching" | "no-match" | "choose" | "selected" | "error";
  candidates: EpisodeCandidate[];
  hasMore: boolean;
  selected: EpisodeCandidate | null;
  saved: boolean;
  error: string | null;
}
export type MatchStatus =
  | "idle"
  | "searching"
  | "no-match"
  | "choose"
  | "loading"
  | "ready"
  | "empty"
  | "error";
export interface CommentMatch {
  title: string | null;
  query: EpisodeQuery;
  v2: boolean;
  status: MatchStatus;
  selected: EpisodeCandidate | null;
  candidates: readonly EpisodeCandidate[];
  hasMore: boolean;
  saved: boolean;
  storageError: string | null;
  error: string | null;
  comments: readonly DandanplayComment[];
  search(query: EpisodeQuery, useV2: boolean): void;
  choose(candidate: EpisodeCandidate): void;
  reset(): void;
  retryComments(): void;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Request failed";
}

export function useComments(
  title: string | null,
  conversion: ChineseConversion,
): CommentMatch {
  const [request, setRequest] = useState<SearchRequest | null>(null);
  const [match, setMatch] = useState<MatchState | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const searchController = useRef<AbortController | null>(null);
  const activeRequest = request?.title === title ? request : null;
  const query =
    activeRequest?.query ??
    (title ? parsePlexTitle(title) : { title: "", episode: "" });
  const v2 = activeRequest?.v2 ?? false;
  useEffect(() => {
    setRequest(null);
  }, [title]);

  useEffect(() => {
    setStorageError(null);
    if (!title) {
      setMatch(null);
      return;
    }
    const controller = new AbortController();
    searchController.current = controller;
    const saved = activeRequest ? null : readMatch(title);
    const initial: MatchState = {
      title,
      phase: saved ? "selected" : "searching",
      candidates: saved ? [saved] : [],
      hasMore: false,
      selected: saved,
      saved: Boolean(saved),
      error: null,
    };
    setMatch(initial);
    if (!saved) {
      void searchEpisodes(
        activeRequest?.query ?? parsePlexTitle(title),
        controller.signal,
        activeRequest?.v2 ?? false,
      )
        .then((response) => {
          if (controller.signal.aborted) return;
          const selected =
            response.candidates.length === 1 && !response.hasMore
              ? (response.candidates[0] ?? null)
              : null;
          setMatch({
            ...initial,
            ...response,
            selected,
            phase: selected
              ? "selected"
              : response.candidates.length
                ? "choose"
                : "no-match",
          });
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted)
            setMatch({ ...initial, phase: "error", error: message(error) });
        });
    }
    return () => {
      controller.abort();
    };
  }, [title, activeRequest]);

  const current = match?.title === title ? match : null;
  const selected = current?.selected ?? null;
  const episodeId = selected?.episodeId ?? null;
  const comments = useEpisodeComments(title, episodeId, conversion);

  function status(): MatchStatus {
    if (!title) return "idle";
    if (!current) return "searching";
    if (current.phase !== "selected") return current.phase;
    return comments.status;
  }
  return {
    title,
    query,
    v2,
    status: status(),
    selected,
    candidates: current?.candidates ?? [],
    hasMore: current?.hasMore ?? false,
    saved: current?.saved ?? false,
    storageError,
    error: current?.error ?? comments.error,
    comments: comments.comments,
    search(next: EpisodeQuery, useV2: boolean) {
      if (!title) return;
      searchController.current?.abort();
      setMatch(null);
      setRequest({ title, query: next, v2: useV2 });
    },
    choose(candidate: EpisodeCandidate) {
      if (!title || !current) return;
      searchController.current?.abort();
      const saved = writeMatch(title, candidate);
      setStorageError(
        saved
          ? null
          : "Match selected, but browser storage is unavailable. It will not be remembered.",
      );
      setMatch({
        ...current,
        selected: candidate,
        phase: "selected",
        saved,
        error: null,
      });
    },
    reset() {
      if (!title) return;
      if (!writeMatch(title, null)) {
        setStorageError(
          "Could not remove the saved match. Check browser storage permissions.",
        );
        return;
      }
      searchController.current?.abort();
      setMatch(null);
      setRequest({ title, query: parsePlexTitle(title), v2: false });
    },
    retryComments: comments.reload,
  };
}

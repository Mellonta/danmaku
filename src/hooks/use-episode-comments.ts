import { useEffect, useState } from "react";
import {
  fetchComments,
  type ChineseConversion,
  type DandanplayComment,
} from "../dandanplay";

interface CommentResult {
  title: string;
  episodeId: number;
  conversion: ChineseConversion;
  comments: readonly DandanplayComment[];
  error: string | null;
}

interface EpisodeComments {
  status: "loading" | "ready" | "empty" | "error";
  comments: readonly DandanplayComment[];
  error: string | null;
  reload: () => void;
}

const EMPTY_COMMENTS: readonly DandanplayComment[] = [];

/** Fetch comments independently of matching, so conversion never repeats a search. */
export function useEpisodeComments(
  title: string | null,
  episodeId: number | null,
  conversion: ChineseConversion,
): EpisodeComments {
  const [result, setResult] = useState<CommentResult | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    setResult(null);
    if (!title || episodeId === null) return;
    const controller = new AbortController();
    void fetchComments(episodeId, conversion, controller.signal)
      .then((comments) => {
        if (!controller.signal.aborted)
          setResult({ title, episodeId, conversion, comments, error: null });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setResult({
            title,
            episodeId,
            conversion,
            comments: EMPTY_COMMENTS,
            error: error instanceof Error ? error.message : "Request failed",
          });
      });
    return () => {
      controller.abort();
    };
  }, [title, episodeId, conversion, revision]);

  // Effects run after rendering; never expose a previous episode or conversion.
  const current =
    result?.title === title &&
    result.episodeId === episodeId &&
    result.conversion === conversion
      ? result
      : null;
  function status(): EpisodeComments["status"] {
    if (!current) return "loading";
    if (current.error) return "error";
    return current.comments.length ? "ready" : "empty";
  }
  return {
    status: status(),
    comments: current?.comments ?? EMPTY_COMMENTS,
    error: current?.error ?? null,
    reload() {
      setResult(null);
      setRevision((value) => value + 1);
    },
  };
}

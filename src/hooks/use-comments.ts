import { useEffect, useState } from "react";
import {
  fetchComments,
  fetchEpisodeId,
  type ChineseConversion,
  type DandanplayComment,
} from "../dandanplay";
import { parsePlexTitle } from "../title";

interface CommentResult {
  title: string;
  conversion: ChineseConversion;
  comments: readonly DandanplayComment[];
}

const EMPTY_COMMENTS: readonly DandanplayComment[] = [];

export function useComments(
  title: string | null,
  conversion: ChineseConversion,
): readonly DandanplayComment[] {
  const [result, setResult] = useState<CommentResult | null>(null);

  useEffect(() => {
    setResult(null);
    if (!title) return;
    const currentTitle = title;
    const controller = new AbortController();
    const { signal } = controller;

    async function loadComments(): Promise<void> {
      try {
        const episodeId = await fetchEpisodeId(
          parsePlexTitle(currentTitle),
          signal,
        );
        if (episodeId === null) return;
        signal.throwIfAborted();
        const comments = await fetchComments(episodeId, conversion, signal);
        if (!signal.aborted)
          setResult({ title: currentTitle, conversion, comments });
      } catch (error) {
        if (!signal.aborted)
          console.error("[Danmaku] Failed to load comments", error);
      }
    }

    void loadComments();
    return () => {
      controller.abort();
    };
  }, [title, conversion]);

  // Never render the previous episode's comments while the next effect starts.
  return result?.title === title && result.conversion === conversion
    ? result.comments
    : EMPTY_COMMENTS;
}

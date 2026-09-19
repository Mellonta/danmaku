import type { EpisodeCandidate } from "./dandanplay";
const PREFIX = "danmaku:match:v1:";
// Corrections are scoped to the normalized title on this Plex origin.
export function readMatch(title: string): EpisodeCandidate | null {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(PREFIX + title) ?? "null",
    );
    if (
      typeof value !== "object" ||
      value === null ||
      !("episodeId" in value) ||
      typeof value.episodeId !== "number" ||
      !Number.isSafeInteger(value.episodeId) ||
      value.episodeId <= 0 ||
      !("animeTitle" in value) ||
      typeof value.animeTitle !== "string" ||
      !("episodeTitle" in value) ||
      typeof value.episodeTitle !== "string"
    )
      return null;
    return {
      episodeId: value.episodeId,
      animeTitle: value.animeTitle,
      episodeTitle: value.episodeTitle,
    };
  } catch {
    return null;
  }
}
export function writeMatch(
  title: string,
  candidate: EpisodeCandidate | null,
): boolean {
  try {
    if (candidate)
      localStorage.setItem(PREFIX + title, JSON.stringify(candidate));
    else localStorage.removeItem(PREFIX + title);
    return true;
  } catch {
    return false;
  }
}

export interface EpisodeQuery {
  title: string;
  episode: string;
}

const EPISODE_TITLE = /^(.+?) - S(\d+) · E(\d+)/;
const CHINESE_DIGITS = [
  "零",
  "一",
  "二",
  "三",
  "四",
  "五",
  "六",
  "七",
  "八",
  "九",
];

function formatSeason(season: number): string {
  if (season < 10) return CHINESE_DIGITS[season] ?? String(season);
  if (season >= 100) return String(season);

  const tens = Math.floor(season / 10);
  const units = season % 10;
  const prefix = tens === 1 ? "" : CHINESE_DIGITS[tens];
  const suffix = units === 0 ? "" : CHINESE_DIGITS[units];
  return `${prefix ?? ""}十${suffix ?? ""}`;
}

export function normalizePlexTitle(title: string): string | null {
  const normalized = title.replace(/▶/g, "").trim();
  return !normalized || normalized.includes("Plex") ? null : normalized;
}

export function parsePlexTitle(title: string): EpisodeQuery {
  const match = EPISODE_TITLE.exec(title);
  const [, series, seasonText, episode] = match ?? [];
  if (!series || !seasonText || !episode) {
    return { title, episode: "movie" };
  }

  const season = Number(seasonText);
  return {
    title: season === 1 ? series : `${series} 第${formatSeason(season)}季`,
    episode: String(Number(episode)),
  };
}

export function toCHS(num: string): string | undefined {
  const numMap: Record<string, string> = {
    "1": "一",
    "2": "二",
    "3": "三",
    "4": "四",
    "5": "五",
    "6": "六",
    "7": "七",
    "8": "八",
    "9": "九",
    "10": "十",
    "11": "十一",
    "12": "十二",
    "13": "十三",
    "14": "十四",
    "15": "十五",
    "16": "十六",
    "17": "十七",
    "18": "十八",
    "19": "十九",
    "20": "二十",
  };
  return numMap[num];
}

export function plexTitleToDDP(title: string): [string, string] {
  const pattern = /^(.+?) - S(\d+) · E(\d+)/;
  const match = title.match(pattern);
  let searchTitle: string = title;
  let searchEpisode = "movie";
  if (match) {
    const title = match[1] ?? "";
    const season = match[2] ?? "";
    const episode = match[3] ?? "";
    searchEpisode = episode;
    if (season === "1") {
      searchTitle = title;
    } else {
      searchTitle = `${title} 第${toCHS(season)}季`;
    }
  }
  return [searchTitle, searchEpisode];
}

export async function waitEl(selector: string): Promise<HTMLElement> {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, no-constant-condition
  while (true) {
    const el = document.querySelector(selector);
    if (el) {
      return el as HTMLElement;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

import { generateSignature } from "./utils";

interface DDPSearchEpisodesResponse {
  hasMore: boolean;
  animes?: DDPSearchEpisodesAnime[];
  errorCode: number;
  success: boolean;
  errorMessage?: string;
}

interface DDPSearchEpisodesAnime {
  animeId: number;
  animeTitle?: string;
  type:
    | "jpdrama"
    | "tvseries"
    | "movie"
    | "ova"
    | "web"
    | "musicvideo"
    | "other";
  typeDescription?: string;
  episodes?: DDPSearchEpisodesEpisode[];
}

interface DDPSearchEpisodesEpisode {
  episodeId: number;
  episodeTitle?: string;
}

const AppId = "<ENTER_APP_ID>";
const AppSecret = "<ENTER_APP_SECRET>";

function DDPSearchEpisodes(title: string, episode: string) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const sig = generateSignature(
    AppId,
    timestamp,
    "/api/v2/search/episodes",
    AppSecret,
  );
  return new Promise<DDPSearchEpisodesResponse>((resolve, reject) => {
    GM_xmlhttpRequest({
      url: `https://api.dandanplay.net/api/v2/search/episodes?anime=${title}&episode=${episode}`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
        "X-AppId": AppId,
        "X-Timestamp": timestamp,
        "X-Signature": sig,
      },
      responseType: "json",
      anonymous: true,
      onload: (xhr) => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const response: DDPSearchEpisodesResponse = xhr.response;
          resolve(response);
        } else {
          reject(new Error("Failed to fetch episodeId"));
        }
      },
    });
  });
}

export async function fetchEpisodeId(title: string, episode: string) {
  return DDPSearchEpisodes(title, episode).then((response) => {
    return response.animes?.at(0)?.episodes?.at(0)?.episodeId;
  });
}

export interface DDPComment {
  cid: number;
  p: string;
  m: string;
}

export interface DDPCommentResponse {
  count: number;
  comments: DDPComment[];
}

export enum DDPCommentMode {
  ltr = 6,
  rtl = 1,
  top = 5,
  bottom = 4,
}

export enum DDPChConvert {
  None = 0,
  Simplified = 1,
  Traditional = 2,
}

function DDPComment(episodeId: number, chConvert: DDPChConvert) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const sig = generateSignature(
    AppId,
    timestamp,
    `/api/v2/comment/${episodeId}`,
    AppSecret,
  );
  return new Promise<DDPCommentResponse>((resolve, reject) => {
    GM_xmlhttpRequest({
      url: `https://api.dandanplay.net/api/v2/comment/${episodeId}?withRelated=true&chConvert=${chConvert}`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
        "X-AppId": AppId,
        "X-Timestamp": timestamp,
        "X-Signature": sig,
      },
      responseType: "json",
      anonymous: true,
      onload: (xhr) => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const response: DDPCommentResponse = xhr.response;
          resolve(response);
        } else {
          reject(new Error("Failed to fetch episodeId"));
        }
      },
    });
  });
}

export async function fetchComments(
  episodeId: number,
  chConvert: DDPChConvert,
) {
  return DDPComment(episodeId, chConvert).then((response) => {
    return response.comments;
  });
}

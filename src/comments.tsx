import { DDPCommentMode, type DDPComment } from "./dandanplay";

type DanmakuMode = "ltr" | "rtl" | "top" | "bottom";

export interface DanmakuComment {
  text?: string;
  mode?: DanmakuMode;
  time?: number;
  style?: Partial<CSSStyleDeclaration> | CanvasRenderingContext2D;
}

function generateCommentElement(
  comment: DDPComment,
  fontSize: number,
  opacity: number,
): DanmakuComment | null {
  if (comment.p === "") return null;
  const vs = comment.p.split(",");
  const ts = Number(vs[0]);
  const mode = DDPCommentMode[Number(vs[1])];
  if (!mode) return null;
  if (mode === "bottom") return null;
  const color = `000000${Number(vs[2]).toString(16)}`.slice(-6);
  return {
    text: comment.m,
    mode: mode as DanmakuMode,
    time: ts,
    style: {
      fontSize: `${fontSize}px`,
      opacity: `${opacity / 100}`,
      color: `#${color}`,
      textShadow:
        color === "00000"
          ? "-1px -1px #fff, -1px 1px #fff, 1px -1px #fff, 1px 1px #fff"
          : "-1px -1px #000, -1px 1px #000, 1px -1px #000, 1px 1px #000",

      font: `${fontSize}px sans-serif`,
      fillStyle: `#${color}`,
      strokeStyle: color === "000000" ? "#fff" : "#000",
      lineWidth: 2.0,
    },
  };
}

export function generateComments(
  comments: DDPComment[],
  fontSize: number,
  opacity: number,
) {
  return comments
    .map((comment) => generateCommentElement(comment, fontSize, opacity))
    .filter((x): x is DanmakuComment => x !== null);
}

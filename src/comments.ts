import type Danmaku from "danmaku";
import type { DandanplayComment } from "./dandanplay";

// Use the renderer's public type rather than maintaining a second definition.
type RenderComment = Parameters<Danmaku["emit"]>[0];
type CommentMode = NonNullable<RenderComment["mode"]>;

const COMMENT_MODES: Readonly<Partial<Record<number, CommentMode>>> = {
  1: "rtl",
  5: "top",
  6: "ltr",
};

export function generateComments(
  comments: readonly DandanplayComment[],
  fontSize: number,
  opacity: number,
): RenderComment[] {
  return comments.flatMap((comment): RenderComment[] => {
    const [timeText, modeText, colorText] = comment.p.split(",");
    if (!timeText?.trim() || !modeText?.trim() || !colorText?.trim()) return [];

    const time = Number(timeText);
    const mode = COMMENT_MODES[Number(modeText)];
    const colorValue = Number(colorText);
    // Bottom comments intentionally remain hidden to leave room for subtitles.
    if (
      !mode ||
      !Number.isFinite(time) ||
      time < 0 ||
      !Number.isInteger(colorValue) ||
      colorValue < 0 ||
      colorValue > 0xffffff
    ) {
      return [];
    }

    const color = colorValue.toString(16).padStart(6, "0");
    const outline = colorValue === 0 ? "#fff" : "#000";
    return [
      {
        text: comment.m,
        mode,
        time,
        style: {
          fontSize: `${fontSize}px`,
          // Preserve the original font reset instead of inheriting Plex typography.
          font: `${fontSize}px sans-serif`,
          opacity: String(opacity / 100),
          color: `#${color}`,
          textShadow: `-1px -1px ${outline}, -1px 1px ${outline}, 1px -1px ${outline}, 1px 1px ${outline}`,
        },
      },
    ];
  });
}

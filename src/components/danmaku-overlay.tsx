import { useEffect } from "react";
import Danmaku from "danmaku";
import { generateComments } from "../comments";
import type { DandanplayComment } from "../dandanplay";
import { OWNED_ELEMENT_ATTRIBUTE } from "../plex";

interface DanmakuOverlayProps {
  container: HTMLElement | null;
  media: HTMLVideoElement | null;
  enabled: boolean;
  comments: readonly DandanplayComment[];
  fontSize: number;
  opacity: number;
}

export default function DanmakuOverlay({
  container,
  media,
  enabled,
  comments,
  fontSize,
  opacity,
}: DanmakuOverlayProps) {
  useEffect(() => {
    if (!enabled || !container || !media || comments.length === 0) return;

    const overlay = document.createElement("div");
    overlay.setAttribute(OWNED_ELEMENT_ATTRIBUTE, "");
    Object.assign(overlay.style, {
      position: "absolute",
      inset: "0",
      overflow: "hidden",
      pointerEvents: "none",
    });
    container.appendChild(overlay);

    const danmaku = new Danmaku({
      container: overlay,
      media,
      engine: "dom",
      comments: generateComments(comments, fontSize, opacity),
    });
    const resizeObserver = new ResizeObserver(() => danmaku.resize());
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      danmaku.destroy();
      overlay.remove();
    };
  }, [container, media, enabled, comments, fontSize, opacity]);

  return null;
}

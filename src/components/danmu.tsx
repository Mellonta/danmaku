import { useEffect, useRef } from "react";
import type { DDPComment } from "../dandanplay";
import Danmaku from "danmaku";
import { generateComments } from "../comments";

const CONTAINER_SELECTOR = "div[class='Player-fullPlayerContainer-wBDz23']";
const MEDIA_SELECTOR = '[class="HTMLMedia-mediaElement-u17S9P"]';

export interface DMProps {
  switchOn: boolean;
  minimized: boolean;
  comments: DDPComment[];
  fontSize: number;
  opacity: number;
}

const DM = (props: DMProps) => {
  const _danmaku = useRef<Danmaku | null>(null);

  const getContainerAndMedia = (): [
    HTMLElement | null,
    HTMLMediaElement | null,
  ] => {
    const container: HTMLElement | null =
      document.querySelector(CONTAINER_SELECTOR);
    const media: HTMLMediaElement | null =
      document.querySelector(MEDIA_SELECTOR);
    return [container, media];
  };

  useEffect(() => {
    if (_danmaku.current) {
      _danmaku.current.destroy();
      _danmaku.current = null;
    }

    const [container, media] = getContainerAndMedia();

    if (
      props.switchOn &&
      !props.minimized &&
      container &&
      media &&
      props.comments.length > 0
    ) {
      _danmaku.current = new Danmaku({
        container,
        media,
        engine: "dom",
        comments: generateComments(
          props.comments,
          props.fontSize,
          props.opacity,
        ),
      });
    }
  }, [props]);

  return <></>;
};

export default DM;

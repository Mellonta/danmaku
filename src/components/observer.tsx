import { useEffect } from "react";
import { waitEl } from "../utils";

const PLEX_SELECTOR = "div[id='plex']";

export interface ObserverProps {
  setMinimized: (_: boolean) => void;
  setTitle: (_: string | null) => void;
}

async function RegisterMinimizedObserver(setMinimized: (_: boolean) => void) {
  const update = (plex: HTMLElement) => {
    const minimized = !plex.className.includes("show-video-player");
    setMinimized(minimized);
  };

  return waitEl(PLEX_SELECTOR).then((plex) => {
    update(plex);
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        const node = mutation.target as HTMLElement;
        update(node);
      });
    });
    observer.observe(plex, { attributes: true, attributeFilter: ["class"] });
    return observer;
  });
}

async function RegisterTitleObserver(setTitle: (_: string | null) => void) {
  const trimTitle = (title: string) => {
    title = title.replace(/▶/g, "");
    title = title.trim();
    return title;
  };

  const updateTitle = (ele: HTMLElement) => {
    const title = trimTitle(ele.innerText);
    if (title.includes("Plex")) {
      setTitle(null);
    } else {
      setTitle(title);
    }
  };

  return waitEl("title").then((title) => {
    updateTitle(title);
    const observer = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        const ele = mutation.target as HTMLElement;
        updateTitle(ele);
      }
    });
    observer.observe(title, { childList: true });
    return observer;
  });
}

const Observer = (props: ObserverProps) => {
  useEffect(() => {
    const minimizedObserver = RegisterMinimizedObserver(props.setMinimized);
    const titleObserver = RegisterTitleObserver(props.setTitle);

    return () => {
      void minimizedObserver.then((observer) => {
        observer.disconnect();
      });

      void titleObserver.then((observer) => {
        observer.disconnect();
      });
    };
  }, []);

  return <></>;
};

export default Observer;

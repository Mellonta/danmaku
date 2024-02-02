import React, { useEffect, useState } from "react";
// import { FloatButton } from "antd";
import Danmaku from "danmaku";
import { toCHS, waitForElement } from "./utils";
import { fetchComments, fetchEpisodeId, type DDPComment } from "./dandanplay";
import { generateComments } from "./comments";
import DanmakuSwitch from "./ui";
import { createRoot } from "react-dom/client";

interface DanmakuConfig {
  container: HTMLElement | null;
  media: HTMLMediaElement | null;
  comments: DDPComment[];
  minimized: boolean;
}

const MENU_SELECTOR =
  "div[class='PlayerControls-buttonGroupCenter-LDbSmK PlayerControls-buttonGroup-L3xlI0 PlayerControls-balanceLeft-jE50ih']";
const CONTAINER_SELECTOR = "div[class='Player-fullPlayerContainer-wBDz23']";
const MEDIA_SELECTOR = '[class="HTMLMedia-mediaElement-u17S9P"]';

const App = () => {
  const [_title, _setTitle] = useState<string | null>();
  const [_episodeId, _setEpisodeId] = useState<number | null>();
  const [_config, _setConfig] = useState<DanmakuConfig>({
    container: null,
    media: null,
    comments: [],
    minimized: false,
  });
  const [_danmaku, _setDanmaku] = useState<Danmaku | null>(null);
  const [_switchOn, _setSwitchOn] = useState<boolean>(true);

  const trimTitle = (title: string) => {
    title = title.replace(/▶/g, "");
    title = title.trim();
    return title;
  };

  useEffect(() => {
    appendSwitchIfNotExist();
    if (_danmaku) {
      _danmaku.destroy();
      _setDanmaku(null);
    }
    const { minimized, container, media, comments } = _config;
    if (
      minimized ||
      !_switchOn ||
      !container ||
      !media ||
      comments.length === 0
    ) {
      return;
    }
    const danmaku = new Danmaku({
      container,
      media,
      engine: "canvas",
      comments: generateComments(_config.comments),
    });
    _setDanmaku(danmaku);
  }, [_config, _switchOn]);

  useEffect(() => {
    if (!_episodeId) {
      _setDanmaku(null);
      return;
    }
    (async () => {
      const comments = await fetchComments(_episodeId);
      _setConfig((prev) => {
        return {
          ...prev,
          comments,
        };
      });
    })();
  }, [_episodeId]);

  useEffect(() => {
    if (!_title) {
      return;
    }
    const pattern = /^(.+?) - S(\d+) · E(\d+)/;
    const match = _title.match(pattern);
    let searchTitle: string = _title;
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
    } else {
      // console.log("[HZ] movie title:", _title);
    }
    (async () => {
      const episodeId = await fetchEpisodeId(searchTitle, searchEpisode);
      _setEpisodeId(episodeId);
    })();
  }, [_title]);

  const monitorTitle = () => {
    const node: HTMLElement | null = document.querySelector("title");
    if (!node) {
      return;
    }
    const updateTitle = (ele: HTMLElement) => {
      const title = trimTitle(ele.innerText);
      _setTitle(title);
    };
    if (!node.innerText.includes("Plex")) {
      updateTitle(node);
    }
    const observer = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        const ele = mutation.target as HTMLElement;
        updateTitle(ele);
      }
    });
    observer.observe(node, { childList: true });
  };

  const monitorPlexPlayer = () => {
    const node = document.getElementById("plex");
    if (!node) {
      return;
    }
    const updateConfig = (minimized: boolean) => {
      if (minimized) {
        _setConfig((prev) => {
          return {
            ...prev,
            minimized,
          };
        });
        return;
      }
      const container: HTMLElement | null =
        document.querySelector(CONTAINER_SELECTOR);
      const media: HTMLMediaElement | null =
        document.querySelector(MEDIA_SELECTOR);
      _setConfig((prev) => {
        return {
          ...prev,
          container,
          media,
          minimized: false,
        };
      });
    };

    const minimized = !node.className.includes("show-video-player");
    updateConfig(minimized);

    const observer = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        const node = mutation.target as HTMLElement;
        const minimized = !node.className.includes("show-video-player");
        updateConfig(minimized);
      }
      _setSwitchOn((prev) => prev);
    });
    observer.observe(node, { attributes: true, attributeFilter: ["class"] });
  };

  const renderButton = (danmakuSwitch: HTMLElement) => {
    const root = createRoot(danmakuSwitch);
    root.render(<DanmakuSwitch on={_switchOn} />);
  };

  const appendSwitchIfNotExist = () => {
    const s = document.getElementById("danmaku-switch");
    if (s) {
      renderButton(s);
      return;
    }
    const menu: HTMLElement | null = document.querySelector(MENU_SELECTOR);
    if (!menu) {
      return;
    }
    const danmakuSwitch = document.createElement("div");
    danmakuSwitch.id = "danmaku-switch";
    menu.appendChild(danmakuSwitch);

    renderButton(danmakuSwitch);
  };

  useEffect(() => {
    window.addEventListener("danmakuSwitch", () => {
      _setSwitchOn((prev) => !prev);
    });

    waitForElement("title", () => {
      monitorTitle();
    });

    waitForElement("div[id='plex']", () => {
      monitorPlexPlayer();
    });

    waitForElement(MENU_SELECTOR, () => {
      appendSwitchIfNotExist();
    });
  }, []);

  return <></>;
};

export default App;

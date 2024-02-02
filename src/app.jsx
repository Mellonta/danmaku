import React, {useEffect, useState} from 'react';
import {FloatButton, Modal} from "antd";
import Danmaku from 'danmaku';
import {toCHS, waitForElement} from "./utils";
import {fetchEpisodeId} from "./dandanplay";

const App = () => {
  const [_isOpen, _setOpen] = useState(false);
  const [_title, _setTitle] = useState("");
  const [_episodeId, _setEpisodeId] = useState("");
  const [_comments, _setComments] = useState([]);
  const [_danmakuConfig, _setDanmakuConfig] = useState({
    container: null, media: null, comments: [], hidden: false,
  });
  const [_danmaku, _setDanmaku] = useState(null);

  function bilibiliParser($obj) {
    //const $xml = new DOMParser().parseFromString(string, 'text/xml');
    // console.log($obj)
    return $obj.map(($comment) => {
      const p = $comment.p
      //if (p === null || $comment.childNodes[0] === undefined) return null;
      const values = p.split(',');
      const mode = ({6: 'ltr', 1: 'rtl', 5: 'top', 4: 'bottom'})[values[1]];
      if (!mode) return null;
      //const fontSize = Number(values[2]) || 25;
      const fontSize = 25
      const color = `000000${Number(values[2]).toString(16)}`.slice(-6);
      return {
        text: $comment.m, mode, time: values[0] * 1, style: {
          fontSize: `${fontSize}px`,
          color: `#${color}`,
          textShadow: color === '00000' ? '-1px -1px #fff, -1px 1px #fff, 1px -1px #fff, 1px 1px #fff' : '-1px -1px #000, -1px 1px #000, 1px -1px #000, 1px 1px #000',

          font: `${fontSize}px sans-serif`,
          fillStyle: `#${color}`,
          strokeStyle: color === '000000' ? '#fff' : '#000',
          lineWidth: 2.0,
        },
      };
    }).filter((x) => x);
  }

  const trimTitle = (title) => {
    title = title.replace(/▶/g, "");
    title = title.trim();
    return title;
  }

  const fetchComments = (episodeId) => {
    GM_xmlhttpRequest({
      url: `https://api.dandanplay.net/api/v2/comment/${episodeId}?withRelated=true`, headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      }, responseType: "json", anonymous: true, onload: (response) => {
        // console.log("[HZ] comments:", response.response);
        _setComments(response.response.comments);
      }
    });
  }

  useEffect(() => {
    // console.log("[HZ] danmakuConfig:", _danmakuConfig);
    if (!_danmakuConfig.container || !_danmakuConfig.media) {
      return;
    }
    if (_danmaku) {
      _danmaku.destroy();
      _setDanmaku(null)
    }
    const {hidden, ...config} = _danmakuConfig;
    if (hidden) {
      return;
    }
    let danmaku = new Danmaku({...config, engine: "canvas", comments: bilibiliParser(_danmakuConfig.comments)});
    _setDanmaku(danmaku);
  }, [_danmakuConfig]);

  useEffect(() => {
    if (_comments.length === 0) {
      return;
    }
    // console.log("[HZ] comments:", _comments);
    _setDanmakuConfig(prevState => {
      return {
        ...prevState, comments: _comments,
      }
    });
  }, [_comments]);

  useEffect(() => {
    if (!_episodeId) {
      return;
    }
    // console.log("[HZ] episodeId:", _episodeId);
    fetchComments(_episodeId);
  }, [_episodeId]);

  // console.log when title changes
  useEffect(() => {
    if (!_title) {
      return;
    }
    let pattern = /^(.+?) - S(\d+) · E(\d+)/;
    let match = _title.match(pattern);
    let searchTitle = _title;
    let searchEpisode = "movie";
    if (match) {
      let title = match[1];
      let season = match[2];
      let episode = match[3];
      searchEpisode = episode;
      // console.log("[HZ] tv show title:", title, "season:", season, "episode:", episode);
      if (season === "1") {
        searchTitle = title;
      } else {
        searchTitle = `${title} 第${toCHS(season)}季`;
      }
    } else {
      // console.log("[HZ] movie title:", _title);
    }
    fetchEpisodeId(searchTitle, searchEpisode, _setEpisodeId);
  }, [_title]);

  useEffect(() => {
    // const selector = "a[class='MetadataPosterTitle-singleLineTitle-e8SSfL MetadataPosterTitle-title-bvCBDN Link-link-SxPFpG Link-default-BXtKLo']";
    const selector = "title";
    waitForElement(selector, () => {
      const node = document.querySelector(selector);
      if (!node.innerText.includes("Plex")) {
        let title = trimTitle(node.innerText);
        _setTitle(title);
      }
      const observer = new MutationObserver((mutationsList, observer) => {
        for (let mutation of mutationsList) {
          let title = trimTitle(mutation.target.innerText);
          _setTitle(title);
        }
      });
      observer.observe(node, {childList: true});
    });

    let elementId = "plex";
    waitForElement(`div[id='${elementId}']`, () => {
      const node = document.getElementById(elementId);
      if (node.className.includes("show-video-player")) {
        const container = document.querySelector("div[class='Player-fullPlayerContainer-wBDz23']")
        const media = document.querySelector('[class="HTMLMedia-mediaElement-u17S9P"]')
        _setDanmakuConfig(prevState => {
          return {
            ...prevState, container: container, media: media, hidden: false
          }
        });
      } else {
        _setDanmakuConfig(prevState => {
          return {...prevState, hidden: true}
        });
      }
      const observer = new MutationObserver((mutationsList, observer) => {
        for (let mutation of mutationsList) {
          if (mutation.target.className.includes("show-video-player")) {
            const container = document.querySelector("div[class='Player-fullPlayerContainer-wBDz23']")
            const media = document.querySelector('[class="HTMLMedia-mediaElement-u17S9P"]')
            _setDanmakuConfig(prevState => {
              return {
                ...prevState, container: container, media: media, hidden: false
              };
            });
          } else {
            _setDanmakuConfig(prevState => {
              return {...prevState, hidden: true}
            });
          }
        }
      });
      observer.observe(node, {attributes: true, attributeFilter: ['class']});
    });
  }, []);

  const showModal = () => {
    _setOpen(true);
  };

  const handleOk = () => {
    _setOpen(false);
  }

  const handleCancel = () => {
    _setOpen(false);
  }

  return <>
    <FloatButton
      onClick={showModal}
    />
    <Modal title="Config" centered open={_isOpen} onOk={handleOk} onCancel={handleCancel}>
      <p>Some contents...</p>
    </Modal>
  </>;
}

export default App;
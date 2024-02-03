import React, { useEffect, useState } from "react";
import { plexTitleToDDP } from "./utils";
import {
  fetchComments,
  fetchEpisodeId,
  type DDPComment,
  DDPChConvert,
} from "./dandanplay";
import Observer from "./components/observer";
import DMMenu from "./components/menu";
import DM from "./components/danmu";

const App = () => {
  const [_title, _setTitle] = useState<string | null>();
  const [_episodeId, _setEpisodeId] = useState<number | null>();

  const [_switchOn, _setSwitchOn] = useState<boolean>(true);
  const [_minimized, _setMinimized] = useState<boolean>(true);

  const [_comments, _setComments] = useState<DDPComment[]>([]);
  const [_fontSize, _setFontSize] = useState<number>(25);
  const [_opacity, _setOpacity] = useState<number>(90);
  const [_ch, _setCh] = useState<DDPChConvert>(DDPChConvert.None);

  useEffect(() => {
    _setComments([]);
    if (_episodeId) {
      void fetchComments(_episodeId, _ch).then(_setComments);
    }
  }, [_episodeId, _ch]);

  useEffect(() => {
    _setComments([]);
    if (_title) {
      const [searchTitle, searchEpisode] = plexTitleToDDP(_title);
      void fetchEpisodeId(searchTitle, searchEpisode).then(_setEpisodeId);
    }
  }, [_title]);

  return (
    <>
      <DMMenu
        minimized={_minimized}
        on={_switchOn}
        onSwitch={() => {
          _setSwitchOn((prev) => !prev);
        }}
        fontSize={_fontSize}
        setFontSize={_setFontSize}
        opacity={_opacity}
        setOpacity={_setOpacity}
        ch={_ch}
        setCh={_setCh}
      />
      <Observer setMinimized={_setMinimized} setTitle={_setTitle} />
      <DM
        switchOn={_switchOn}
        minimized={_minimized}
        comments={_comments}
        fontSize={_fontSize}
        opacity={_opacity}
      />
    </>
  );
};

export default App;

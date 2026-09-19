import { useState } from "react";
import { ChineseConversion } from "./dandanplay";
import { useComments } from "./hooks/use-comments";
import { usePlexPlayer } from "./hooks/use-plex-player";
import DanmakuMenu from "./components/danmaku-menu";
import DanmakuOverlay from "./components/danmaku-overlay";

export default function App() {
  const player = usePlexPlayer();
  const [enabled, setEnabled] = useState(true);
  const [fontSize, setFontSize] = useState(25);
  const [opacity, setOpacity] = useState(90);
  const [conversion, setConversion] = useState(ChineseConversion.None);
  const comments = useComments(player.title, conversion);

  return (
    <>
      <DanmakuMenu
        container={player.controls}
        enabled={enabled}
        onToggle={() => {
          setEnabled((previous) => !previous);
        }}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        opacity={opacity}
        onOpacityChange={setOpacity}
        conversion={conversion}
        onConversionChange={setConversion}
      />
      <DanmakuOverlay
        container={player.container}
        media={player.media}
        enabled={enabled && !player.minimized}
        comments={comments}
        fontSize={fontSize}
        opacity={opacity}
      />
    </>
  );
}

import { useEffect, useState } from "react";
import { Button, ConfigProvider, Popover, theme } from "antd";
import { createPortal } from "react-dom";
import { OWNED_ELEMENT_ATTRIBUTE } from "../plex";
import DanmakuSwitch from "./danmaku-switch";
import SettingsButton from "./settings-button";
import SettingsPanel, { type SettingsProps } from "./settings-panel";
import MatchPicker, { matchLabel } from "./match-picker";
import { getPopupContainer, POPUP_Z_INDEX } from "./popup";
import type { CommentMatch } from "../hooks/use-comments";

interface ControlsProps extends SettingsProps {
  match: CommentMatch;
  enabled: boolean;
  onToggle: () => void;
}

interface DanmakuMenuProps extends ControlsProps {
  container: HTMLElement | null;
}

function Controls({ enabled, onToggle, match, ...settings }: ControlsProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [matchOpen, setMatchOpen] = useState(false);

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: { zIndexPopupBase: POPUP_Z_INDEX },
      }}
    >
      <DanmakuSwitch enabled={enabled} onToggle={onToggle} />
      <Popover
        trigger="click"
        placement="topRight"
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        getPopupContainer={getPopupContainer}
        zIndex={POPUP_Z_INDEX}
        content={
          <div
            data-danmaku-root=""
            style={{ width: 280, fontSize: 14, lineHeight: 1.5 }}
          >
            <SettingsPanel {...settings} />
            <Button
              block
              style={{ marginTop: 12, textAlign: "left" }}
              disabled={!match.title}
              onClick={() => {
                setSettingsOpen(false);
                setMatchOpen(true);
              }}
            >
              Search / match episode ›
            </Button>
            <div
              role="status"
              style={{ marginTop: 8, fontSize: 12, color: "#aaa" }}
            >
              {matchLabel(match)}
            </div>
          </div>
        }
      >
        <SettingsButton aria-expanded={settingsOpen} />
      </Popover>
      <MatchPicker
        match={match}
        open={matchOpen}
        onClose={() => {
          setMatchOpen(false);
        }}
      />
    </ConfigProvider>
  );
}

export default function DanmakuMenu({
  container,
  ...controls
}: DanmakuMenuProps) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!container) {
      setTarget(null);
      return;
    }
    const host = document.createElement("span");
    host.id = "danmaku-extended-menu";
    host.setAttribute(OWNED_ELEMENT_ATTRIBUTE, "");
    Object.assign(host.style, {
      display: "inline-flex",
      alignItems: "center",
      alignSelf: "center",
      flexShrink: "0",
      lineHeight: "1",
    });
    container.appendChild(host);
    setTarget(host);
    return () => {
      host.remove();
    };
  }, [container]);

  return target?.parentElement === container
    ? createPortal(<Controls {...controls} />, target)
    : null;
}

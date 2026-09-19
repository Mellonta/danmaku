import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { OWNED_ELEMENT_ATTRIBUTE } from "../plex";
import DanmakuSwitch from "./danmaku-switch";
import SettingsButton from "./settings-button";
import SettingsPanel, { type SettingsProps } from "./settings-panel";
import MatchPicker from "./match-picker";
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
  const hideTimer = useRef<number | null>(null);

  function cancelHide(): void {
    if (hideTimer.current !== null) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }

  const mouseHandlers = {
    onMouseEnter: () => {
      cancelHide();
      setSettingsOpen(true);
    },
    onMouseLeave: () => {
      cancelHide();
      hideTimer.current = window.setTimeout(() => {
        hideTimer.current = null;
        setSettingsOpen(false);
      }, 200);
    },
  };

  useEffect(() => cancelHide, []);

  return (
    <>
      <SettingsPanel
        {...settings}
        {...mouseHandlers}
        visible={enabled && settingsOpen}
      />
      <DanmakuSwitch enabled={enabled} onToggle={onToggle} />
      <SettingsButton enabled={enabled} {...mouseHandlers} />
      <MatchPicker match={match} />
    </>
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
    host.style.display = "flex";
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

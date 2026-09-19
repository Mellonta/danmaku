import { normalizePlexTitle } from "./title";

// Match stable class prefixes so a change to Plex's CSS hashes does not break us.
const PLEX_SELECTOR = "#plex";
const PLAYER_SELECTOR = 'div[class*="Player-fullPlayerContainer-"]';
const CONTROLS_SELECTOR = 'div[class*="PlayerControls-buttonGroupCenter-"]';
export const OWNED_ELEMENT_ATTRIBUTE = "data-danmaku-root";

export interface PlexPlayerState {
  title: string | null;
  minimized: boolean;
  container: HTMLElement | null;
  media: HTMLVideoElement | null;
  controls: HTMLElement | null;
}

export function readPlexPlayer(): PlexPlayerState {
  const plex = document.querySelector<HTMLElement>(PLEX_SELECTOR);
  const container = plex?.querySelector<HTMLElement>(PLAYER_SELECTOR) ?? null;
  return {
    title: normalizePlexTitle(document.title),
    minimized: !plex?.classList.contains("show-video-player"),
    container,
    media: container?.querySelector<HTMLVideoElement>("video") ?? null,
    controls: plex?.querySelector<HTMLElement>(CONTROLS_SELECTOR) ?? null,
  };
}

function isOwnedMutation(mutation: MutationRecord): boolean {
  const element =
    mutation.target instanceof Element
      ? mutation.target
      : mutation.target.parentElement;
  return Boolean(element?.closest(`[${OWNED_ELEMENT_ATTRIBUTE}]`));
}

export function observePlexPlayer(onChange: () => void): () => void {
  const observer = new MutationObserver((mutations) => {
    // Rendering comments must not trigger another scan of Plex's player.
    if (mutations.some((mutation) => !isOwnedMutation(mutation))) onChange();
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["class"],
  });
  onChange();
  return () => {
    observer.disconnect();
  };
}

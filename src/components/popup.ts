// Plex's player sits above ordinary page dialogs. Keep our popups above it,
// including when the browser restricts rendering to a fullscreen element.
export const POPUP_Z_INDEX = 2_000_000_000;

export function getPopupContainer(): HTMLElement {
  return document.fullscreenElement instanceof HTMLElement
    ? document.fullscreenElement
    : document.body;
}

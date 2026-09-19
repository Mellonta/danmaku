import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app";
import { OWNED_ELEMENT_ATTRIBUTE } from "./plex";

const rootNode = document.createElement("div");
rootNode.id = "danmu";
rootNode.setAttribute(OWNED_ELEMENT_ATTRIBUTE, "");
document.body.appendChild(rootNode);

const style = document.createElement("style");
style.textContent = `
  .danmaku-button:hover {
    fill: #00aeec;
  }
  .danmaku-setting-disable {
    cursor: not-allowed!important;
    opacity: .4!important;
    pointer-events: none;
  }
`;
document.head.appendChild(style);

const root = createRoot(rootNode);
root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);

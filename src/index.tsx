import { createRoot } from "react-dom/client";
import App from "./app.jsx";

const rootNode = document.createElement("div");
rootNode.id = "danmu";
document.body.appendChild(rootNode);

const root = createRoot(rootNode);
root.render(<App />);

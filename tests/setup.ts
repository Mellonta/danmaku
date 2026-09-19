import { GlobalRegistrator } from "@happy-dom/global-registrator";

GlobalRegistrator.register({ url: "http://localhost:32400/web/" });
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

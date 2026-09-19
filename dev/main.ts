import { element } from "./dom";
import { installMockRequests, isScenario } from "./fixtures";
import { installLiveRequests } from "./live-requests";
import { createHarnessPlayer } from "./player";
import { createRequestLog } from "./request-log";
import { setupTitleLab } from "./title-lab";

const scenario = element("scenario", HTMLSelectElement);
const latency = element("latency", HTMLInputElement);
const fixtureControls = [
  scenario,
  latency,
  element("episode", HTMLSelectElement),
  element("next", HTMLButtonElement),
];
const log = createRequestLog(element("requests", HTMLOListElement));
const player = createHarnessPlayer();

function setFixtureControls(enabled: boolean): void {
  for (const control of fixtureControls) control.disabled = !enabled;
}

const titleLab = setupTitleLab(
  (title) => {
    setFixtureControls(false);
    installLiveRequests((record) => {
      log.update(record);
      titleLab.report(record);
    });
    player.load(title);
  },
  () => {
    setFixtureControls(true);
    installMockRequests(
      () => ({
        scenario: isScenario(scenario.value) ? scenario.value : "normal",
        latency: latency.valueAsNumber,
      }),
      log.update,
    );
    player.load(null);
  },
);

scenario.onchange = player.reload;
element("reload", HTMLButtonElement).onclick = player.reload;
latency.oninput = () => {
  element("latency-value", HTMLOutputElement).value = `${latency.value} ms`;
};
element("clear-log", HTMLButtonElement).onclick = log.clear;
window.addEventListener(
  "pagehide",
  () => {
    player.dispose();
  },
  { once: true },
);
titleLab.start();

// The same entry point as production, after installing the DOM and GM transport.
await import("../src/index");

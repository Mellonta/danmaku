import { createMediaClock } from "./media";
import { element } from "./dom";

export interface HarnessPlayer {
  load: (title: string | null) => void;
  reload: () => void;
  dispose: () => void;
}

export function createHarnessPlayer(): HarnessPlayer {
  const plex = element("plex", HTMLDivElement);
  const episode = element("episode", HTMLSelectElement);
  const seek = element("seek", HTMLInputElement);
  const speed = element("speed", HTMLSelectElement);
  const play = element("play", HTMLButtonElement);
  const transport = element("transport", HTMLDivElement);
  const time = element("time", HTMLOutputElement);
  const close = element("close", HTMLButtonElement);
  const minimize = element("minimize", HTMLButtonElement);
  const restart = element("restart", HTMLButtonElement);
  const replace = element("replace", HTMLButtonElement);
  let video = document.createElement("video");
  let clock: ReturnType<typeof createMediaClock>;
  let planet: HTMLDivElement;
  let opened = true;
  let minimized = false;
  let transition = 0;
  let customTitle: string | null = null;
  function setTitle() {
    document.title = opened
      ? (customTitle ?? `Local Orbit - S1 · E${episode.value}`)
      : "Plex";
  }

  function mountPlayer() {
    const currentTime = video.currentTime;
    const wasPlaying = !video.paused;
    if (video.isConnected) video.pause();
    transport.remove();
    plex.innerHTML = `
    <div class="Player-fullPlayerContainer-local">
      <div class="scene" data-danmaku-root>
        <div class="stars"></div><div class="planet"></div><div class="ridge"></div>
        <span class="episode-label"></span><span class="scene-label">SIMULATED VIDEO</span>
      </div>
      <video aria-hidden="true"></video>
    </div>`;
    plex.appendChild(transport);
    const media = plex.querySelector("video");
    const sphere = plex.querySelector(".planet");
    const label = plex.querySelector(".episode-label");
    if (!media || !(sphere instanceof HTMLDivElement) || !label)
      throw new Error("Invalid fixture DOM");
    video = media;
    planet = sphere;
    clock = createMediaClock(video, customTitle === null ? 120 : 3600);
    seek.max = String(video.duration);
    video.currentTime = currentTime;
    video.playbackRate = Number(speed.value);
    label.textContent = customTitle ?? `Local Orbit · Episode ${episode.value}`;
    if (wasPlaying) void video.play();
    plex.classList.toggle("show-video-player", !minimized);
    plex.classList.toggle("minimized", minimized);
    setTitle();
  }

  function setOpened(value: boolean) {
    opened = value;
    close.textContent = opened ? "Close player" : "Reopen player";
    for (const control of [play, seek, speed, minimize, replace, restart]) {
      control.disabled = !opened;
    }
    if (opened) mountPlayer();
    else {
      video.pause();
      transport.remove();
      plex.classList.remove("show-video-player");
      plex.innerHTML =
        '<div class="closed">Player closed · reopen to test the same episode</div>';
      setTitle();
    }
  }

  function reloadEpisode() {
    // Give the real observer and React a turn to clean up the previous episode.
    clearTimeout(transition);
    setOpened(false);
    transition = window.setTimeout(() => {
      video.currentTime = 0;
      setOpened(true);
    }, 100);
  }

  mountPlayer();
  play.onclick = () => {
    if (video.paused) void video.play();
    else video.pause();
  };
  restart.onclick = () => {
    video.currentTime = 0;
    void video.play();
  };
  seek.oninput = () => {
    video.currentTime = seek.valueAsNumber;
  };
  speed.onchange = () => {
    video.playbackRate = Number(speed.value);
  };
  episode.onchange = () => {
    video.currentTime = 0;
    setTitle();
    const label = plex.querySelector(".episode-label");
    if (label) label.textContent = `Local Orbit · Episode ${episode.value}`;
  };
  element("next", HTMLButtonElement).onclick = () => {
    episode.value = String((Number(episode.value) % 3) + 1);
    episode.dispatchEvent(new Event("change"));
  };
  element("size", HTMLSelectElement).onchange = (event) => {
    if (event.currentTarget instanceof HTMLSelectElement)
      plex.style.width = event.currentTarget.value;
  };
  minimize.onclick = () => {
    minimized = !minimized;
    minimize.textContent = minimized ? "Restore" : "Minimize";
    plex.classList.toggle("show-video-player", !minimized);
    plex.classList.toggle("minimized", minimized);
  };
  close.onclick = () => {
    clearTimeout(transition);
    setOpened(!opened);
  };
  replace.onclick = mountPlayer;
  function formatTime(seconds: number) {
    return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
  }

  let lastFrame = performance.now();
  function frame(now: number) {
    // Like a media element, the timeline advances with elapsed wall time.
    if (opened) {
      clock.advance((now - lastFrame) / 1000);
      planet.style.transform = `translate(${Math.sin(video.currentTime / 12) * 35}px, ${Math.cos(video.currentTime / 16) * 12}px)`;
    }
    lastFrame = now;
    animation = requestAnimationFrame(frame);
  }
  let animation = requestAnimationFrame(frame);
  const diagnosticsTimer = setInterval(() => {
    play.textContent = video.paused ? "▶" : "Ⅱ";
    play.setAttribute("aria-label", video.paused ? "Play" : "Pause");
    play.title = video.paused ? "Play" : "Pause";
    seek.value = String(video.currentTime);
    time.value = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
    const container = plex.querySelector(".Player-fullPlayerContainer-local");
    element("dimensions", HTMLSpanElement).textContent = container
      ? `${container.clientWidth} × ${container.clientHeight}`
      : "Player closed";
    element("mounts", HTMLElement).textContent =
      `${plex.querySelectorAll(".Player-fullPlayerContainer-local > [data-danmaku-root]:not(.scene)").length} / ${plex.querySelectorAll("#danmaku-extended-menu").length}`;
    element("playback", HTMLElement).textContent = !opened
      ? "Closed"
      : video.paused
        ? "Paused"
        : `Playing · ${speed.value}×`;
  }, 200);

  return {
    load(title) {
      customTitle = title;
      reloadEpisode();
    },
    reload: reloadEpisode,
    dispose() {
      clearTimeout(transition);
      clearInterval(diagnosticsTimer);
      cancelAnimationFrame(animation);
      video.pause();
    },
  };
}

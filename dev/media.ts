/** A deterministic media clock: no codecs, media files, or network required. */
export function createMediaClock(video: HTMLVideoElement, duration = 120) {
  let time = 0;
  let paused = true;
  let rate = 1;
  const emit = (name: string) => {
    video.dispatchEvent(new Event(name));
  };
  const pause = () => {
    if (paused) return;
    paused = true;
    emit("pause");
  };
  const seek = (value: number) => {
    if (!Number.isFinite(value)) return;
    time = Math.max(0, Math.min(duration, value));
    emit("seeking");
    emit("timeupdate");
    emit("seeked");
  };
  Object.defineProperties(video, {
    currentTime: { get: () => time, set: seek },
    duration: { get: () => duration },
    paused: { get: () => paused },
    ended: { get: () => time === duration },
    playbackRate: {
      get: () => rate,
      set: (value: number) => {
        if (!Number.isFinite(value) || value <= 0) return;
        rate = value;
        emit("ratechange");
      },
    },
    play: {
      value: () => {
        if (time === duration) seek(0);
        if (paused) {
          paused = false;
          emit("play");
          emit("playing");
        }
        return Promise.resolve();
      },
    },
    pause: { value: pause },
    fastSeek: { value: seek },
  });
  return {
    advance(seconds: number) {
      if (paused || !Number.isFinite(seconds) || seconds <= 0) return;
      time = Math.min(duration, time + seconds * rate);
      emit("timeupdate");
      if (time === duration) {
        pause();
        emit("ended");
      }
    },
  };
}

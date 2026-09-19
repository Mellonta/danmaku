import { useEffect, useState } from "react";
import {
  observePlexPlayer,
  readPlexPlayer,
  type PlexPlayerState,
} from "../plex";

export function usePlexPlayer(): PlexPlayerState {
  const [player, setPlayer] = useState(readPlexPlayer);

  useEffect(
    () =>
      observePlexPlayer(() => {
        const next = readPlexPlayer();
        setPlayer((previous) =>
          previous.title === next.title &&
          previous.minimized === next.minimized &&
          previous.container === next.container &&
          previous.media === next.media &&
          previous.controls === next.controls
            ? previous
            : next,
        );
      }),
    [],
  );

  return player;
}

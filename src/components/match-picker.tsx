import { useState } from "react";
import {
  Button,
  ConfigProvider,
  Input,
  Modal,
  Select,
  Space,
  theme,
} from "antd";
import { getPopupContainer, POPUP_Z_INDEX } from "./popup";
import type { CommentMatch } from "../hooks/use-comments";

export function matchLabel(match: CommentMatch): string {
  switch (match.status) {
    case "idle":
      return "No episode";
    case "searching":
      return "Searching…";
    case "choose":
      return "Choose match";
    case "no-match":
      return "No match";
    case "loading":
      return "Loading comments…";
    case "ready":
      return `${match.comments.length} comments`;
    case "empty":
      return "No comments";
    case "error":
      return "Match / load failed";
  }
}
function SearchForm({ match }: { match: CommentMatch }) {
  const [anime, setAnime] = useState(match.query.title);
  const [episode, setEpisode] = useState(match.query.episode);
  const [v2, setV2] = useState(match.v2);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const title = anime.trim();
        if (title) match.search({ title, episode: episode.trim() }, v2);
      }}
    >
      <label htmlFor="danmaku-anime">Series title</label>
      <Input
        id="danmaku-anime"
        value={anime}
        required
        onChange={(event) => {
          setAnime(event.target.value);
        }}
      />
      <label htmlFor="danmaku-episode">
        Episode (blank searches all; “movie” for a film)
      </label>
      <Input
        id="danmaku-episode"
        value={episode}
        onChange={(event) => {
          setEpisode(event.target.value);
        }}
      />
      <Space style={{ marginTop: 12 }} wrap>
        <Select
          aria-label="Search engine"
          getPopupContainer={getPopupContainer}
          value={v2 ? "new" : "legacy"}
          onChange={(value) => {
            setV2(value === "new");
          }}
          options={[
            { value: "legacy", label: "Original search" },
            { value: "new", label: "New search (v2)" },
          ]}
        />
        <Button
          htmlType="submit"
          type="primary"
          loading={match.status === "searching"}
        >
          Search
        </Button>
      </Space>
    </form>
  );
}
interface MatchPickerProps {
  match: CommentMatch;
  open: boolean;
  onClose: () => void;
}

export default function MatchPicker({
  match,
  open,
  onClose,
}: MatchPickerProps) {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: { zIndexPopupBase: POPUP_Z_INDEX },
      }}
    >
      <Modal
        title="弹弹play · Match episode"
        open={open}
        onCancel={onClose}
        zIndex={POPUP_Z_INDEX}
        footer={null}
        width={520}
        destroyOnHidden
        getContainer={getPopupContainer}
        modalRender={(content) => <div data-danmaku-root="">{content}</div>}
      >
        <p style={{ overflowWrap: "anywhere" }}>Plex: {match.title}</p>
        <SearchForm
          key={JSON.stringify([match.title, match.query, match.v2])}
          match={match}
        />
        <p role="status">
          {matchLabel(match)}
          {match.saved ? " · Saved correction" : ""}
        </p>
        {match.selected && (
          <p>
            Selected: {match.selected.animeTitle} ·{" "}
            {match.selected.episodeTitle} (ID {match.selected.episodeId})
          </p>
        )}
        {match.error && <p role="alert">{match.error}</p>}
        {match.storageError && <p role="alert">{match.storageError}</p>}
        {match.status === "no-match" && (
          <p>
            Try another name or leave the episode blank. An unrecognized Plex
            title currently falls back to a movie search.
          </p>
        )}
        {match.status === "choose" && (
          <p>
            Multiple results. Choose the correct series and episode before
            loading comments.
          </p>
        )}
        {match.hasMore && (
          <p>
            More results exist. Narrow the search if the correct episode is
            missing.
          </p>
        )}
        <ul
          style={{
            padding: 0,
            listStyle: "none",
            maxHeight: 240,
            overflow: "auto",
          }}
        >
          {match.candidates.map((candidate) => (
            <li key={candidate.episodeId} style={{ marginBottom: 8 }}>
              <Button
                block
                style={{
                  height: "auto",
                  whiteSpace: "normal",
                  textAlign: "left",
                  padding: 10,
                }}
                onClick={() => {
                  match.choose(candidate);
                }}
              >
                {candidate.animeTitle} · {candidate.episodeTitle} (ID{" "}
                {candidate.episodeId})
              </Button>
            </li>
          ))}
        </ul>
        <Space wrap>
          {match.selected && (
            <Button
              onClick={() => {
                match.retryComments();
              }}
            >
              Reload comments
            </Button>
          )}
          <Button
            onClick={() => {
              match.reset();
            }}
          >
            Reset match
          </Button>
        </Space>
        <p style={{ color: "#aaa", fontSize: 12 }}>
          Choosing a result remembers it for this exact Plex title on this site.
          Reset removes that correction and searches again. Automatic matches
          are not saved.
        </p>
      </Modal>
    </ConfigProvider>
  );
}

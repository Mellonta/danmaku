import { afterEach, beforeEach, expect, test } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ChineseConversion } from "../src/dandanplay";
import { useComments, type CommentMatch } from "../src/hooks/use-comments";
import { commentResult, mockRequests, searchResult } from "./requests";

let root: Root;
let container: HTMLElement;
let model: CommentMatch | null = null;
function currentMatch(): CommentMatch {
  if (!model) throw new Error("Missing model");
  return model;
}
let network: ReturnType<typeof mockRequests>;

function Comments({
  title,
  conversion,
}: {
  title: string | null;
  conversion: ChineseConversion;
}) {
  const match = useComments(title, conversion);
  model = match;
  const { comments } = match;
  return <output>{comments.map((comment) => comment.m).join(",")}</output>;
}

async function render(
  title: string | null,
  conversion = ChineseConversion.None,
) {
  await act(async () => {
    root.render(<Comments title={title} conversion={conversion} />);
    await Promise.resolve();
  });
}

async function respond(index: number, data: unknown) {
  await act(async () => {
    network.at(index).respond(data);
    await Promise.resolve();
  });
}

beforeEach(() => {
  localStorage.clear();
  model = null;
  network = mockRequests();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
    await Promise.resolve();
  });
  container.remove();
  network.restore();
});

test("reloads comments when reopening the same episode", async () => {
  await render("Show - S1 · E1");
  await respond(0, searchResult(1));
  await respond(1, commentResult("First load"));
  expect(container.textContent).toBe("First load");
  await render(null);
  expect(container.textContent).toBe("");
  await render("Show - S1 · E1");
  await respond(2, searchResult(1));
  await respond(3, commentResult("Reopened"));
  expect(container.textContent).toBe("Reopened");
});

test("ignores late comment responses after changing episodes", async () => {
  await render("Show - S1 · E1");
  await respond(0, searchResult(1));
  await render("Show - S1 · E2");
  expect(network.at(1).aborted).toBe(true);
  await respond(2, searchResult(2));
  await respond(3, commentResult("Episode 2"));
  await respond(1, commentResult("Late episode 1"));
  expect(container.textContent).toBe("Episode 2");
});

test("ignores late search responses", async () => {
  await render("Show - S1 · E1");
  await render("Show - S1 · E2");
  expect(network.at(0).aborted).toBe(true);
  await respond(1, searchResult(2));
  await respond(2, commentResult("Episode 2"));
  await respond(0, searchResult(1));
  expect(network.requests).toHaveLength(3);
  expect(container.textContent).toBe("Episode 2");
});

test("keeps the newest conversion after requests finish out of order", async () => {
  await render("Show - S1 · E1");
  await respond(0, searchResult(1));
  await render("Show - S1 · E1", ChineseConversion.Traditional);
  await respond(2, commentResult("Traditional"));
  await respond(1, commentResult("Original"));
  expect(container.textContent).toBe("Traditional");
});

const ambiguous = {
  animes: [
    {
      animeTitle: "Show",
      episodes: [{ episodeId: 1, episodeTitle: "Episode 1" }],
    },
    {
      animeTitle: "Show II",
      episodes: [{ episodeId: 2, episodeTitle: "Episode 1" }],
    },
  ],
};

async function choose(index: number) {
  await act(async () => {
    const match = currentMatch();
    const candidate = match.candidates[index];
    if (!candidate) throw new Error("Missing candidate");
    match.choose(candidate);
    await Promise.resolve();
  });
}

test("asks on ambiguity and remembers the chosen episode when reopening", async () => {
  await render("Show - S1 · E1");
  await respond(0, ambiguous);
  expect(currentMatch().status).toBe("choose");
  expect(network.requests).toHaveLength(1);
  await choose(1);
  expect(network.at(1).url.pathname).toBe("/api/v2/comment/2");
  await respond(1, commentResult("Corrected"));
  expect(currentMatch().saved).toBe(true);
  await render(null);
  await render("Show - S1 · E1");
  expect(network.at(2).url.pathname).toBe("/api/v2/comment/2");
  await respond(2, commentResult("Remembered"));
  expect(container.textContent).toBe("Remembered");
  await render("Show - S1 · E2");
  expect(network.at(3).url.pathname).toBe("/api/v2/search/episodes");
});

test("reset deletes the correction and searches again", async () => {
  await render("Show - S1 · E1");
  await respond(0, ambiguous);
  await choose(1);
  await act(async () => {
    currentMatch().reset();
    await Promise.resolve();
  });
  expect(network.at(1).aborted).toBe(true);
  expect(network.at(2).url.pathname).toBe("/api/v2/search/episodes");
  await respond(2, { animes: [] });
  expect(currentMatch().status).toBe("no-match");
  await render(null);
  await render("Show - S1 · E1");
  expect(network.at(3).url.pathname).toBe("/api/v2/search/episodes");
});

test("manual searches send the chosen engine and terms", async () => {
  await render("Show - S1 · E1");
  await act(async () => {
    currentMatch().search({ title: "Alternative & name", episode: "" }, true);
    await Promise.resolve();
  });
  expect(network.at(0).aborted).toBe(true);
  expect(network.at(1).url.searchParams.get("v2")).toBe("true");
  expect(network.at(1).url.searchParams.get("anime")).toBe(
    "Alternative & name",
  );
  expect(network.at(1).url.searchParams.get("episode")).toBe("");
  await respond(1, { animes: [] });
  expect(currentMatch().status).toBe("no-match");
  await respond(0, searchResult(99));
  expect(network.requests).toHaveLength(2);
});

test("does not automatically select a truncated single-result search", async () => {
  await render("Show - S1 · E1");
  await respond(0, { ...searchResult(1), hasMore: true });
  expect(currentMatch().status).toBe("choose");
  expect(network.requests).toHaveLength(1);
});

test("distinguishes a failed search, empty comments, and failed comment loading", async () => {
  await render("Show - S1 · E1");
  await respond(0, { success: false, errorMessage: "API denied request" });
  expect(currentMatch().status).toBe("error");
  expect(currentMatch().error).toBe("API denied request");
  await act(async () => {
    currentMatch().reset();
    await Promise.resolve();
  });
  await respond(1, searchResult(1));
  await respond(2, { comments: [] });
  expect(currentMatch().status).toBe("empty");
  await act(async () => {
    currentMatch().retryComments();
    await Promise.resolve();
  });
  await act(async () => {
    network.at(3).fail();
    await Promise.resolve();
  });
  expect(currentMatch().status).toBe("error");
  expect(currentMatch().error).toBe("Could not reach Dandanplay");
});

test("ignores comments for a previous manual selection", async () => {
  await render("Show - S1 · E1");
  await respond(0, ambiguous);
  await choose(0);
  await choose(1);
  expect(network.at(1).aborted).toBe(true);
  await respond(2, commentResult("Second choice"));
  await respond(1, commentResult("Stale first choice"));
  expect(container.textContent).toBe("Second choice");
});

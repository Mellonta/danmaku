import { afterEach, beforeEach, expect, test } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ChineseConversion } from "../src/dandanplay";
import { useComments } from "../src/hooks/use-comments";
import { commentResult, mockRequests, searchResult } from "./requests";

let root: Root;
let container: HTMLElement;
let network: ReturnType<typeof mockRequests>;

function Comments({
  title,
  conversion,
}: {
  title: string | null;
  conversion: ChineseConversion;
}) {
  const comments = useComments(title, conversion);
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
  await respond(2, searchResult(1));
  await respond(3, commentResult("Traditional"));
  await respond(1, commentResult("Original"));
  expect(container.textContent).toBe("Traditional");
});

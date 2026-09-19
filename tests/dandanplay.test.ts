import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  ChineseConversion,
  fetchComments,
  fetchEpisodeId,
} from "../src/dandanplay";
import { commentResult, mockRequests, searchResult } from "./requests";

let network: ReturnType<typeof mockRequests>;
beforeEach(() => {
  network = mockRequests();
});
afterEach(() => {
  network.restore();
});

const query = { title: "A & B #1+C", episode: "1" };

describe("Dandanplay requests", () => {
  test("encodes titles without changing query parameters", async () => {
    const result = fetchEpisodeId(query);
    const request = network.at(0);
    const url = request.url;
    expect(url.searchParams.get("anime")).toBe(query.title);
    expect(url.searchParams.get("episode")).toBe("1");
    expect(request.options.anonymous).toBe(true);
    expect(request.options.headers?.["X-Signature"]).toBeString();
    request.respond(searchResult(123));
    expect(await result).toBe(123);
  });

  test("returns null when a search has no matching episodes", async () => {
    const result = fetchEpisodeId(query);
    network.at(0).respond({ success: true, animes: [] });
    expect(await result).toBeNull();
  });

  test.each([
    ["API errors", { success: false, errorMessage: "Denied" }, "Denied"],
    ["non-object responses", null, "Invalid Dandanplay response"],
    ["invalid IDs", searchResult(-1), "Invalid Dandanplay episode ID"],
  ])("rejects %s", (_label, response, message) => {
    const result = fetchEpisodeId(query);
    network.at(0).respond(response);
    expect(result).rejects.toThrow(message);
  });

  test("validates comments and forwards conversion preferences", async () => {
    const result = fetchComments(123, ChineseConversion.Traditional);
    const url = network.at(0).url;
    expect(url.pathname).toBe("/api/v2/comment/123");
    expect(url.searchParams.get("chConvert")).toBe("2");
    network.at(0).respond(commentResult("Hello"));
    expect(await result).toEqual(commentResult("Hello").comments);
  });

  test("rejects malformed comment payloads", () => {
    const result = fetchComments(123, ChineseConversion.None);
    network.at(0).respond({ comments: [{ cid: 1, p: null, m: "Hello" }] });
    expect(result).rejects.toThrow("Invalid Dandanplay comments");
  });

  test.each(["http", "network", "timeout"] as const)(
    "settles %s failures",
    (failure) => {
      const result = fetchEpisodeId(query);
      const request = network.at(0);
      if (failure === "http") request.respond({}, 500);
      if (failure === "network") request.fail();
      if (failure === "timeout") request.timeout();
      expect(result).rejects.toBeInstanceOf(Error);
    },
  );

  test("aborts the transport and rejects with AbortError", () => {
    const controller = new AbortController();
    const result = fetchEpisodeId(query, controller.signal);
    controller.abort();
    expect(result).rejects.toMatchObject({ name: "AbortError" });
    expect(network.at(0).aborted).toBe(true);
  });

  test("does not send a request when already aborted", () => {
    const controller = new AbortController();
    controller.abort();
    expect(fetchEpisodeId(query, controller.signal)).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(network.requests).toHaveLength(0);
  });

  test("removes the abort listener after success", async () => {
    const controller = new AbortController();
    const result = fetchEpisodeId(query, controller.signal);
    network.at(0).respond(searchResult(123));
    await result;
    controller.abort();
    expect(network.at(0).aborted).toBe(false);
  });
});

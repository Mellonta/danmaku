import { describe, expect, test } from "bun:test";
import { generateComments } from "../src/comments";

function comment(p: string) {
  return { cid: 1, p, m: "Hello" };
}

describe("comment conversion", () => {
  test("preserves supported modes and hides bottom comments", () => {
    const comments = [1, 4, 5, 6].map((mode) => comment(`1,${mode},16777215`));
    expect(
      generateComments(comments, 25, 90).map((value) => value.mode),
    ).toEqual(["rtl", "top", "ltr"]);
  });

  test("gives black text a white outline and converts opacity", () => {
    expect(generateComments([comment("2.5,1,0")], 25, 90)).toEqual([
      {
        text: "Hello",
        time: 2.5,
        mode: "rtl",
        style: {
          fontSize: "25px",
          font: "25px sans-serif",
          opacity: "0.9",
          color: "#000000",
          textShadow:
            "-1px -1px #fff, -1px 1px #fff, 1px -1px #fff, 1px 1px #fff",
        },
      },
    ]);
  });

  test.each([
    "",
    "1",
    ",1,0",
    "NaN,1,0",
    "-1,1,0",
    "1,99,0",
    "1,1,-1",
    "1,1,16777216",
    "1,1,no-color",
  ])("ignores malformed parameters: %s", (parameters) => {
    expect(generateComments([comment(parameters)], 25, 90)).toEqual([]);
  });
});

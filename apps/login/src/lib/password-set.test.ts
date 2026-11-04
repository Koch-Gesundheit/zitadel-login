import { describe, expect, test } from "vitest";
import { showCodeSentBanner } from "./password-set";

describe("showCodeSentBanner", () => {
  test("zeigt den Hinweis, wenn die Seite aus „Passwort zurücksetzen“ kommt (weder initial noch code)", () => {
    expect(showCodeSentBanner({})).toBe(true);
    expect(showCodeSentBanner({ initial: undefined, code: undefined })).toBe(true);
  });

  test("zeigt ihn nicht, wenn der Code aus dem Link kommt", () => {
    expect(showCodeSentBanner({ code: "123456" })).toBe(false);
  });

  test("zeigt ihn nicht bei der ersten Passwortvergabe (initial)", () => {
    expect(showCodeSentBanner({ initial: "true" })).toBe(false);
  });

  test("zeigt ihn nicht, wenn beides gesetzt ist", () => {
    expect(showCodeSentBanner({ initial: "true", code: "123456" })).toBe(false);
  });

  test("ein leerer Parameter zählt als nicht gesetzt", () => {
    expect(showCodeSentBanner({ code: "" })).toBe(true);
    expect(showCodeSentBanner({ initial: "" })).toBe(true);
  });
});

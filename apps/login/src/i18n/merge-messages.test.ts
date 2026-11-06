import { describe, expect, test } from "vitest";
import de from "../../locales/de.json";
import en from "../../locales/en.json";
import { mergeMessages } from "./merge-messages";

describe("mergeMessages", () => {
  test("die Datei schlägt die API bei gleichem Schlüssel", () => {
    const result = mergeMessages({
      fallback: { title: "Title" },
      locale: { title: "Titel aus der Datei" },
      custom: { title: "Titel aus der API" },
    });

    expect(result).toEqual({ title: "Titel aus der Datei" });
  });

  test("Schlüssel der API ohne Dateieintrag bleiben erhalten", () => {
    const result = mergeMessages({
      fallback: { title: "Title" },
      locale: { title: "Titel" },
      custom: { onlyInApi: "Nur in der API" },
    });

    expect(result).toEqual({ title: "Titel", onlyInApi: "Nur in der API" });
  });

  test("die API schlägt Englisch", () => {
    const result = mergeMessages({
      fallback: { title: "Title" },
      locale: {},
      custom: { title: "Titel aus der API" },
    });

    expect(result).toEqual({ title: "Titel aus der API" });
  });

  test("Englisch füllt Lücken, die weder Datei noch API haben", () => {
    const result = mergeMessages({
      fallback: { title: "Title", hint: "Hint" },
      locale: { title: "Titel" },
      custom: {},
    });

    expect(result).toEqual({ title: "Titel", hint: "Hint" });
  });

  test("verschachtelte Objekte werden gemischt, nicht ersetzt", () => {
    const result = mergeMessages({
      fallback: { password: { set: { title: "Set", submit: "Continue", errors: { a: "A", b: "B" } } } },
      locale: { password: { set: { title: "Festlegen", errors: { a: "A (Datei)" } } } },
      custom: { password: { set: { submit: "Weiter (API)", errors: { b: "B (API)", c: "C (API)" } } } },
    });

    expect(result).toEqual({
      password: {
        set: {
          title: "Festlegen",
          submit: "Weiter (API)",
          errors: { a: "A (Datei)", b: "B (API)", c: "C (API)" },
        },
      },
    });
  });

  test("ohne Antwort der API gilt Datei über Englisch", () => {
    const result = mergeMessages({
      fallback: { a: "A", b: "B" },
      locale: { a: "A (Datei)" },
      custom: {},
    });

    expect(result).toEqual({ a: "A (Datei)", b: "B" });
  });

  test("verändert die Eingaben nicht", () => {
    const fallback = { nested: { a: "A" } };
    const locale = { nested: { a: "A (Datei)" } };
    const custom = { nested: { b: "B (API)" } };

    mergeMessages({ fallback, locale, custom });

    expect(fallback).toEqual({ nested: { a: "A" } });
    expect(locale).toEqual({ nested: { a: "A (Datei)" } });
    expect(custom).toEqual({ nested: { b: "B (API)" } });
  });

  test("echte Dateien: der Override der API für codeSent und Zitadels Loginname-Label überdecken die Datei nicht", () => {
    const custom = {
      loginname: { labels: { loginname: "Loginname" } },
      password: { set: { codeSent: "Der Code ist meist schon eingetragen. Falls nicht: Er steht in der neuesten E-Mail." } },
    };

    const result = mergeMessages({ fallback: en, locale: de, custom }) as unknown as typeof de;

    expect(result.loginname.labels.loginname).toBe(de.loginname.labels.loginname);
    expect(result.password.set.codeSent).toBe(de.password.set.codeSent);
  });
});

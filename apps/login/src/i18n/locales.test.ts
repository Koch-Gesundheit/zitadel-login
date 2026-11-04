import { describe, expect, test } from "vitest";
import de from "../../locales/de.json";
import en from "../../locales/en.json";

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(tree)) {
    if (typeof value === "string") {
      result[`${prefix}${key}`] = value;
    } else {
      Object.assign(result, flatten(value, `${prefix}${key}.`));
    }
  }
  return result;
}

const germanTexts = flatten(de as Tree);
const englishTexts = flatten(en as Tree);

const SIE_FORM = /\b(Sie|Ihnen|Ihr|Ihre|Ihrem|Ihren|Ihrer|Ihres)\b/;
// Halbgeviertstrich (U+2013) und Geviertstrich (U+2014), per Codepoint, damit die Datei selbst keinen enthält
const GEDANKENSTRICH = new RegExp(`[${String.fromCodePoint(0x2013)}${String.fromCodePoint(0x2014)}]`);
const PLACEHOLDER = /\{[^}]*\}/g;

// Texte, die für Kochs Kosmos neu dazugekommen sind; Englisch ist der Fallback für alle Sprachen ohne eigenen Eintrag
const NEW_KEYS = [
  "loginname.addressHint",
  "password.set.errors.linkUnusable",
  "password.set.errors.codeUnusable",
  "password.set.newLink",
];

describe("Prüfmuster", () => {
  test("erkennen die Sie-Form in allen Fällen und lassen die du-Form durch", () => {
    for (const text of ["Wenden Sie sich an Ihren Administrator", "Ihre Sitzung", "Bitte geben Sie es ein", "Ihrem Konto"]) {
      expect(SIE_FORM.test(text), text).toBe(true);
    }
    for (const text of ["Wende dich an deinen Administrator", "Anmeldung ist sicher", "Ihrerseits"]) {
      expect(SIE_FORM.test(text), text).toBe(false);
    }
  });

  test("erkennen Halbgeviert- und Geviertstrich und lassen den Bindestrich durch", () => {
    expect(GEDANKENSTRICH.test(`a ${String.fromCodePoint(0x2013)} b`)).toBe(true);
    expect(GEDANKENSTRICH.test(`a ${String.fromCodePoint(0x2014)} b`)).toBe(true);
    expect(GEDANKENSTRICH.test("E-Mail-Adresse")).toBe(false);
  });
});

describe("locales/de.json", () => {
  test("spricht überall mit „du“, nirgends mit „Sie“", () => {
    const hits = Object.entries(germanTexts)
      .filter(([, text]) => SIE_FORM.test(text))
      .map(([key]) => key);

    expect(hits).toEqual([]);
  });

  test("das Anmeldefeld heißt „E-Mail-Adresse“", () => {
    expect(germanTexts["loginname.labels.loginname"]).toBe("E-Mail-Adresse");
  });

  test("kein Gedankenstrich in den deutschen Texten", () => {
    const hits = Object.entries(germanTexts)
      .filter(([, text]) => GEDANKENSTRICH.test(text))
      .map(([key]) => key);

    expect(hits).toEqual([]);
  });

  test("Platzhalter stimmen mit en.json überein", () => {
    const placeholders = (text: string) => (text.match(PLACEHOLDER) ?? []).sort();
    const differing = Object.keys(germanTexts)
      .filter((key) => key in englishTexts)
      .filter((key) => placeholders(germanTexts[key]).join() !== placeholders(englishTexts[key]).join());

    expect(differing).toEqual([]);
  });

  test.each(NEW_KEYS)("neuer Schlüssel %s ist vorhanden und nicht leer", (key) => {
    expect(germanTexts[key]?.trim()).toBeTruthy();
  });
});

describe("locales/en.json", () => {
  test("das Anmeldefeld heißt „Email address“", () => {
    expect(englishTexts["loginname.labels.loginname"]).toBe("Email address");
  });

  test.each(NEW_KEYS)("neuer Schlüssel %s ist vorhanden und nicht leer", (key) => {
    expect(englishTexts[key]?.trim()).toBeTruthy();
  });
});

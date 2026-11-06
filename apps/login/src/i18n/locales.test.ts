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

// Zweite Fassung (06.11.2026): Fehler führen nicht mehr auf eine andere Seite, der Knopf schickt den neuen Link direkt
const EINRICHTEN_SEITE = "mein.drsimonekoch.de/einrichten";
// Hinweis zur Adresse, nur in den Fehlerfällen (gescheiterte Anmeldung, nach dem erneuten Schicken des Codes)
const ADRESS_HINWEIS = "an die wir dir deinen Zugang geschickt haben";
const ADDRESS_HINT = "the address we sent your access to";

// Texte, die für Kochs Kosmos neu dazugekommen sind; Englisch ist der Fallback für alle Sprachen ohne eigenen Eintrag
const NEW_KEYS = [
  "password.set.errors.linkUnusable",
  "password.set.errors.codeUnusable",
  "password.set.newLink",
  "password.set.newCode",
  "password.set.linkResent",
  "password.set.codeResent",
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

describe("Texte der zweiten Fassung", () => {
  test.each([
    ["de", germanTexts],
    ["en", englishTexts],
  ] as [string, Record<string, string>][])(
    "%s: kein Text schickt auf eine andere Seite, um einen Link zu holen",
    (_sprache, texts) => {
      const hits = Object.entries(texts)
        .filter(([, text]) => text.includes(EINRICHTEN_SEITE))
        .map(([key]) => key);

      expect(hits).toEqual([]);
    },
  );

  test("de: kein Dauerhinweis zur Zahlungsadresse auf der Anmeldeseite", () => {
    expect(germanTexts["loginname.addressHint"]).toBeUndefined();
    expect(englishTexts["loginname.addressHint"]).toBeUndefined();
  });

  test("de: der Hinweis zur Adresse steht nur in den Fehlerfällen", () => {
    const mitHinweis = Object.entries(germanTexts)
      .filter(([, text]) => text.includes(ADRESS_HINWEIS))
      .map(([key]) => key)
      .sort();

    expect(mitHinweis).toEqual([
      "password.errors.failedToAuthenticate",
      "password.errors.failedToAuthenticateNoLimit",
      "password.set.codeResent",
    ]);
  });

  test("en: der Hinweis zur Adresse steht in denselben Fehlerfällen", () => {
    const withHint = Object.entries(englishTexts)
      .filter(([, text]) => text.includes(ADDRESS_HINT))
      .map(([key]) => key)
      .sort();

    expect(withHint).toEqual([
      "password.errors.failedToAuthenticate",
      "password.errors.failedToAuthenticateNoLimit",
      "password.set.codeResent",
    ]);
  });

  test("de: Knöpfe nennen ihre Handlung mit „schicken“", () => {
    expect(germanTexts["password.set.newLink"]).toBe("Neuen Link schicken");
    expect(germanTexts["password.set.newCode"]).toBe("Neuen Code schicken");
    expect(germanTexts["password.set.resend"]).toBe("Neuen Code schicken");
  });
});

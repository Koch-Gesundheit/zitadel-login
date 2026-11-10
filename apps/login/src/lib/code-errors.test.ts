import { Code, ConnectError } from "@connectrpc/connect";
import { describe, expect, test } from "vitest";
import { errorMessage, isCodeProblem } from "./code-errors";
import { ClassifiedConnectError } from "./grpc/interceptors/error-classification";

describe("isCodeProblem", () => {
  describe("deutsche Meldungen von Zitadel", () => {
    test("Code nicht gefunden (Link schon benutzt)", () => {
      expect(isCodeProblem("[failed_precondition] Code konnte nicht gefunden werden (COMMAND-2M9fs)")).toBe(true);
    });

    test("Code abgelaufen", () => {
      expect(isCodeProblem("[failed_precondition] Code ist abgelaufen (CODE-QvUQ4P)")).toBe(true);
    });

    test("Code nicht gültig (kommt als invalid_argument)", () => {
      expect(isCodeProblem("[invalid_argument] Code ist nicht gültig (CODE-woT0xc)")).toBe(true);
    });
  });

  describe("englische Meldungen von Zitadel", () => {
    test("Code nicht gefunden", () => {
      expect(isCodeProblem("[failed_precondition] Code not found (COMMAND-2M9fs)")).toBe(true);
    });

    test("Code abgelaufen", () => {
      expect(isCodeProblem("[failed_precondition] Code is expired (CODE-QvUQ4P)")).toBe(true);
    });

    test("Code nicht gültig", () => {
      expect(isCodeProblem("[invalid_argument] Code is invalid (CODE-woT0xc)")).toBe(true);
    });
  });

  describe("weitere Code-Fehler", () => {
    test("CryptoCodeNil", () => {
      expect(isCodeProblem("[invalid_argument] Errors.User.Code.CryptoCodeNil (CRYPT-aqrFV)")).toBe(true);
    });

    test("nur die Kennung genügt", () => {
      expect(isCodeProblem("COMMAND-2M9fs")).toBe(true);
      expect(isCodeProblem("CODE-QvUQ4P")).toBe(true);
      expect(isCodeProblem("CODE-woT0xc")).toBe(true);
      expect(isCodeProblem("CRYPT-aqrFV")).toBe(true);
    });

    test("nicht aufgelöster Übersetzungsschlüssel", () => {
      expect(isCodeProblem("[failed_precondition] Errors.User.Code.NotConfigured (COMMAND-M0g95)")).toBe(true);
      expect(isCodeProblem("Errors.User.Code.GeneratorAlgNotSupported")).toBe(true);
    });
  });

  describe("andere Fehler sind keine Code-Probleme", () => {
    test("Passwort ungültig bzw. zu schwach (COMMAND-3M0fs)", () => {
      expect(isCodeProblem("[invalid_argument] Passwort ungültig (COMMAND-3M0fs)")).toBe(false);
      expect(isCodeProblem("[invalid_argument] Password is invalid (COMMAND-3M0fs)")).toBe(false);
    });

    test("neues Passwort gleicht dem alten (COMMAND-Aesh5)", () => {
      expect(
        isCodeProblem(
          "[failed_precondition] Das neue Passwort darf nicht mit deinem aktuellen Passwort übereinstimmen (COMMAND-Aesh5)",
        ),
      ).toBe(false);
      expect(
        isCodeProblem("[failed_precondition] New password cannot be the same as your current password (COMMAND-Aesh5)"),
      ).toBe(false);
    });

    test("Fehler des Passwortspeichers und des Netzes", () => {
      expect(isCodeProblem("[unavailable] fetch failed")).toBe(false);
      expect(isCodeProblem("Errors.User.Password.Empty")).toBe(false);
    });

    test("leer oder nicht vorhanden", () => {
      expect(isCodeProblem(undefined)).toBe(false);
      expect(isCodeProblem("")).toBe(false);
      expect(isCodeProblem()).toBe(false);
    });
  });
});

describe("errorMessage", () => {
  test("liest die Meldung aus einem Error", () => {
    expect(errorMessage(new Error("boom"))).toBe("boom");
  });

  test("liest sie aus dem echten Verbindungsfehler samt Kennung", () => {
    const error = new ClassifiedConnectError(new ConnectError("Code ist nicht gültig (CODE-woT0xc)", Code.InvalidArgument));

    expect(errorMessage(error)).toBe("[invalid_argument] Code ist nicht gültig (CODE-woT0xc)");
    expect(isCodeProblem(errorMessage(error))).toBe(true);
  });

  test("liest sie aus einem Text und aus einem Objekt mit message", () => {
    expect(errorMessage("nur Text")).toBe("nur Text");
    expect(errorMessage({ message: "im Objekt" })).toBe("im Objekt");
  });

  test("liefert nichts, wenn es keine Meldung gibt", () => {
    expect(errorMessage(undefined)).toBeUndefined();
    expect(errorMessage(null)).toBeUndefined();
    expect(errorMessage(42)).toBeUndefined();
    expect(errorMessage({ message: 42 })).toBeUndefined();
    expect(errorMessage({ failedAttempts: 3 })).toBeUndefined();
  });
});

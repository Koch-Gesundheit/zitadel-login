import { UNKNOWN_USER_ID } from "@/lib/constants";
import { changePassword, resetPassword } from "@/lib/server/password";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { create } from "@zitadel/client";
import { PasswordComplexitySettingsSchema } from "@zitadel/proto/zitadel/settings/v2/password_settings_pb";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { SetPasswordForm } from "./set-password-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/lib/server/password", () => ({
  changePassword: vi.fn(),
  resetPassword: vi.fn(),
  sendPassword: vi.fn(),
}));

vi.mock("@/lib/client", () => ({
  handleServerActionResponse: vi.fn(),
}));

const defaultComplexitySettings = create(PasswordComplexitySettingsSchema, {
  minLength: 8n,
  requiresUppercase: false,
  requiresLowercase: false,
  requiresNumber: false,
  requiresSymbol: false,
});

describe("SetPasswordForm", () => {
  afterEach(cleanup);

  test("should autofocus the code input when codeRequired is true", () => {
    const { getByTestId } = render(
      <SetPasswordForm
        passwordComplexitySettings={defaultComplexitySettings}
        loginName="test@example.com"
        userId="user-1"
        codeRequired={true}
      />,
    );
    expect(getByTestId("code-text-input")).toHaveFocus();
  });

  test("should autofocus the password input when codeRequired is false", () => {
    const { getByTestId } = render(
      <SetPasswordForm
        passwordComplexitySettings={defaultComplexitySettings}
        loginName="test@example.com"
        userId="user-1"
        codeRequired={false}
      />,
    );
    expect(getByTestId("password-set-text-input")).toHaveFocus();
  });
});

describe("SetPasswordForm bei unbrauchbarem Code", () => {
  const CTA = "bg-cta";

  beforeEach(() => {
    vi.mocked(changePassword).mockReset();
    vi.mocked(resetPassword).mockReset();
  });

  afterEach(cleanup);

  function renderForm(code?: string, userId = "user-1") {
    return render(
      <SetPasswordForm
        passwordComplexitySettings={defaultComplexitySettings}
        loginName="test@example.com"
        userId={userId}
        code={code}
        codeRequired={true}
      />,
    );
  }

  async function submit(view: ReturnType<typeof renderForm>, values: { code?: string; password?: string } = {}) {
    const password = values.password ?? "Test-Probe-1104!x";

    if (values.code !== undefined) {
      fireEvent.change(view.getByTestId("code-text-input"), { target: { value: values.code } });
    }
    fireEvent.change(view.getByTestId("password-set-text-input"), { target: { value: password } });
    fireEvent.change(view.getByTestId("password-set-confirm-text-input"), { target: { value: password } });

    const button = view.getByTestId("submit-button");
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
  }

  async function submitDeadLink() {
    vi.mocked(changePassword).mockResolvedValue({ error: "Text vom Server", codeProblem: true });
    const view = renderForm("code-aus-dem-link");
    await submit(view);
    await view.findByText("set.errors.linkUnusable");
    return view;
  }

  describe("Link aus der Mail (Code steckt im Link)", () => {
    test("zeigt keine Zeile „Keinen Code erhalten?“, weil keine zweite Mail kommt", () => {
      const view = renderForm("code-aus-dem-link");

      expect(view.queryByTestId("resend-button")).not.toBeInTheDocument();
      expect(view.queryByTestId("new-link-button")).not.toBeInTheDocument();
      expect(view.getByTestId("submit-button").className).toContain(CTA);
    });

    test("toter Link: nur der Satz und genau ein Hauptknopf, der den neuen Link schickt", async () => {
      const view = await submitDeadLink();

      expect(view.queryByText("Text vom Server")).not.toBeInTheDocument();
      const button = view.getByTestId("new-link-button");
      expect(button.tagName).toBe("BUTTON");
      expect(button).not.toHaveAttribute("href");
      expect(button).toHaveTextContent("set.newLink");
      expect(button.className).toContain(CTA);

      // Weiter, Code und Passwortfelder verschwinden: es bleibt eine Handlung
      expect(view.queryByTestId("submit-button")).not.toBeInTheDocument();
      expect(view.queryByTestId("code-text-input")).not.toBeInTheDocument();
      expect(view.queryByTestId("password-set-text-input")).not.toBeInTheDocument();
      expect(view.queryByTestId("resend-button")).not.toBeInTheDocument();
    });

    test("der Knopf schickt den neuen Link an das Konto aus dem Link und bestätigt es", async () => {
      vi.mocked(resetPassword).mockResolvedValue({});
      const view = await submitDeadLink();

      fireEvent.click(view.getByTestId("new-link-button"));

      expect(await view.findByTestId("link-resent")).toHaveTextContent("set.linkResent");
      expect(resetPassword).toHaveBeenCalledWith(expect.objectContaining({ loginName: "test@example.com" }));
      expect(view.queryByTestId("new-link-button")).not.toBeInTheDocument();
      expect(view.queryByText("set.errors.linkUnusable")).not.toBeInTheDocument();
      expect(view.queryByTestId("submit-button")).not.toBeInTheDocument();
    });

    test("scheitert das Schicken, steht der Fehler da und keine Bestätigung", async () => {
      vi.mocked(resetPassword).mockResolvedValue({ error: "Gerade nicht möglich" });
      const view = await submitDeadLink();

      fireEvent.click(view.getByTestId("new-link-button"));

      expect(await view.findByText("Gerade nicht möglich")).toBeInTheDocument();
      expect(view.queryByTestId("link-resent")).not.toBeInTheDocument();
    });

    test("wirft der Server, steht der allgemeine Fehler da und keine Bestätigung", async () => {
      vi.mocked(resetPassword).mockRejectedValue(new Error("weg"));
      const view = await submitDeadLink();

      fireEvent.click(view.getByTestId("new-link-button"));

      expect(await view.findByText("set.errors.couldNotResetPassword")).toBeInTheDocument();
      expect(view.queryByTestId("link-resent")).not.toBeInTheDocument();
    });

    test("ein selbst geänderter Code ist ein Eingabefehler: Weiter bleibt, der neue Link ist ein Nebenweg", async () => {
      vi.mocked(changePassword).mockResolvedValue({ error: "Der Code stimmt nicht", codeProblem: true });
      const view = renderForm("code-aus-dem-link");

      await submit(view, { code: "000000" });

      expect(await view.findByText("Der Code stimmt nicht")).toBeInTheDocument();
      expect(view.queryByText("set.errors.linkUnusable")).not.toBeInTheDocument();
      expect(view.queryByTestId("new-link-button")).not.toBeInTheDocument();
      const nebenweg = view.getByTestId("new-code-button");
      expect(nebenweg).toHaveTextContent("set.newLink");
      expect(nebenweg.className).not.toContain(CTA);
      expect(view.getByTestId("submit-button")).toBeEnabled();
    });
  });

  describe("Code selbst eingetippt (nach „Passwort zurücksetzen“)", () => {
    test("die Zeile „Keinen Code erhalten?“ schickt einen neuen Code und bestätigt mit dem Hinweis zur Adresse", async () => {
      vi.mocked(resetPassword).mockResolvedValue({});
      const view = renderForm();

      fireEvent.click(view.getByTestId("resend-button"));

      expect(await view.findByTestId("code-resent")).toHaveTextContent("set.codeResent");
      expect(view.queryByTestId("resend-button")).not.toBeInTheDocument();
      expect(view.getByTestId("code-text-input")).toBeInTheDocument();
      expect(view.getByTestId("submit-button")).toBeInTheDocument();
    });

    test("falscher Code: Text des Servers, Weiter bleibt Hauptknopf, „Neuen Code schicken“ als Textlink", async () => {
      vi.mocked(changePassword).mockResolvedValue({ error: "Der Code stimmt nicht", codeProblem: true });
      const view = renderForm();

      await submit(view, { code: "000000" });

      expect(await view.findByText("Der Code stimmt nicht")).toBeInTheDocument();
      const nebenweg = view.getByTestId("new-code-button");
      expect(nebenweg).toHaveTextContent("set.newCode");
      expect(nebenweg.className).not.toContain(CTA);
      expect(view.getByTestId("submit-button")).toBeEnabled();
      expect(view.getByTestId("submit-button").className).toContain(CTA);
      // Die obere Zeile verschwindet, solange die Meldung steht: ein Weg zum neuen Code, nicht zwei
      expect(view.queryByTestId("resend-button")).not.toBeInTheDocument();
    });

    test("„Neuen Code schicken“ nach falschem Code bestätigt und blendet die Meldung aus", async () => {
      vi.mocked(changePassword).mockResolvedValue({ error: "Der Code stimmt nicht", codeProblem: true });
      vi.mocked(resetPassword).mockResolvedValue({});
      const view = renderForm();
      await submit(view, { code: "000000" });
      await view.findByText("Der Code stimmt nicht");

      fireEvent.click(view.getByTestId("new-code-button"));

      expect(await view.findByTestId("code-resent")).toBeInTheDocument();
      expect(view.queryByText("Der Code stimmt nicht")).not.toBeInTheDocument();
      expect(view.queryByTestId("new-code-button")).not.toBeInTheDocument();
    });

    test("eine unbekannte Adresse (Platzhalter-ID) sieht dasselbe wie ein falscher Code", async () => {
      vi.mocked(changePassword).mockResolvedValue({ error: "Der Code stimmt nicht", codeProblem: true });
      const view = renderForm(undefined, UNKNOWN_USER_ID);

      await submit(view, { code: "000000" });

      expect(await view.findByText("Der Code stimmt nicht")).toBeInTheDocument();
      expect(view.getByTestId("new-code-button")).toBeInTheDocument();
      expect(view.queryByText("set.errors.linkUnusable")).not.toBeInTheDocument();
      expect(changePassword).toHaveBeenCalledWith(expect.objectContaining({ userId: UNKNOWN_USER_ID, code: "000000" }));
    });
  });

  test("andere Fehler zeigen nur den Alert, ohne Knopf für Link oder Code", async () => {
    vi.mocked(changePassword).mockResolvedValue({ error: "Das Passwort ist zu schwach" });
    const view = renderForm("code-aus-dem-link");

    await submit(view);

    expect(await view.findByText("Das Passwort ist zu schwach")).toBeInTheDocument();
    expect(view.queryByTestId("new-link-button")).not.toBeInTheDocument();
    expect(view.queryByTestId("new-code-button")).not.toBeInTheDocument();
  });

  test("der Nebenweg verschwindet, wenn der nächste Versuch an etwas anderem scheitert", async () => {
    vi.mocked(changePassword)
      .mockResolvedValueOnce({ error: "Der Code stimmt nicht", codeProblem: true })
      .mockResolvedValueOnce({ error: "Das Passwort ist zu schwach" });
    const view = renderForm();

    await submit(view, { code: "000000" });
    expect(await view.findByTestId("new-code-button")).toBeInTheDocument();

    await submit(view, { code: "123456" });
    expect(await view.findByText("Das Passwort ist zu schwach")).toBeInTheDocument();
    expect(view.queryByTestId("new-code-button")).not.toBeInTheDocument();
  });

  test("ohne Fehler erscheint kein Knopf für einen neuen Link", () => {
    const view = renderForm("code-aus-dem-link");

    expect(view.queryByTestId("new-link-button")).not.toBeInTheDocument();
    expect(view.queryByTestId("new-code-button")).not.toBeInTheDocument();
  });
});

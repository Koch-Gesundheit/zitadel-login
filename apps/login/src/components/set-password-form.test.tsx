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
  const NEW_LINK_URL = "https://mein.drsimonekoch.de/einrichten";

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

  test("zeigt bei einem Code aus dem Link den Linkhinweis und den Weg zu einem neuen Link", async () => {
    vi.mocked(changePassword).mockResolvedValue({ error: "Text vom Server", codeProblem: true });
    const view = renderForm("code-aus-dem-link");

    await submit(view);

    expect(await view.findByText("set.errors.linkUnusable")).toBeInTheDocument();
    expect(view.queryByText("Text vom Server")).not.toBeInTheDocument();

    const link = view.getByTestId("new-link-button");
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", NEW_LINK_URL);
    expect(link).not.toHaveAttribute("target");
    expect(link).toHaveTextContent("set.newLink");
  });

  test("zeigt bei einem selbst eingetippten Code den Text des Servers und den Weg zu einem neuen Link", async () => {
    vi.mocked(changePassword).mockResolvedValue({ error: "Der Code stimmt nicht", codeProblem: true });
    const view = renderForm("code-aus-dem-link");

    await submit(view, { code: "000000" });

    expect(await view.findByText("Der Code stimmt nicht")).toBeInTheDocument();
    expect(view.queryByText("set.errors.linkUnusable")).not.toBeInTheDocument();
    expect(view.getByTestId("new-link-button")).toHaveAttribute("href", NEW_LINK_URL);
  });

  test("zeigt ohne Code im Link den Text des Servers und den Weg zu einem neuen Link", async () => {
    vi.mocked(changePassword).mockResolvedValue({ error: "Der Code stimmt nicht", codeProblem: true });
    const view = renderForm();

    await submit(view, { code: "000000" });

    expect(await view.findByText("Der Code stimmt nicht")).toBeInTheDocument();
    expect(view.getByTestId("new-link-button")).toBeInTheDocument();
  });

  test("zeigt für eine unbekannte Adresse (Platzhalter-ID, kein Code im Link) den Text des Servers und den Weg zu einem neuen Link", async () => {
    vi.mocked(changePassword).mockResolvedValue({ error: "Der Code stimmt nicht", codeProblem: true });
    const view = renderForm(undefined, UNKNOWN_USER_ID);

    await submit(view, { code: "000000" });

    expect(await view.findByText("Der Code stimmt nicht")).toBeInTheDocument();
    expect(view.queryByText("set.errors.linkUnusable")).not.toBeInTheDocument();
    expect(view.getByTestId("new-link-button")).toHaveAttribute("href", NEW_LINK_URL);
    expect(changePassword).toHaveBeenCalledWith(expect.objectContaining({ userId: UNKNOWN_USER_ID, code: "000000" }));
  });

  describe("Weiter und Link, wenn der Code aus dem Link nicht mehr geht", () => {
    const PRIMARY = "bg-primary-light-500";

    async function submitDeadLink() {
      vi.mocked(changePassword).mockResolvedValue({ error: "Text vom Server", codeProblem: true });
      const view = renderForm("code-aus-dem-link");
      await submit(view);
      await view.findByText("set.errors.linkUnusable");
      return view;
    }

    test("sperrt Weiter und macht den Link zur Hauptaktion", async () => {
      const view = await submitDeadLink();

      await waitFor(() => expect(view.getByTestId("submit-button")).toBeDisabled());
      expect(view.getByTestId("new-link-button").className).toContain(PRIMARY);
    });

    test("gibt Weiter wieder frei und macht den Link leise, sobald ein anderer Code im Feld steht", async () => {
      const view = await submitDeadLink();
      await waitFor(() => expect(view.getByTestId("submit-button")).toBeDisabled());

      fireEvent.change(view.getByTestId("code-text-input"), { target: { value: "000000" } });

      await waitFor(() => expect(view.getByTestId("submit-button")).toBeEnabled());
      expect(view.getByTestId("new-link-button")).toBeInTheDocument();
      expect(view.getByTestId("new-link-button").className).not.toContain(PRIMARY);
    });

    test("sperrt Weiter wieder, wenn der Code aus dem Link zurückgeschrieben wird", async () => {
      const view = await submitDeadLink();

      fireEvent.change(view.getByTestId("code-text-input"), { target: { value: "000000" } });
      await waitFor(() => expect(view.getByTestId("submit-button")).toBeEnabled());
      fireEvent.change(view.getByTestId("code-text-input"), { target: { value: "code-aus-dem-link" } });

      await waitFor(() => expect(view.getByTestId("submit-button")).toBeDisabled());
      expect(view.getByTestId("new-link-button").className).toContain(PRIMARY);
    });

    test("ein getippter falscher Code erklärt den Link nicht für tot, auch wenn der Link-Code zurückkommt", async () => {
      vi.mocked(changePassword).mockResolvedValue({ error: "Der Code stimmt nicht", codeProblem: true });
      const view = renderForm("code-aus-dem-link");
      await submit(view, { code: "000000" });
      await view.findByText("Der Code stimmt nicht");
      expect(view.getByTestId("submit-button")).toBeEnabled();

      fireEvent.change(view.getByTestId("code-text-input"), { target: { value: "code-aus-dem-link" } });

      await waitFor(() => expect(view.getByTestId("code-text-input")).toHaveValue("code-aus-dem-link"));
      expect(view.getByTestId("submit-button")).toBeEnabled();
      expect(view.getByTestId("new-link-button").className).not.toContain(PRIMARY);
    });

    test("ohne Code im Link bleibt Weiter frei und der Link leise", async () => {
      vi.mocked(changePassword).mockResolvedValue({ error: "Der Code stimmt nicht", codeProblem: true });
      const view = renderForm(undefined, UNKNOWN_USER_ID);
      await submit(view, { code: "000000" });
      await view.findByText("Der Code stimmt nicht");

      expect(view.getByTestId("submit-button")).toBeEnabled();
      expect(view.getByTestId("new-link-button").className).not.toContain(PRIMARY);
    });

    test("Erneut senden gibt Weiter wieder frei und blendet den Link aus", async () => {
      vi.mocked(resetPassword).mockResolvedValue({});
      const view = await submitDeadLink();
      await waitFor(() => expect(view.getByTestId("submit-button")).toBeDisabled());

      fireEvent.click(view.getByTestId("resend-button"));

      await waitFor(() => expect(view.queryByTestId("new-link-button")).not.toBeInTheDocument());
      expect(view.getByTestId("submit-button")).toBeEnabled();
    });
  });

  test("andere Fehler zeigen nur den Alert, ohne Link", async () => {
    vi.mocked(changePassword).mockResolvedValue({ error: "Das Passwort ist zu schwach" });
    const view = renderForm("code-aus-dem-link");

    await submit(view);

    expect(await view.findByText("Das Passwort ist zu schwach")).toBeInTheDocument();
    expect(view.queryByTestId("new-link-button")).not.toBeInTheDocument();
  });

  test("der Link verschwindet, wenn der nächste Versuch an etwas anderem scheitert", async () => {
    vi.mocked(changePassword)
      .mockResolvedValueOnce({ error: "Der Code stimmt nicht", codeProblem: true })
      .mockResolvedValueOnce({ error: "Das Passwort ist zu schwach" });
    const view = renderForm();

    await submit(view, { code: "000000" });
    expect(await view.findByTestId("new-link-button")).toBeInTheDocument();

    await submit(view, { code: "123456" });
    expect(await view.findByText("Das Passwort ist zu schwach")).toBeInTheDocument();
    expect(view.queryByTestId("new-link-button")).not.toBeInTheDocument();
  });

  test("ohne Fehler erscheint kein Link", () => {
    const view = renderForm("code-aus-dem-link");

    expect(view.queryByTestId("new-link-button")).not.toBeInTheDocument();
  });
});

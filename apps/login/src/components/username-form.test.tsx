import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { UsernameForm } from "./username-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/lib/server/loginname", () => ({
  sendLoginname: vi.fn(),
}));

describe("UsernameForm", () => {
  afterEach(cleanup);

  test("should autofocus the loginName input on mount", () => {
    const { getByTestId } = render(
      <UsernameForm loginName="" requestId={undefined} loginSettings={undefined} submit={false} allowRegister={false} />,
    );
    expect(getByTestId("username-text-input")).toHaveFocus();
  });

  test("zeigt keinen Dauerhinweis zur Zahlungsadresse; der Hinweis zur Adresse kommt erst im Fehlerfall", () => {
    const { queryByTestId, container } = render(
      <UsernameForm loginName="" requestId={undefined} loginSettings={undefined} submit={false} allowRegister={false} />,
    );

    expect(queryByTestId("address-hint")).not.toBeInTheDocument();
    expect(container.querySelector("[data-i18n-key='loginname.addressHint']")).not.toBeInTheDocument();
  });

  test("hängt den Hinweis zum Zurücksetzen per aria-describedby am Feld", () => {
    const { getByTestId } = render(
      <UsernameForm loginName="" requestId={undefined} loginSettings={undefined} submit={false} allowRegister={false} />,
    );

    const input = getByTestId("username-text-input");
    expect(input.tagName).toBe("INPUT");
    expect(input.getAttribute("aria-describedby")).toBe("password-reset-hint");
    expect(document.getElementById("password-reset-hint")).toBe(getByTestId("password-reset-hint"));
  });
});

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

  test("zeigt unter dem Hinweis zum Zurücksetzen den Hinweis zur Adresse, mit der bezahlt wurde", () => {
    const { getByTestId } = render(
      <UsernameForm loginName="" requestId={undefined} loginSettings={undefined} submit={false} allowRegister={false} />,
    );

    const addressHint = getByTestId("address-hint");
    expect(addressHint).toBeInTheDocument();
    expect(addressHint.querySelector("[data-i18n-key='loginname.addressHint']")).toBeInTheDocument();
    expect(getByTestId("password-reset-hint").nextElementSibling).toBe(addressHint);
  });
});

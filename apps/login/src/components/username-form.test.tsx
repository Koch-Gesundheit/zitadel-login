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

  test("hängt beide Hinweise per aria-describedby am Feld", () => {
    const { getByTestId } = render(
      <UsernameForm loginName="" requestId={undefined} loginSettings={undefined} submit={false} allowRegister={false} />,
    );

    const input = getByTestId("username-text-input");
    expect(input.tagName).toBe("INPUT");

    const describedBy = input.getAttribute("aria-describedby")?.split(" ");
    expect(describedBy).toEqual(["password-reset-hint", "address-hint"]);
    expect(document.getElementById("password-reset-hint")).toBe(getByTestId("password-reset-hint"));
    expect(document.getElementById("address-hint")).toBe(getByTestId("address-hint"));
  });

  test("setzt den neuen Hinweis mit mehr Abstand (mt-4) unter den ersten (mt-2)", () => {
    const { getByTestId } = render(
      <UsernameForm loginName="" requestId={undefined} loginSettings={undefined} submit={false} allowRegister={false} />,
    );

    expect(getByTestId("password-reset-hint")).toHaveClass("mt-2");
    expect(getByTestId("address-hint")).toHaveClass("mt-4");
    expect(getByTestId("address-hint")).not.toHaveClass("mt-2");
  });
});

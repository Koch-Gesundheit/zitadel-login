import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Button, ButtonVariants } from "./button";
import { ButtonLink } from "./button-link";

describe("ButtonLink", () => {
  afterEach(cleanup);

  it("renders a link with href and children", () => {
    const { getByRole } = render(<ButtonLink href="https://example.com/neu">Neuen Link holen</ButtonLink>);

    const link = getByRole("link", { name: "Neuen Link holen" });
    expect(link).toHaveAttribute("href", "https://example.com/neu");
    expect(link).not.toHaveAttribute("target");
  });

  it("uses the same classes as the secondary Button plus a minimum height of 44px", () => {
    const { getByTestId } = render(
      <>
        <Button variant={ButtonVariants.Secondary} data-testid="button">
          Weiter
        </Button>
        <ButtonLink href="/x" data-testid="link">
          Weiter
        </ButtonLink>
      </>,
    );

    const buttonClasses = getByTestId("button").className.trim().split(/\s+/);
    const linkClasses = getByTestId("link").className.trim().split(/\s+/);
    expect(linkClasses).toEqual([...buttonClasses, "min-h-11"]);
  });

  it("keeps min-h-11 in every variant, so the 36px height of the Button classes cannot win", () => {
    const { getByTestId } = render(
      <>
        <ButtonLink href="/x" variant={ButtonVariants.Secondary} data-testid="secondary">
          Weiter
        </ButtonLink>
        <ButtonLink href="/x" variant={ButtonVariants.Primary} className="custom-class" data-testid="primary">
          Weiter
        </ButtonLink>
      </>,
    );

    expect(getByTestId("secondary")).toHaveClass("min-h-11");
    expect(getByTestId("primary")).toHaveClass("min-h-11", "custom-class");
  });

  it("supports the primary variant, a custom className and further attributes", () => {
    const { getByTestId } = render(
      <ButtonLink href="/x" variant={ButtonVariants.Primary} className="custom-class" data-testid="link">
        Weiter
      </ButtonLink>,
    );

    const link = getByTestId("link");
    expect(link.className).toContain("custom-class");
    expect(link.className).toMatch(/bg-primary-light-500/);
  });
});

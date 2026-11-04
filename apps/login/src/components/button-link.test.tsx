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

  it("uses the same classes as the secondary Button", () => {
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

    expect(getByTestId("link").className.trim()).toBe(getByTestId("button").className.trim());
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

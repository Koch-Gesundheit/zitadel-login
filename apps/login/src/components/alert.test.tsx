import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Alert, AlertType } from "./alert";

describe("Alert", () => {
  afterEach(cleanup);

  it("announces an error with role alert", () => {
    const { getByRole, queryByRole } = render(<Alert>Etwas ist schiefgelaufen</Alert>);

    expect(getByRole("alert")).toHaveTextContent("Etwas ist schiefgelaufen");
    expect(queryByRole("status")).not.toBeInTheDocument();
  });

  it("announces an info with role status", () => {
    const { getByRole, queryByRole } = render(<Alert type={AlertType.INFO}>Nur zur Info</Alert>);

    expect(getByRole("status")).toHaveTextContent("Nur zur Info");
    expect(queryByRole("alert")).not.toBeInTheDocument();
  });

  it("uses the explicit type ALERT like the default", () => {
    const { getByRole } = render(<Alert type={AlertType.ALERT}>Fehler</Alert>);

    expect(getByRole("alert")).toBeInTheDocument();
  });

  it("colors the error text yellow-800 in light mode and keeps yellow-200 in dark mode", () => {
    const { getByRole } = render(<Alert>Fehler</Alert>);

    const classes = getByRole("alert").className.split(/\s+/);
    expect(classes).toContain("text-yellow-800");
    expect(classes).not.toContain("text-yellow-600");
    expect(classes).toContain("dark:text-yellow-200");
  });

  it("keeps the neutral colors of the info", () => {
    const { getByRole } = render(<Alert type={AlertType.INFO}>Info</Alert>);

    const classes = getByRole("status").className.split(/\s+/);
    expect(classes).toContain("text-gray-600");
    expect(classes).toContain("dark:text-gray-200");
    expect(classes).not.toContain("text-yellow-800");
  });
});

import { mergeMessages } from "@/i18n/merge-messages";
import { cleanup, render, screen } from "@testing-library/react";
import { LoginSettings, PasskeysType } from "@zitadel/proto/zitadel/settings/v2/login_settings_pb";
import { AuthenticationMethodType } from "@zitadel/proto/zitadel/user/v2/user_service_pb";
import { AbstractIntlMessages, NextIntlClientProvider } from "next-intl";
import type { AnchorHTMLAttributes, ReactElement } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import de from "../../locales/de.json";
import en from "../../locales/en.json";
import { PASSWORD } from "./auth-methods";
import { ChooseAuthenticatorToSetup } from "./choose-authenticator-to-setup";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Wie in src/i18n/request.ts: Englisch als Grundlage, darüber die Datei der Sprache
function renderIn(locale: "de" | "en", ui: ReactElement) {
  const messages = mergeMessages({ fallback: en, custom: {}, locale: locale === "de" ? de : en });
  return render(
    <NextIntlClientProvider locale={locale} messages={messages as unknown as AbstractIntlMessages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const loginSettings = { allowLocalAuthentication: true, passkeysType: PasskeysType.ALLOWED } as LoginSettings;
const params = new URLSearchParams({ userId: "123", organization: "456" });

describe("Auswahl der Anmeldeart nach dem Code aus der Mail (Konto ohne Passwort)", () => {
  afterEach(cleanup);

  test("de: die Karte heißt „Passwort festlegen“ wie der Button der Mail und führt zum Festlegen", () => {
    renderIn("de", <ChooseAuthenticatorToSetup authMethods={[]} params={params} loginSettings={loginSettings} />);

    const text = screen.getByText("Passwort festlegen");
    expect(text).toHaveAttribute("data-i18n-key", "authenticator.methods.passwordSetup");
    expect(text.closest("a")).toHaveAttribute("href", "/password/set?" + params);
    expect(screen.queryByText("Password")).not.toBeInTheDocument();
  });

  test("en: die Karte bleibt „Password“", () => {
    renderIn("en", <ChooseAuthenticatorToSetup authMethods={[]} params={params} loginSettings={loginSettings} />);

    expect(screen.getByText("Password").closest("a")).toHaveAttribute("href", "/password/set?" + params);
  });

  test("Konto mit Passwort: keine Karte zum Festlegen", () => {
    renderIn(
      "de",
      <ChooseAuthenticatorToSetup
        authMethods={[AuthenticationMethodType.PASSWORD]}
        params={params}
        loginSettings={loginSettings}
      />,
    );

    expect(screen.queryByText("Passwort festlegen")).not.toBeInTheDocument();
  });
});

describe("Karte Passwort ohne eigenen Schlüssel (Anmelden mit vorhandenem Passwort)", () => {
  afterEach(cleanup);

  test("de: „Passwort“, Schlüssel wie beim Hersteller", () => {
    renderIn("de", PASSWORD(false, "/password?" + params));

    const text = screen.getByText("Passwort");
    expect(text).toHaveAttribute("data-i18n-key", "authenticator.methods.password");
    expect(text.closest("a")).toHaveAttribute("href", "/password?" + params);
  });

  test("en: „Password“", () => {
    renderIn("en", PASSWORD(false, "/password?" + params));

    expect(screen.getByText("Password")).toHaveAttribute("data-i18n-key", "authenticator.methods.password");
  });
});

"use client";

import { lowerCaseValidator, numberValidator, symbolValidator, upperCaseValidator } from "@/helpers/validators";
import { handleServerActionResponse } from "@/lib/client-utils";
import { changePassword, resetPassword, sendPassword } from "@/lib/server/password";
import { create } from "@zitadel/client";
import { ChecksSchema } from "@zitadel/proto/zitadel/session/v2/session_service_pb";
import { PasswordComplexitySettings } from "@zitadel/proto/zitadel/settings/v2/password_settings_pb";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FieldValues, useForm } from "react-hook-form";
import { Alert, AlertType } from "./alert";
import { AutoSubmitForm } from "./auto-submit-form";
import { BackButton } from "./back-button";
import { Button, ButtonVariants } from "./button";
import { TextInput } from "./input";
import { PasswordComplexity } from "./password-complexity";
import { Spinner } from "./spinner";
import { Translated } from "./translated";

type Inputs =
  | {
      code: string;
      password: string;
      confirmPassword: string;
    }
  | FieldValues;

type Props = {
  code?: string;
  passwordComplexitySettings: PasswordComplexitySettings;
  loginName: string;
  userId: string;
  organization?: string;
  defaultOrganization?: string;
  requestId?: string;
  codeRequired: boolean;
};

export function SetPasswordForm({
  passwordComplexitySettings,
  organization,
  defaultOrganization,
  requestId,
  loginName,
  userId,
  code,
  codeRequired,
}: Props) {
  const { register, handleSubmit, watch, formState } = useForm<Inputs>({
    mode: "onChange",
    defaultValues: {
      code: code ?? "",
    },
  });

  const t = useTranslations("password");

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  // Der Code, den der Server zuletzt als unbrauchbar gemeldet hat (null: es gibt keine solche Meldung)
  const [unusableCode, setUnusableCode] = useState<string | null>(null);
  // Ein neuer Link oder Code ist angefordert; vorher kam nach „Erneut senden“ keine Rückmeldung
  const [resent, setResent] = useState<boolean>(false);
  const [samlData, setSamlData] = useState<{ url: string; fields: Record<string, string> } | null>(null);

  const router = useRouter();

  async function resendCode() {
    setError("");
    setUnusableCode(null);
    setResent(false);
    setLoading(true);

    const response = await resetPassword({
      loginName,
      organization,
      defaultOrganization,
      requestId,
    })
      .catch(() => {
        setError(t("set.errors.couldNotResetPassword"));
        return;
      })
      .finally(() => {
        setLoading(false);
      });

    if (!response) {
      return;
    }

    if ("error" in response && typeof response.error === "string") {
      setError(response.error);
      return;
    }

    // Auch für eine Adresse ohne Konto antwortet der Server ohne Fehler (ignoreUnknownUsernames); die Bestätigung bleibt gleich
    setResent(true);
  }

  async function submitPassword(values: Inputs) {
    setLoading(true);
    setUnusableCode(null);
    setResent(false);

    let payload: { userId: string; password: string; code?: string; organization?: string } = {
      userId: userId,
      password: values.password,
      organization,
    };

    // this is not required for initial password setup
    if (codeRequired) {
      payload = { ...payload, code: values.code };
    }

    const changeResponse = await changePassword(payload)
      .catch(() => {
        setError(t("set.errors.couldNotSetPassword"));
        return;
      })
      .finally(() => {
        setLoading(false);
      });

    if (changeResponse && "error" in changeResponse) {
      if ("codeProblem" in changeResponse && changeResponse.codeProblem) {
        // Steht der Code aus dem Link unverändert im Feld, ist der Link das Problem, sonst die Eingabe.
        setError(code && values.code === code ? t("set.errors.linkUnusable") : changeResponse.error);
        setUnusableCode(values.code ?? "");
        return;
      }

      setError(changeResponse.error);
      return;
    }

    if (!changeResponse) {
      setError(t("set.errors.couldNotSetPassword"));
      return;
    }

    const params = new URLSearchParams({});

    if (loginName) {
      params.append("loginName", loginName);
    }
    if (organization) {
      params.append("organization", organization);
    }

    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for a second to avoid eventual consistency issues with an initial password being set

    const passwordResponse = await sendPassword({
      loginName,
      organization,
      checks: create(ChecksSchema, {
        password: { password: values.password },
      }),
      requestId,
    })
      .catch(() => {
        setError(t("set.errors.couldNotVerifyPassword"));
        return;
      })
      .finally(() => {
        setLoading(false);
      });

    handleServerActionResponse(passwordResponse as any, router, setSamlData, setError);

    return;
  }

  const { errors } = formState;

  const watchPassword = watch("password", "");
  const watchConfirmPassword = watch("confirmPassword", "");
  const watchCode = watch("code", "");

  // Der Code steckt im Link aus der Mail: dann gibt es nichts abzutippen und keine zweite Mail, auf die man warten müsste
  const linkFlow = !!code;
  const codeProblem = unusableCode !== null;
  // Der Server hat den Code aus dem Link als unbrauchbar gemeldet und er steht unverändert im Feld: Weiter scheitert mit
  // demselben Code wieder, der einzige Ausweg ist ein neuer Link. Gebunden an den gemeldeten Code, damit ein zuvor
  // getippter, falscher Code den Link nicht zu Unrecht für tot erklärt, wenn die Nutzerin den Link-Code wieder einträgt.
  const linkDead = linkFlow && unusableCode === code && watchCode === code;
  // Toter Link: Die Seite zeigt nur noch die Meldung und genau einen Knopf, der den neuen Link schickt
  const onlyNewLink = linkDead || (linkFlow && resent);

  const hasMinLength = passwordComplexitySettings && watchPassword?.length >= passwordComplexitySettings.minLength;
  const hasSymbol = symbolValidator(watchPassword);
  const hasNumber = numberValidator(watchPassword);
  const hasUppercase = upperCaseValidator(watchPassword);
  const hasLowercase = lowerCaseValidator(watchPassword);

  const policyIsValid =
    passwordComplexitySettings &&
    (passwordComplexitySettings.requiresLowercase ? hasLowercase : true) &&
    (passwordComplexitySettings.requiresNumber ? hasNumber : true) &&
    (passwordComplexitySettings.requiresUppercase ? hasUppercase : true) &&
    (passwordComplexitySettings.requiresSymbol ? hasSymbol : true) &&
    hasMinLength;

  return (
    <>
      {samlData && <AutoSubmitForm url={samlData.url} fields={samlData.fields} />}
      <form className="w-full">
        <div className="mb-4 grid grid-cols-1 gap-4 pt-4">
          {codeRequired && !linkFlow && resent && (
            <Alert type={AlertType.INFO}>
              <span data-testid="code-resent">{t("set.codeResent")}</span>
            </Alert>
          )}
          {codeRequired && !linkFlow && !resent && !codeProblem && (
            <Alert type={AlertType.INFO}>
              <div className="flex flex-row">
                <span className="mr-auto flex-1 text-left">
                  <Translated i18nKey="set.noCodeReceived" namespace="password" />
                </span>
                <button
                  aria-label={t("set.resend")}
                  disabled={loading}
                  type="button"
                  className="text-primary-light-500 hover:text-primary-light-400 dark:text-primary-dark-500 hover:dark:text-primary-dark-400 ml-4 cursor-pointer disabled:cursor-default disabled:text-gray-400 dark:disabled:text-gray-700"
                  onClick={() => {
                    resendCode();
                  }}
                  data-testid="resend-button"
                >
                  <Translated i18nKey="set.resend" namespace="password" />
                </button>
              </div>
            </Alert>
          )}
          {codeRequired && !onlyNewLink && (
            <div>
              <TextInput
                type="text"
                autoFocus
                required
                {...register("code", {
                  required: t("set.required.code"),
                })}
                label={t("set.labels.code")}
                autoComplete="one-time-code"
                error={errors.code?.message as string}
                data-testid="code-text-input"
              />
            </div>
          )}
          {!onlyNewLink && (
            <>
              <div>
                <TextInput
                  type="password"
                  autoComplete="new-password"
                  autoFocus={!codeRequired}
                  required
                  {...register("password", {
                    required: t("set.required.newPassword"),
                  })}
                  label={t("set.labels.newPassword")}
                  error={errors.password?.message as string}
                  data-testid="password-set-text-input"
                />
              </div>
              <div>
                <TextInput
                  type="password"
                  required
                  autoComplete="new-password"
                  {...register("confirmPassword", {
                    required: t("set.required.confirmPassword"),
                  })}
                  label={t("set.labels.confirmPassword")}
                  error={errors.confirmPassword?.message as string}
                  data-testid="password-set-confirm-text-input"
                />
              </div>
            </>
          )}
        </div>

        {passwordComplexitySettings && !onlyNewLink && (
          <PasswordComplexity
            passwordComplexitySettings={passwordComplexitySettings}
            password={watchPassword}
            equals={!!watchPassword && watchPassword === watchConfirmPassword}
          />
        )}

        {error && <Alert>{error}</Alert>}

        {linkFlow && resent && (
          <Alert type={AlertType.INFO}>
            <span data-testid="link-resent">{t("set.linkResent")}</span>
          </Alert>
        )}

        {/* Toter Link: ein Hauptknopf, der den neuen Link direkt an die Adresse des Kontos schickt (keine Adresse abtippen) */}
        {linkDead && (
          <div className="mt-4">
            <Button
              type="button"
              variant={ButtonVariants.Primary}
              disabled={loading}
              onClick={() => {
                resendCode();
              }}
              className="min-h-11"
              data-testid="new-link-button"
            >
              {loading && <Spinner className="mr-2 h-5 w-5" />} {t("set.newLink")}
            </Button>
          </div>
        )}

        {/* Falscher oder abgelaufener Code beim Abtippen: Weiter bleibt der Hauptknopf, der neue Code ist ein Nebenweg */}
        {codeProblem && !linkDead && (
          <div className="mt-2">
            <button
              type="button"
              disabled={loading}
              className="text-primary-light-500 hover:text-primary-light-400 dark:text-primary-dark-500 hover:dark:text-primary-dark-400 inline-flex min-h-11 cursor-pointer items-center text-sm underline underline-offset-4 disabled:cursor-default disabled:text-gray-400 dark:disabled:text-gray-700"
              onClick={() => {
                resendCode();
              }}
              data-testid="new-code-button"
            >
              {linkFlow ? t("set.newLink") : t("set.newCode")}
            </button>
          </div>
        )}

        <div className="mt-8 flex w-full flex-row items-center justify-between">
          <BackButton data-testid="back-button" />
          {!onlyNewLink && (
            <Button
              type="submit"
              variant={ButtonVariants.Primary}
              disabled={loading || !policyIsValid || !formState.isValid || watchPassword !== watchConfirmPassword}
              onClick={handleSubmit(submitPassword)}
              data-testid="submit-button"
            >
              {loading && <Spinner className="mr-2 h-5 w-5" />} <Translated i18nKey="set.submit" namespace="password" />
            </Button>
          )}
        </div>
      </form>
    </>
  );
}

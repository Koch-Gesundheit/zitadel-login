import { APPEARANCE_STYLES, getComponentRoundness, getThemeConfig } from "@/lib/theme";
import { AnchorHTMLAttributes, DetailedHTMLProps } from "react";
import { ButtonColors, ButtonSizes, ButtonVariants, getButtonClasses } from "./button";

export type ButtonLinkProps = DetailedHTMLProps<AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement> & {
  size?: ButtonSizes;
  variant?: ButtonVariants;
  color?: ButtonColors;
};

// Ein Link, der wie ein <Button> aussieht (gleiche Klassen, gleiche Theme-Werte). min-h-11 hält ihn auf mindestens 44 px
// (Fingerziel am Handy); die 36 px aus getButtonClasses schlagen das nicht, weil min-height über height gewinnt.
export function ButtonLink({
  children,
  className = "",
  variant = ButtonVariants.Secondary,
  size = ButtonSizes.Small,
  color = ButtonColors.Primary,
  ...props
}: ButtonLinkProps) {
  const appearance =
    APPEARANCE_STYLES[getThemeConfig().appearance]?.button ||
    "border border-button-light-border dark:border-button-dark-border";

  return (
    <a
      className={`${getButtonClasses(size, variant, color, getComponentRoundness("button"), appearance)} min-h-11 ${className}`}
      {...props}
    >
      {children}
    </a>
  );
}

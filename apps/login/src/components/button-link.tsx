import { APPEARANCE_STYLES, getComponentRoundness, getThemeConfig } from "@/lib/theme";
import { AnchorHTMLAttributes, DetailedHTMLProps } from "react";
import { ButtonColors, ButtonSizes, ButtonVariants, getButtonClasses } from "./button";

export type ButtonLinkProps = DetailedHTMLProps<AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement> & {
  size?: ButtonSizes;
  variant?: ButtonVariants;
  color?: ButtonColors;
};

// Ein Link, der wie ein <Button> aussieht (gleiche Klassen, gleiche Theme-Werte).
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
      className={`${getButtonClasses(size, variant, color, getComponentRoundness("button"), appearance)} ${className}`}
      {...props}
    >
      {children}
    </a>
  );
}

import { Link } from "react-router";
import type { ReactNode, MouseEvent } from "react";

/**
 * Consistent clickable wrapper used everywhere a reference should navigate
 * (fund / sponsor / entity / company names, metric cells, pills, badges).
 * Adds a uniform hover affordance (pointer + subtle highlight) so users can
 * tell what's interactive. Theme-token only — works in dark and light mode.
 *
 *  • `to`            → renders a React Router <Link> (navigation).
 *  • `onClick` only  → renders a <button> (in-place action, e.g. open viewer).
 *
 * `variant`:
 *  • "inline"  — underline-on-hover text, for names inside prose/tables.
 *  • "block"   — subtle background highlight on hover, for rows/cells/cards.
 *  • "bare"    — no built-in styling beyond cursor; caller styles fully.
 */
type Variant = "inline" | "block" | "bare";

const VARIANT: Record<Variant, string> = {
  inline:
    "cursor-pointer text-atlas-white hover:text-atlas-purple hover:underline underline-offset-2 transition-colors",
  block:
    "cursor-pointer rounded-md hover:bg-atlas-card-hover hover:ring-1 hover:ring-atlas-purple/30 transition-colors",
  bare: "cursor-pointer",
};

interface BaseProps {
  children: ReactNode;
  className?: string;
  variant?: Variant;
  title?: string;
  stopPropagation?: boolean;
}

interface LinkProps extends BaseProps {
  to: string;
  onClick?: never;
}
interface ButtonProps extends BaseProps {
  to?: never;
  onClick: (e: MouseEvent) => void;
}

export function LinkTo(props: LinkProps | ButtonProps) {
  const { children, className = "", variant = "inline", title, stopPropagation } = props;
  const cls = `${VARIANT[variant]} ${className}`.trim();

  if ("to" in props && props.to) {
    return (
      <Link
        to={props.to}
        title={title}
        className={`no-underline ${cls}`}
        onClick={(e) => {
          if (stopPropagation) e.stopPropagation();
        }}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      title={title}
      className={`border-none bg-transparent p-0 text-left font-[inherit] ${cls}`}
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation();
        (props as ButtonProps).onClick(e);
      }}
    >
      {children}
    </button>
  );
}

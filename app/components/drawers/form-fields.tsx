import { forwardRef } from "react";
import type { RiskRating } from "~/lib/types";

/** Section header used to group fields inside a drawer. */
export function Section({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mt-2 mb-3 first:mt-0">
      <span className="text-[10px] font-bold uppercase tracking-widest text-atlas-purple">
        {children}
      </span>
      <span className="flex-1 h-px bg-atlas-border" />
    </div>
  );
}

export function Label({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="text-[11px] text-atlas-gray2 font-semibold font-sans mb-1 block">
      {children}
      {required && <span className="text-atlas-red ml-0.5">*</span>}
    </label>
  );
}

function fieldClass(error?: string) {
  return `w-full bg-atlas-card border rounded-[7px] px-3 py-2 text-[12px] text-atlas-off-white outline-none transition-colors mb-1 ${
    error
      ? "border-atlas-red focus:border-atlas-red"
      : "border-atlas-border focus:border-atlas-purple"
  }`;
}

export function ErrorText({ msg }: { msg?: string }) {
  if (!msg) return <div className="mb-2.5" />;
  return <div className="text-[10px] text-atlas-red mb-2.5">{msg}</div>;
}

export const TextField = forwardRef<
  HTMLInputElement,
  {
    value: string;
    onChange: (v: string) => void;
    error?: string;
    maxLength?: number;
    placeholder?: string;
  }
>(function TextField({ value, onChange, error, maxLength, placeholder }, ref) {
  return (
    <>
      <input
        ref={ref}
        type="text"
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className={fieldClass(error)}
      />
      <ErrorText msg={error} />
    </>
  );
});

export function DateField({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${fieldClass(error)} [color-scheme:dark]`}
      />
      <ErrorText msg={error} />
    </>
  );
}

/** Numeric field that rejects negative / non-numeric input inline. */
export function NumberField({
  value,
  onChange,
  error,
  allowNegative = false,
  step = "any",
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
  allowNegative?: boolean;
  step?: string;
  placeholder?: string;
}) {
  return (
    <>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`${fieldClass(error)} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
      />
      <ErrorText msg={error} />
    </>
  );
}

export function SelectField({
  value,
  onChange,
  options,
  labels,
  error,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  labels?: string[];
  error?: string;
  placeholder?: string;
}) {
  return (
    <>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${fieldClass(error)} cursor-pointer appearance-none`}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o, i) => (
          <option key={o} value={o}>
            {labels ? labels[i] : o}
          </option>
        ))}
      </select>
      <ErrorText msg={error} />
    </>
  );
}

export function ReadOnlyField({ value }: { value: string }) {
  return (
    <div className="w-full bg-atlas-gray5 border border-atlas-border rounded-[7px] px-3 py-2 text-[12px] text-atlas-gray2 font-mono cursor-not-allowed mb-2.5">
      {value}
    </div>
  );
}

const RISK_META: Record<RiskRating, { label: string; dot: string; on: string }> = {
  green: { label: "Green", dot: "var(--color-atlas-green)", on: "border-atlas-green" },
  yellow: { label: "Yellow", dot: "var(--color-atlas-orange)", on: "border-atlas-orange" },
  red: { label: "Red", dot: "var(--color-atlas-red)", on: "border-atlas-red" },
};

/** Traffic-light selector for risk rating. */
export function RiskSelector({
  value,
  onChange,
}: {
  value: RiskRating;
  onChange: (v: RiskRating) => void;
}) {
  return (
    <div className="flex gap-2 mb-2.5">
      {(Object.keys(RISK_META) as RiskRating[]).map((r) => {
        const meta = RISK_META[r];
        const active = value === r;
        return (
          <button
            key={r}
            type="button"
            onClick={() => onChange(r)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-[12px] font-semibold cursor-pointer transition-colors ${
              active
                ? `${meta.on} bg-atlas-card text-atlas-white`
                : "border-atlas-border bg-transparent text-atlas-gray3 hover:border-atlas-gray4"
            }`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: meta.dot, opacity: active ? 1 : 0.5 }}
            />
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}

/** Small traffic-light dot for read-only display. */
export function RiskDot({ value, size = 10 }: { value: RiskRating; size?: number }) {
  const dot = RISK_META[value]?.dot ?? "var(--color-atlas-gray3)";
  return (
    <span
      className="inline-block rounded-full align-middle"
      style={{ width: size, height: size, background: dot }}
    />
  );
}

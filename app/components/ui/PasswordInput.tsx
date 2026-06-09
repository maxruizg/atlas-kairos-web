import { useState } from "react";

interface PasswordInputProps {
  name: string;
  value?: string;
  defaultValue?: string;
  onChange?: (v: string) => void;
  autoComplete?: "current-password" | "new-password" | "off";
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  className?: string;
}

/**
 * Password input with a "show / hide" eye toggle. Used on login + signup.
 * Matches the existing Atlas form-input visual style.
 */
export function PasswordInput({
  name,
  value,
  defaultValue,
  onChange,
  autoComplete = "current-password",
  placeholder = "••••••••",
  required = false,
  minLength,
  maxLength,
  className = "",
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={`relative ${className}`}>
      <input
        type={visible ? "text" : "password"}
        name={name}
        value={value}
        defaultValue={defaultValue}
        onChange={(e) => onChange?.(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        className="w-full px-3 py-2 pr-10 rounded-lg bg-atlas-surface border border-atlas-border text-sm text-atlas-white placeholder:text-atlas-gray4 focus:outline-none focus:border-atlas-purple"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        title={visible ? "Hide password" : "Show password"}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-md text-atlas-gray3 hover:text-atlas-white hover:bg-atlas-card transition-colors cursor-pointer"
      >
        {visible ? (
          // Eye-off icon
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
            <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
            <line x1="2" y1="2" x2="22" y2="22" />
          </svg>
        ) : (
          // Eye icon
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}

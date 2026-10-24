"use client";

import { useId, useState, type ComponentProps, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";

type PasswordFieldProps = Omit<ComponentProps<"input">, "type"> & {
  label: string;
  action?: ReactNode;
  hint?: string;
};

export function PasswordField({
  label,
  action,
  hint,
  id,
  ...input
}: PasswordFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);
  const description =
    [input["aria-describedby"], hint ? `${inputId}-hint` : undefined]
      .filter(Boolean)
      .join(" ") || undefined;
  return (
    <div className="field-label password-field">
      <div className="password-label-row">
        <label htmlFor={inputId}>{label}</label>
        {action}
      </div>
      <div className="password-input">
        <input
          {...input}
          id={inputId}
          type={visible ? "text" : "password"}
          aria-describedby={description}
        />
        <button
          className="password-toggle"
          type="button"
          disabled={input.disabled}
          aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
          aria-pressed={visible}
          aria-controls={inputId}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? (
            <EyeOff size={18} aria-hidden="true" />
          ) : (
            <Eye size={18} aria-hidden="true" />
          )}
        </button>
      </div>
      {hint && (
        <p className="password-hint" id={`${inputId}-hint`}>
          {hint}
        </p>
      )}
    </div>
  );
}

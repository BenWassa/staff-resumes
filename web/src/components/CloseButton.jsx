import { X } from "lucide-react";

export default function CloseButton({
  onClick,
  disabled,
  label = "Close",
  className = "",
}) {
  return (
    <button
      aria-label={label}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-transparent text-[var(--text-muted)] transition hover:border-[var(--border-main)] hover:text-[var(--text-main)] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <X className="h-4 w-4" />
    </button>
  );
}

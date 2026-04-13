export default function OverwriteDialog({
  isOpen,
  slug,
  individualCount,
  consolidatedExists,
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  const parts = [];
  if (individualCount > 0) {
    parts.push(`${individualCount} individual resume${individualCount !== 1 ? 's' : ''}`);
  }
  if (consolidatedExists) {
    parts.push('a consolidated resume');
  }
  const fileDescription = parts.join(' and ');

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        aria-label="Cancel"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
        type="button"
      />
      <div className="relative z-10 w-full max-w-md rounded-[var(--radius-md)] border border-[var(--border-main)] bg-[var(--bg-card)] p-6 shadow-xl">
        <h2 className="mb-3 text-base font-semibold text-[var(--text-main)]">
          Overwrite existing files?
        </h2>
        <p className="mb-1 text-sm text-[var(--text-muted)]">
          <span className="font-mono text-[var(--text-main)]">outputs/{slug}/</span> already
          contains {fileDescription}.
        </p>
        <p className="mb-6 text-sm text-[var(--text-muted)]">Generating will replace them.</p>
        <div className="flex justify-end gap-3">
          <button
            className="rounded-[var(--radius-sm)] border border-[var(--border-main)] px-4 py-2 text-sm text-[var(--text-main)] hover:bg-[var(--bg-hover)]"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-[var(--radius-sm)] bg-[var(--accent-main)] px-4 py-2 text-sm font-medium text-[var(--accent-text)] transition hover:bg-[var(--accent-hover)]"
            onClick={onConfirm}
            type="button"
          >
            Overwrite and Generate
          </button>
        </div>
      </div>
    </div>
  );
}

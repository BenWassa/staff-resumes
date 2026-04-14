import { useState } from 'react';
import { ArrowDown, ArrowUp, GripVertical, Trash2 } from 'lucide-react';

export default function SortableList({
  items,
  onReorder,
  onRemove,
  removePrompt = 'Remove this item?',
  removeWarning = 'This action cannot be undone.',
}) {
  const [pendingRemoveId, setPendingRemoveId] = useState(null);

  const move = (index, direction) => {
    const next = [...items];
    const swapWith = index + direction;
    if (swapWith < 0 || swapWith >= next.length) return;
    [next[index], next[swapWith]] = [next[swapWith], next[index]];
    onReorder(next);
  };

  const handleRemoveClick = (itemId) => {
    setPendingRemoveId((current) => (current === itemId ? null : itemId));
  };

  const handleConfirmRemove = (itemId) => {
    onRemove(itemId);
    setPendingRemoveId(null);
  };

  if (items.length === 0) {
    return (
      <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--border-main)] px-4 py-6 text-center text-xs text-[var(--text-muted)]">
        No projects selected - add some from the list below.
      </div>
    );
  }

  return (
    <ol className="space-y-1">
      {items.map((item, index) => (
        <li
          key={item.id}
          className="flex flex-wrap items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-main)] bg-[var(--bg-panel)] px-3 py-2.5"
        >
          <GripVertical className="h-4 w-4 shrink-0 text-[var(--text-muted)]" aria-hidden />
          <span className="mr-1 w-5 shrink-0 text-center font-mono text-xs text-[var(--text-muted)]">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm text-[var(--text-main)]">{item.label}</div>
            {item.sublabel ? (
              <div className="truncate text-xs text-[var(--text-muted)] opacity-80">
                {item.sublabel}
              </div>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              aria-label="Move up"
              className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-main)] disabled:cursor-default disabled:opacity-30"
              disabled={index === 0}
              onClick={() => move(index, -1)}
              type="button"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button
              aria-label="Move down"
              className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-main)] disabled:cursor-default disabled:opacity-30"
              disabled={index === items.length - 1}
              onClick={() => move(index, 1)}
              type="button"
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
            <button
              aria-label="Remove"
              className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] transition hover:bg-[var(--bg-danger-subtle)] hover:text-[var(--text-danger)]"
              onClick={() => handleRemoveClick(item.id)}
              type="button"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          {pendingRemoveId === item.id ? (
            <div className="ml-2 flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-danger-subtle)] bg-[var(--bg-danger-subtle)] px-3 py-1.5">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[var(--text-danger)]">
                  {removePrompt}
                </div>
                <div className="text-[11px] leading-tight text-[var(--text-danger)] opacity-80">
                  {removeWarning}
                </div>
              </div>
              <button
                className="rounded-[var(--radius-sm)] px-2 py-1 text-xs font-semibold text-[var(--text-danger)] hover:bg-white/50"
                onClick={() => handleConfirmRemove(item.id)}
                type="button"
              >
                Remove
              </button>
              <button
                className="rounded-[var(--radius-sm)] px-2 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-main)]"
                onClick={() => setPendingRemoveId(null)}
                type="button"
              >
                Cancel
              </button>
            </div>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

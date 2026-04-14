import { useState } from 'react';
import { FolderOpen, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

export default function OnboardingScreen({ onComplete }) {
  const [pickedPath, setPickedPath] = useState('');
  const [resolvedPath, setResolvedPath] = useState(null);
  const [previewError, setPreviewError] = useState('');
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const canPickFolder = typeof window !== 'undefined' && window.electronAPI?.selectFolder;

  async function handleBrowse() {
    const picked = await window.electronAPI.selectFolder();
    if (!picked) return;
    setPickedPath(picked);
    await previewPath(picked);
  }

  async function handleManualInput(e) {
    setPickedPath(e.target.value);
    setResolvedPath(null);
    setPreviewError('');
  }

  async function previewPath(path) {
    if (!path.trim()) return;
    setIsPreviewing(true);
    setResolvedPath(null);
    setPreviewError('');
    try {
      const res = await fetch('/api/onboarding/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ picked_path: path, dry_run: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPreviewError(data.detail || 'Could not identify a Pursuits folder at that path.');
      } else {
        setResolvedPath(data.pursuits_root);
      }
    } catch {
      setPreviewError('Could not reach the backend. Is the app still starting up?');
    } finally {
      setIsPreviewing(false);
    }
  }

  async function handlePreviewManual() {
    await previewPath(pickedPath);
  }

  async function handleConfirm() {
    if (!resolvedPath) return;
    setIsSaving(true);
    setSaveError('');
    try {
      const res = await fetch('/api/onboarding/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ picked_path: resolvedPath }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.detail || 'Failed to save configuration.');
      } else {
        onComplete(data.pursuits_root);
      }
    } catch {
      setSaveError('Could not reach the backend.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="app-shell flex items-center justify-center px-4">
      <div className="panel-surface w-full max-w-2xl overflow-hidden">
        <div className="modal-header-bg px-8 py-7">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--border-header-badge)] bg-[var(--bg-header-badge)] px-3 py-1 text-sm font-mono uppercase tracking-[0.18em] text-[var(--text-header-muted)]">
            <FolderOpen size={14} />
            Setup
          </div>
          <h1 className="text-2xl font-medium tracking-tight text-[var(--text-header)]">
            Configure Staff Resumes
          </h1>
          <p className="mt-2 text-sm text-[var(--text-header-muted)]">
            Point the app at your main Pursuits folder and we&apos;ll take care of the rest.
          </p>
        </div>

        <div className="px-8 py-7 space-y-6">
          <div>
            <p className="text-sm leading-relaxed text-[var(--text-main)]">
              Select your <span className="font-semibold">Pursuits folder</span>, the location that
              contains all proposal project subfolders. Outputs will be saved inside each project
              automatically.
            </p>
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              If you accidentally choose a project subfolder, the app will resolve the correct root
              folder for you.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                className="input-field flex-1"
                placeholder="e.g. C:\\Users\\you\\OneDrive - Company\\Pursuits - Documents"
                value={pickedPath}
                onChange={handleManualInput}
                onKeyDown={(e) => e.key === 'Enter' && handlePreviewManual()}
              />
              {canPickFolder ? (
                <button onClick={handleBrowse} className="button-secondary" title="Browse for folder">
                  <FolderOpen size={15} />
                  Browse
                </button>
              ) : (
                <button
                  onClick={handlePreviewManual}
                  disabled={isPreviewing || !pickedPath.trim()}
                  className="button-secondary"
                >
                  Check
                </button>
              )}
            </div>

            {isPreviewing && (
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <Loader2 size={13} className="animate-spin" />
                Checking path...
              </div>
            )}

            {resolvedPath && !isPreviewing && (
              <div className="rounded-[var(--radius-sm)] border border-[var(--border-accent-subtle)] bg-[var(--bg-accent-subtle)] px-3 py-2.5 text-xs text-[var(--text-muted)]">
                <div className="flex items-start gap-2">
                  <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-[var(--accent-main)]" />
                  <span>
                    <span className="font-medium text-[var(--text-main)]">Pursuits folder found:</span>
                    <br />
                    <span className="font-mono break-all">{resolvedPath}</span>
                  </span>
                </div>
              </div>
            )}

            {previewError && !isPreviewing && (
              <div className="flex items-start gap-2 rounded-[var(--radius-sm)] border border-[var(--border-danger-subtle)] bg-[var(--bg-danger-subtle)] px-3 py-2.5 text-xs text-[var(--text-danger)]">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                {previewError}
              </div>
            )}
          </div>

          {saveError && (
            <div className="flex items-start gap-2 rounded-[var(--radius-sm)] border border-[var(--border-danger-subtle)] bg-[var(--bg-danger-subtle)] px-3 py-2.5 text-xs text-[var(--text-danger)]">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              {saveError}
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              onClick={handleConfirm}
              disabled={!resolvedPath || isSaving}
              className="button-primary"
            >
              {isSaving && <Loader2 size={14} className="animate-spin" />}
              Confirm and continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

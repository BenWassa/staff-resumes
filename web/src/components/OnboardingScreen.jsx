import { useState } from "react";
import { FolderOpen, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

export default function OnboardingScreen({ onComplete }) {
  const [pickedPath, setPickedPath] = useState("");
  const [resolvedPath, setResolvedPath] = useState(null);
  const [previewError, setPreviewError] = useState("");
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const canPickFolder = typeof window !== "undefined" && window.electronAPI?.selectFolder;

  async function handleBrowse() {
    const picked = await window.electronAPI.selectFolder();
    if (!picked) return;
    setPickedPath(picked);
    await previewPath(picked);
  }

  async function handleManualInput(e) {
    setPickedPath(e.target.value);
    setResolvedPath(null);
    setPreviewError("");
  }

  async function previewPath(path) {
    if (!path.trim()) return;
    setIsPreviewing(true);
    setResolvedPath(null);
    setPreviewError("");
    try {
      const res = await fetch("/api/onboarding/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // dry-run: just ask the backend to resolve, don't commit yet
        body: JSON.stringify({ picked_path: path, dry_run: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPreviewError(data.detail || "Could not identify a Pursuits folder at that path.");
      } else {
        setResolvedPath(data.pursuits_root);
      }
    } catch {
      setPreviewError("Could not reach the backend. Is the app still starting up?");
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
    setSaveError("");
    try {
      const res = await fetch("/api/onboarding/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ picked_path: resolvedPath }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.detail || "Failed to save configuration.");
      } else {
        onComplete(data.pursuits_root);
      }
    } catch {
      setSaveError("Could not reach the backend.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)]">
      <div
        className="bg-[var(--bg-panel)] w-full max-w-lg"
        style={{ borderTop: "var(--card-border-top)", boxShadow: "var(--shadow-panel)" }}
      >
        {/* Header */}
        <div className="modal-header-bg px-8 py-6">
          <h1 className="text-xl font-semibold text-[var(--text-header)] tracking-wide uppercase">
            Resume Generator
          </h1>
          <p className="text-sm text-[var(--text-header-muted)] mt-1 opacity-70">
            First-time setup
          </p>
        </div>

        {/* Body */}
        <div className="px-8 py-7 space-y-6">
          <div>
            <p className="text-sm text-[var(--text-main)] leading-relaxed">
              To get started, select your{" "}
              <span className="font-semibold">Pursuits folder</span> — the folder
              that contains all your proposal project subfolders. Outputs will be
              saved inside each project automatically.
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-2">
              If you accidentally select a project subfolder, the app will find
              the right location for you.
            </p>
          </div>

          {/* Folder picker */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 px-3 py-2 text-sm border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-main)] focus:outline-none focus:border-[var(--border-accent)]"
                placeholder="e.g. C:\Users\you\OneDrive - Company\Pursuits - Documents"
                value={pickedPath}
                onChange={handleManualInput}
                onKeyDown={(e) => e.key === "Enter" && handlePreviewManual()}
              />
              {canPickFolder && (
                <button
                  onClick={handleBrowse}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm border border-[var(--border-main)] bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] text-[var(--text-main)] transition-colors"
                  title="Browse for folder"
                >
                  <FolderOpen size={15} />
                  Browse
                </button>
              )}
              {!canPickFolder && (
                <button
                  onClick={handlePreviewManual}
                  disabled={isPreviewing || !pickedPath.trim()}
                  className="px-3 py-2 text-sm border border-[var(--border-main)] bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] text-[var(--text-main)] transition-colors disabled:opacity-40"
                >
                  Check
                </button>
              )}
            </div>

            {/* Preview feedback */}
            {isPreviewing && (
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <Loader2 size={13} className="animate-spin" />
                Checking path…
              </div>
            )}

            {resolvedPath && !isPreviewing && (
              <div className="flex items-start gap-2 text-xs text-[var(--text-muted)] bg-[var(--bg-accent-subtle)] border border-[var(--border-accent-subtle)] px-3 py-2">
                <CheckCircle2 size={13} className="mt-0.5 text-[var(--accent-main)] shrink-0" />
                <span>
                  <span className="font-medium text-[var(--text-main)]">Pursuits folder found:</span>
                  <br />
                  <span className="font-mono break-all">{resolvedPath}</span>
                </span>
              </div>
            )}

            {previewError && !isPreviewing && (
              <div className="flex items-start gap-2 text-xs text-[var(--text-danger)] bg-[var(--bg-danger-subtle)] border border-[var(--border-danger-subtle)] px-3 py-2">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                {previewError}
              </div>
            )}
          </div>

          {saveError && (
            <div className="flex items-start gap-2 text-xs text-[var(--text-danger)] bg-[var(--bg-danger-subtle)] border border-[var(--border-danger-subtle)] px-3 py-2">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              {saveError}
            </div>
          )}

          {/* Confirm button */}
          <div className="flex justify-end pt-1">
            <button
              onClick={handleConfirm}
              disabled={!resolvedPath || isSaving}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-[var(--accent-main)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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

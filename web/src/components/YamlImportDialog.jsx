import { AlertCircle, FileCode, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const PLACEHOLDER = `people:
  - name: Full Name As In Workbook
    projects:
      - key: project_key_one
        order: 1
      - key: project_key_two
        order: 2

consolidated:
  include:
    - Full Name As In Workbook`;

export default function YamlImportDialog({ isOpen, onClose, onImport }) {
  const [yamlText, setYamlText] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setYamlText("");
      setError("");
      setIsLoading(false);
      return;
    }
    const timeoutId = window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (event) => {
      if (event.key === "Escape" && !isLoading) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const handleFileLoad = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      setYamlText(loadEvent.target.result || "");
      setError("");
    };
    reader.onerror = () => setError("Could not read the file.");
    reader.readAsText(file);
    // reset so the same file can be reloaded if needed
    event.target.value = "";
  };

  const handleImport = async () => {
    if (!yamlText.trim()) {
      setError("Paste or load a YAML file first.");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      const response = await fetch("/api/yaml-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: yamlText }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Import failed.");
      }
      onImport(data);
    } catch (importError) {
      setError(importError.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        aria-label="Close YAML import"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        disabled={isLoading}
        onClick={onClose}
        type="button"
      />

      <div className="relative z-10 flex h-[min(80vh,640px)] w-[min(90vw,600px)] flex-col overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-main)] bg-[var(--bg-panel)] shadow-[var(--shadow-panel)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-main)] px-5 py-4">
          <div className="flex items-center gap-2">
            <FileCode className="h-4 w-4 text-[var(--text-accent)]" />
            <div>
              <div className="text-sm font-medium text-[var(--text-main)]">
                Import from YAML
              </div>
              <div className="text-xs text-[var(--text-muted)]">
                Load a file or paste YAML to pre-fill the team and projects.
              </div>
            </div>
          </div>
          <button
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-transparent text-[var(--text-muted)] transition hover:border-[var(--border-main)] hover:text-[var(--text-main)]"
            disabled={isLoading}
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1 flex-col gap-3 p-5">
          {/* Load file button */}
          <div>
            <input
              ref={fileInputRef}
              accept=".yaml,.yml"
              className="sr-only"
              id="yaml-file-input"
              onChange={handleFileLoad}
              type="file"
            />
            <button
              className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-main)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-main)] transition hover:border-[var(--text-muted)]"
              disabled={isLoading}
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              <Upload className="h-4 w-4" />
              Load .yaml file
            </button>
          </div>

          {/* Textarea */}
          <div className="relative min-h-0 flex-1">
            <textarea
              ref={textareaRef}
              className="h-full w-full resize-none rounded-[var(--radius-sm)] border border-[var(--border-main)] bg-[var(--bg-input)] p-3 font-mono text-xs text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:border-[var(--border-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--border-accent)]"
              disabled={isLoading}
              onChange={(e) => {
                setYamlText(e.target.value);
                setError("");
              }}
              placeholder={PLACEHOLDER}
              spellCheck={false}
              value={yamlText}
            />
          </div>

          {/* Error */}
          {error ? (
            <div className="flex items-start gap-2 rounded-[var(--radius-sm)] border border-[var(--border-danger-subtle)] bg-[var(--bg-danger-subtle)] px-3 py-2.5 text-sm text-[var(--text-danger)]">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[var(--border-main)] px-5 py-4">
          <a
            className="text-xs text-[var(--text-muted)] underline underline-offset-2 hover:text-[var(--text-main)]"
            href="/api/yaml-template"
            download="selections.template.yaml"
          >
            Download template
          </a>
          <div className="flex items-center gap-3">
            <button
              className="rounded-[var(--radius-sm)] border border-[var(--border-main)] bg-[var(--bg-panel)] px-4 py-2 text-sm text-[var(--text-main)] transition hover:border-[var(--text-muted)] disabled:opacity-50"
              disabled={isLoading}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className={`inline-flex items-center gap-2 rounded-[var(--radius-sm)] px-4 py-2 text-sm font-medium transition ${
                isLoading
                  ? "cursor-not-allowed bg-[var(--border-main)] text-[var(--text-muted)]"
                  : "bg-[var(--accent-main)] text-[var(--accent-text)] hover:bg-[var(--accent-hover)]"
              }`}
              disabled={isLoading || !yamlText.trim()}
              onClick={handleImport}
              type="button"
            >
              {isLoading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--accent-text)] border-t-transparent opacity-40" />
                  Importing…
                </>
              ) : (
                <>
                  <FileCode className="h-4 w-4" />
                  Import
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

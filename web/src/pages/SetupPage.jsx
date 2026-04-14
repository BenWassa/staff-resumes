import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle, FolderOpen } from 'lucide-react';
import { apiFetch } from '../utils/apiFetch';
import { selectFolder } from '../utils/selectFolder';

export default function SetupPage() {
  const navigate = useNavigate();
  const [pursuitsRoot, setPursuitsRoot] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch('/api/config/paths')
      .then((r) => r.json())
      .then((data) => {
        if (data.pursuits_root_exists) {
          navigate('/home', { replace: true });
        }
      })
      .catch(() => {});
  }, [navigate]);

  async function handleSaveConfig() {
    const trimmed = pursuitsRoot.trim();
    if (!trimmed) {
      setError('Use Browse to select your Pursuits - Documents folder.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await apiFetch('/api/config/paths', {
        method: 'POST',
        body: JSON.stringify({
          pursuits_root: trimmed,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save configuration');
      }

      navigate('/home', { replace: true });
    } catch (err) {
      setError(err.message || 'An error occurred while saving configuration.');
    } finally {
      setLoading(false);
    }
  }

  async function handleBrowse() {
    try {
      const picked = await selectFolder();
      if (!picked) return;
      setPursuitsRoot(picked);
      setError(null);
    } catch {
      setError('Could not open folder picker. Try again or enter the path manually.');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-main)]">
      <div className="w-full max-w-2xl px-6 py-12">
        <div className="section-intro mb-8 text-center">
          <h1 className="section-title text-3xl">Setup Required</h1>
          <p className="section-description text-base">
            Use Browse to choose your <span className="font-semibold text-[var(--text-primary)]">Pursuits - Documents</span>{' '}
            folder to get started with resume generation.
          </p>
        </div>

        <div className="panel-surface overflow-hidden">
          <div className="panel-header">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Projects Folder Path
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Find and select <span className="font-medium text-[var(--text-main)]">Pursuits - Documents</span>, for example{' '}
              <code className="rounded bg-[var(--bg-hover)] px-2 py-0.5 text-xs">
                C:\Users\ben.haddon\OneDrive - Blackline Consulting\Pursuits - Documents
              </code>
              .
            </p>
          </div>

          <div className="p-8">
            <div className="mb-4 flex items-center gap-3">
              <input
                type="text"
                value={pursuitsRoot}
                onChange={(e) => setPursuitsRoot(e.target.value)}
                placeholder="Use Browse to select your Pursuits - Documents folder"
                spellCheck={false}
                autoComplete="off"
                className="input-field"
              />
              <button
                type="button"
                onClick={handleBrowse}
                className="button-secondary whitespace-nowrap"
              >
                <FolderOpen size={16} />
                Browse
              </button>
            </div>

            <div className="mb-8 flex items-start gap-3 rounded-lg border border-[var(--border-accent-subtle)] bg-[var(--bg-accent-subtle)] p-4">
              <CheckCircle size={18} className="mt-0.5 flex-shrink-0 text-[var(--accent-main)]" />
              <p className="text-xs text-[var(--text-main)]">
                Choose the folder named{' '}
                <code className="rounded bg-white/50 px-1 font-semibold">Pursuits - Documents</code> (not an
                individual project subfolder).
              </p>
            </div>

            {error && (
              <div className="mb-8 flex items-start gap-3 rounded-lg border border-[var(--border-danger-subtle)] bg-[var(--bg-danger-subtle)] p-4">
                <AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-[var(--text-danger)]" />
                <p className="text-sm text-[var(--text-danger)] font-medium">{error}</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveConfig}
                disabled={loading}
                className="button-primary min-w-[120px]"
              >
                {loading ? 'Saving...' : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

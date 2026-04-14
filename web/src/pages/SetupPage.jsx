import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle, FolderOpen } from 'lucide-react';
import { apiFetch } from '../utils/apiFetch';

export default function SetupPage() {
  const navigate = useNavigate();
  const [pursuitsRoot, setPursuitsRoot] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const canPickFolder =
    typeof window !== 'undefined' && typeof window.electronAPI?.selectFolder === 'function';

  useEffect(() => {
    apiFetch('/api/config/paths')
      .then((r) => r.json())
      .then((data) => {
        if (data.pursuits_root_exists) {
          navigate('/admin', { replace: true });
        }
      })
      .catch(() => {});
  }, [navigate]);

  async function handleSaveConfig() {
    const trimmed = pursuitsRoot.trim();
    if (!trimmed) {
      setError(
        canPickFolder
          ? 'Use Browse to select your Pursuits - Documents folder.'
          : 'Enter the full Projects folder path.',
      );
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

      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.message || 'An error occurred while saving configuration.');
    } finally {
      setLoading(false);
    }
  }

  async function handleBrowse() {
    try {
      const picked = await window.electronAPI.selectFolder();
      if (!picked) return;
      setPursuitsRoot(picked);
      setError(null);
    } catch {
      setError('Could not open folder picker. Enter the path manually.');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-main)]">
      <div className="w-full max-w-2xl px-6 py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-2xl font-semibold text-[var(--text-primary)]">Setup Required</h1>
          <p className="text-[var(--text-muted)]">
            Use Browse to choose your <span className="font-semibold">Pursuits - Documents</span>{' '}
            folder to get started with resume generation.
          </p>
        </div>

        <div className="panel-surface">
          <div className="p-6">
            <div className="mb-6">
              <h2 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">
                Projects Folder Path
              </h2>
              <p className="break-all text-sm text-[var(--text-muted)]">
                Find and select <span className="font-medium">Pursuits - Documents</span>, for example{' '}
                <code className="rounded bg-[var(--bg-secondary)] px-2 py-1 text-xs">
                  C:\Users\ben.haddon\OneDrive - Blackline Consulting\Pursuits - Documents
                </code>
                .
              </p>
            </div>

            <div className="mb-3 flex items-center gap-2">
              <input
                type="text"
                value={pursuitsRoot}
                onChange={canPickFolder ? undefined : (e) => setPursuitsRoot(e.target.value)}
                placeholder={
                  canPickFolder
                    ? 'Use Browse to select your Pursuits - Documents folder'
                    : 'C:\\Company\\Projects'
                }
                spellCheck={false}
                autoComplete="off"
                readOnly={canPickFolder}
                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-blue-500"
              />
              {canPickFolder && (
                <button
                  type="button"
                  onClick={handleBrowse}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-main)]"
                >
                  <FolderOpen size={16} />
                  Browse
                </button>
              )}
            </div>

            <div className="mb-6 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <CheckCircle size={18} className="mt-0.5 flex-shrink-0 text-blue-600" />
              <p className="text-xs text-blue-700">
                Choose the folder named{' '}
                <code className="rounded bg-blue-100 px-1">Pursuits - Documents</code> (not an
                individual project subfolder).
              </p>
            </div>

            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
                <AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-red-600" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={handleSaveConfig}
                disabled={loading}
                className="rounded bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
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

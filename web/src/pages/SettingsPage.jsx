import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle, FolderOpen } from 'lucide-react';
import { apiFetch } from '../utils/apiFetch';

export default function SettingsPage() {
  const navigate = useNavigate();

  const [configStatus, setConfigStatus] = useState(null);
  const [pursuitsRootInput, setPursuitsRootInput] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const canPickFolder =
    typeof window !== 'undefined' && typeof window.electronAPI?.selectFolder === 'function';

  useEffect(() => {
    apiFetch('/api/config/paths')
      .then((r) => r.json())
      .then((data) => {
        setConfigStatus(data);
        setPursuitsRootInput(data.pursuits_root || '');
      })
      .catch((err) => setError(err.message));
  }, []);

  async function handleSaveConfig() {
    const trimmed = pursuitsRootInput.trim();
    if (!trimmed) {
      setError(
        canPickFolder
          ? 'Use Browse to select your Pursuits - Documents folder.'
          : 'Enter the full Projects folder path.',
      );
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await apiFetch('/api/config/paths', {
        method: 'POST',
        body: JSON.stringify({
          pursuits_root: trimmed,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to save configuration');
      }

      setConfigStatus(data);
      setPursuitsRootInput(data.pursuits_root || trimmed);
      setSuccess('Configuration saved successfully. Pursuits are syncing in the background.');
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
      setPursuitsRootInput(picked);
      setError(null);
      setSuccess(null);
    } catch {
      setError('Could not open folder picker. Enter the path manually.');
    }
  }

  return (
    <div className="app-shell">
      <div className="app-shell-header flex items-center justify-between gap-4">
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center gap-2 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={18} />
          Back to Admin
        </button>
        <span className="app-shell-brand font-sans text-lg">
          Blackline <span className="font-normal text-[var(--text-muted)]">Settings</span>
        </span>
        <div className="w-24"></div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="panel-surface">
          <div className="p-6">
            <div className="mb-8">
              <h1 className="mb-2 text-2xl font-semibold text-[var(--text-primary)]">Configuration</h1>
              <p className="text-sm text-[var(--text-muted)]">
                Manage your Pursuits folder and other local settings.
              </p>
            </div>

            {configStatus && (
              <div className="mb-8 border-b border-[var(--border-color)] pb-8">
                <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
                  Current Configuration
                </h2>
                <div className="rounded-lg bg-[var(--bg-secondary)] p-4">
                  <div className="mb-2 flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-[var(--text-primary)]">Projects Folder</h3>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        {configStatus.pursuits_root || '(Not configured)'}
                      </p>
                    </div>
                    <div>
                      {configStatus.pursuits_root_exists ? (
                        <div className="flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                          <CheckCircle size={14} />
                          Configured
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 rounded-full bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-700">
                          <AlertCircle size={14} />
                          Not Found
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
                Update Projects Folder
              </h2>

              <div className="mb-3 flex items-center gap-2">
                <input
                  type="text"
                  value={pursuitsRootInput}
                  onChange={canPickFolder ? undefined : (e) => setPursuitsRootInput(e.target.value)}
                  placeholder={
                    canPickFolder
                      ? 'Use Browse to select your Pursuits - Documents folder'
                      : 'C:\\Company\\Projects'
                  }
                  spellCheck={false}
                  autoComplete="off"
                  disabled={loading}
                  readOnly={canPickFolder}
                  className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-blue-500 disabled:opacity-70"
                />
                {canPickFolder && (
                  <button
                    type="button"
                    onClick={handleBrowse}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-main)] disabled:opacity-70"
                  >
                    <FolderOpen size={16} />
                    Browse
                  </button>
                )}
              </div>

              <p className="mb-6 break-all text-xs text-[var(--text-muted)]">
                Find and select the folder named{' '}
                <code className="rounded bg-[var(--bg-secondary)] px-1">Pursuits - Documents</code>{' '}
                (for example{' '}
                <code className="rounded bg-[var(--bg-secondary)] px-1">
                  C:\Users\ben.haddon\OneDrive - Blackline Consulting\Pursuits - Documents
                </code>
                ).
              </p>

              {error && (
                <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
                  <AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-red-600" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {success && (
                <div className="mb-6 flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
                  <CheckCircle size={18} className="mt-0.5 flex-shrink-0 text-green-600" />
                  <p className="text-sm text-green-700">{success}</p>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={handleSaveConfig}
                  disabled={loading}
                  className="rounded bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

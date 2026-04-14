import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle, FolderOpen, Settings } from 'lucide-react';
import { apiFetch } from '../utils/apiFetch';
import { selectFolder } from '../utils/selectFolder';

export default function SettingsPage() {
  const navigate = useNavigate();

  const [configStatus, setConfigStatus] = useState(null);
  const [pursuitsRootInput, setPursuitsRootInput] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

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
      setError('Use Browse to select your Pursuits - Documents folder.');
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
      const picked = await selectFolder();
      if (!picked) return;
      setPursuitsRootInput(picked);
      setError(null);
      setSuccess(null);
    } catch {
      setError('Could not open folder picker. Try again or enter the path manually.');
    }
  }

  return (
    <div className="app-shell">
      <header className="app-shell-header">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <h1 className="app-shell-brand text-2xl">
              Blackline <span className="font-normal text-[var(--text-muted)]">Staff Resumes</span>
            </h1>
            <div className="hidden h-6 w-px bg-[var(--border-main)] sm:block" />
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-main)] bg-[var(--bg-card)] px-3 py-1 font-mono text-xs uppercase tracking-[0.18em] text-[var(--text-muted)] shadow-sm">
                <Settings className="h-3.5 w-3.5" />
                Settings
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/home')}
            className="button-secondary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="section-intro mb-10">
          <h1 className="section-title text-3xl">Configuration</h1>
          <p className="section-description text-base">
            Manage your Pursuits folder and other local settings.
          </p>
        </div>

        <div className="grid gap-10">
          {configStatus && (
            <div className="panel-surface overflow-hidden">
              <div className="panel-header">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  Current Configuration
                </h2>
              </div>
              <div className="p-8">
                <div className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-5">
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">Projects Folder</h3>
                      <p className="mt-2 font-mono text-sm text-[var(--text-main)] break-all">
                        {configStatus.pursuits_root || '(Not configured)'}
                      </p>
                    </div>
                    <div className="shrink-0">
                      {configStatus.pursuits_root_exists ? (
                        <div className="flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-1.5 text-xs font-bold text-green-700">
                          <CheckCircle size={14} />
                          CONNECTED
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-1.5 text-xs font-bold text-red-700">
                          <AlertCircle size={14} />
                          DISCONNECTED
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="panel-surface overflow-hidden">
            <div className="panel-header">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Update Projects Folder
              </h2>
            </div>

            <div className="p-8">
              <div className="mb-4 flex items-center gap-3">
                <input
                  type="text"
                  value={pursuitsRootInput}
                  onChange={(e) => setPursuitsRootInput(e.target.value)}
                  placeholder="Use Browse to select your Pursuits - Documents folder"
                  spellCheck={false}
                  autoComplete="off"
                  disabled={loading}
                  className="input-field"
                />
                <button
                  type="button"
                  onClick={handleBrowse}
                  disabled={loading}
                  className="button-secondary whitespace-nowrap"
                >
                  <FolderOpen size={16} />
                  Browse
                </button>
              </div>

              <p className="mb-8 break-all text-xs text-[var(--text-muted)]">
                Find and select the folder named{' '}
                <code className="rounded bg-[var(--bg-hover)] px-1 font-semibold text-[var(--text-main)]">Pursuits - Documents</code>{' '}
                (for example{' '}
                <code className="rounded bg-[var(--bg-hover)] px-1">
                  C:\Users\ben.haddon\OneDrive - Blackline Consulting\Pursuits - Documents
                </code>
                ).
              </p>

              {error && (
                <div className="mb-6 flex items-start gap-3 rounded-lg border border-[var(--border-danger-subtle)] bg-[var(--bg-danger-subtle)] p-4">
                  <AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-[var(--text-danger)]" />
                  <p className="text-sm font-medium text-[var(--text-danger)]">{error}</p>
                </div>
              )}

              {success && (
                <div className="mb-6 flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
                  <CheckCircle size={18} className="mt-0.5 flex-shrink-0 text-green-600" />
                  <p className="text-sm font-medium text-green-700">{success}</p>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSaveConfig}
                  disabled={loading}
                  className="button-primary min-w-[140px]"
                >
                  {loading ? 'Saving...' : 'Update Settings'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

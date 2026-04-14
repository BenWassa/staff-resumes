import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../utils/apiFetch';
import { AlertCircle, CheckCircle, Upload, ArrowLeft } from 'lucide-react';

export default function SettingsPage() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [configStatus, setConfigStatus] = useState(null);
  const [selectedFolderName, setSelectedFolderName] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);

  // Redirect if not an admin
  useEffect(() => {
    if (user && role !== 'admin') {
      navigate('/admin', { replace: true });
    }
  }, [user, role, navigate]);

  // Load current config on mount
  useEffect(() => {
    apiFetch('/api/config/paths')
      .then((r) => r.json())
      .then((data) => setConfigStatus(data))
      .catch((err) => setError(err.message));
  }, []);

  function handleDirectorySelect(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    setSuccess(null);
    setValidating(true);

    // Extract folder name from relative paths
    const filePaths = Array.from(files).map((f) => f.webkitRelativePath || f.name);
    if (filePaths.length === 0) {
      setValidating(false);
      setError('No files selected. Please select a folder.');
      return;
    }

    const firstFile = filePaths[0];
    const parts = firstFile.split('/').filter((p) => p.length > 0);

    if (parts.length === 0) {
      setValidating(false);
      setError('Invalid folder structure. Please select a valid Projects folder.');
      return;
    }

    const selectedFolderNameFromPath = parts[0];

    // Validate folder name matches pattern: "Name - YYYYNNN"
    const pursuitPattern = /^.+ - \d{7}$/;
    const folderNames = new Set();
    let foundMatchingFolder = false;

    for (const path of filePaths) {
      const pathParts = path.split('/').filter((p) => p.length > 0);
      if (pathParts.length > 0) {
        const folderName = pathParts[0];
        folderNames.add(folderName);
        if (pursuitPattern.test(folderName)) {
          foundMatchingFolder = true;
        }
      }
    }

    if (!foundMatchingFolder) {
      setValidating(false);
      setError(
        'Folder does not contain projects matching the pattern "Project Name - YYYYNNN". ' +
        'Please select your Projects folder.'
      );
      return;
    }

    setSelectedFolderName(selectedFolderNameFromPath);
    setValidating(false);
  }

  async function handleSaveConfig() {
    if (!selectedFolderName) {
      setError('No path selected.');
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await apiFetch('/api/config/paths', {
        method: 'POST',
        body: JSON.stringify({
          pursuits_root: selectedFolderName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save configuration');
      }

      const data = await response.json();
      setConfigStatus(data);
      setSelectedFolderName(null);
      setSuccess('Configuration saved successfully. Pursuits will sync shortly.');
    } catch (err) {
      setError(err.message || 'An error occurred while saving configuration.');
    } finally {
      setLoading(false);
    }
  }

  function handleBrowseClick() {
    fileInputRef.current?.click();
  }

  if (!user || role !== 'admin') {
    return null;
  }

  return (
    <div className="app-shell">
      <div className="app-shell-header flex items-center justify-between gap-4">
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft size={18} />
          Back to Admin
        </button>
        <span className="app-shell-brand font-sans text-lg">
          Blackline <span className="text-[var(--text-muted)] font-normal">Settings</span>
        </span>
        <div className="w-24"></div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="panel-surface">
          <div className="p-6">
            <div className="mb-8">
              <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
                Configuration
              </h1>
              <p className="text-sm text-[var(--text-muted)]">
                Manage your Projects folder and other settings.
              </p>
            </div>

            {/* Current Config Status */}
            {configStatus && (
              <div className="mb-8 pb-8 border-b border-[var(--border-color)]">
                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                  Current Configuration
                </h2>

                <div className="space-y-4">
                  {/* Projects Folder Status */}
                  <div className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-medium text-[var(--text-primary)]">
                          Projects Folder
                        </h3>
                        <p className="text-sm text-[var(--text-muted)] mt-1">
                          {configStatus.pursuits_root || '(Not configured)'}
                        </p>
                      </div>
                      <div>
                        {configStatus.pursuits_root_exists ? (
                          <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-1 rounded-full text-xs font-medium">
                            <CheckCircle size={14} />
                            Configured
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-yellow-700 bg-yellow-50 px-3 py-1 rounded-full text-xs font-medium">
                            <AlertCircle size={14} />
                            Not Found
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Change Projects Folder */}
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                Update Projects Folder
              </h2>

              <div className="flex flex-col items-center justify-center border-2 border-dashed border-[var(--border-color)] rounded-lg p-8 mb-6 bg-[var(--bg-secondary)]">
                <Upload size={40} className="text-[var(--text-muted)] mb-4" />
                <p className="text-sm text-[var(--text-primary)] mb-4 text-center">
                  Click below to select your Projects folder
                </p>
                <button
                  onClick={handleBrowseClick}
                  disabled={validating || loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {validating ? 'Validating...' : 'Browse'}
                </button>
              </div>

              {/* Selected Folder Info */}
              {selectedFolderName && (
                <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg mb-6">
                  <CheckCircle size={18} className="text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-900 mb-1">
                      Valid Projects Folder Selected
                    </p>
                    <p className="text-xs text-green-700">
                      Folder: <code className="bg-green-100 px-1 rounded">{selectedFolderName}</code>
                    </p>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
                  <AlertCircle size={18} className="text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg mb-6">
                  <CheckCircle size={18} className="text-green-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-green-700">{success}</p>
                </div>
              )}

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                webkitdirectory=""
                mozbrowserdir=""
                onChange={handleDirectorySelect}
                style={{ display: 'none' }}
                disabled={validating || loading}
              />

              {/* Save Button */}
              {selectedFolderName && (
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setSelectedFolderName(null);
                      setError(null);
                    }}
                    disabled={loading}
                    className="px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded font-medium hover:bg-[var(--bg-secondary)] disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveConfig}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

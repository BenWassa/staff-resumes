import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../utils/apiFetch';
import { AlertCircle, CheckCircle, Upload } from 'lucide-react';

export default function SetupPage() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [step, setStep] = useState(1);
  const [selectedPath, setSelectedPath] = useState(null);
  const [selectedFolderName, setSelectedFolderName] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);

  // Redirect if not an admin
  useEffect(() => {
    if (user && role !== 'admin') {
      navigate('/profile', { replace: true });
    }
  }, [user, role, navigate]);

  // Check if already configured
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

  function handleDirectorySelect(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    setValidating(true);

    // The directory picker returns files with their relative paths
    // We need to find the common parent that matches the pursuits root pattern
    const filePaths = Array.from(files).map((f) => f.webkitRelativePath || f.name);
    if (filePaths.length === 0) {
      setValidating(false);
      setError('No files selected. Please select a folder.');
      return;
    }

    // Extract the first directory from the relative path
    // e.g., "City of Medicine Hat (AB) - 2025024/file.txt" -> "City of Medicine Hat (AB) - 2025024"
    const firstFile = filePaths[0];
    const parts = firstFile.split('/').filter((p) => p.length > 0);

    if (parts.length === 0) {
      setValidating(false);
      setError('Invalid folder structure. Please select a valid Projects folder.');
      return;
    }

    const selectedFolderNameFromPath = parts[0];

    // Validate that folder name matches pattern: "Name - YYYYNNN"
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

    // Store the selected folder name (we can't access the full path in browsers for security reasons)
    setSelectedFolderName(selectedFolderNameFromPath);
    setSelectedPath(selectedFolderNameFromPath);
    setStep(2);
    setValidating(false);
  }

  async function handleSaveConfig() {
    if (!selectedPath) {
      setError('No path selected.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await apiFetch('/api/config/paths', {
        method: 'POST',
        body: JSON.stringify({
          pursuits_root: selectedPath,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save configuration');
      }

      // Redirect to admin
      navigate('/admin', { replace: true });
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
    <div className="flex items-center justify-center min-h-screen bg-[var(--bg-main)]">
      <div className="w-full max-w-2xl px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
            Setup Required
          </h1>
          <p className="text-[var(--text-muted)]">
            Configure your Projects folder to get started with resume generation.
          </p>
        </div>

        {/* Step 1: Directory Selection */}
        {step === 1 && (
          <div className="panel-surface">
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                  Step 1: Select Your Projects Folder
                </h2>
                <p className="text-sm text-[var(--text-muted)]">
                  Point to the folder containing your project directories. Each project folder
                  should be named in the format: <code className="bg-[var(--bg-secondary)] px-2 py-1 rounded text-xs">Project Name - YYYYNNN</code>
                </p>
              </div>

              <div className="flex flex-col items-center justify-center border-2 border-dashed border-[var(--border-color)] rounded-lg p-8 mb-6 bg-[var(--bg-secondary)]">
                <Upload size={40} className="text-[var(--text-muted)] mb-4" />
                <p className="text-sm text-[var(--text-primary)] mb-4 text-center">
                  Click the button below to select your Projects folder
                </p>
                <button
                  onClick={handleBrowseClick}
                  disabled={validating}
                  className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {validating ? 'Validating...' : 'Browse'}
                </button>
              </div>

              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
                  <AlertCircle size={18} className="text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                webkitdirectory=""
                onChange={handleDirectorySelect}
                style={{ display: 'none' }}
                disabled={validating}
              />

              <p className="text-xs text-[var(--text-muted)] text-center">
                We&apos;ll only access the folder structure and won&apos;t store file contents.
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Confirmation */}
        {step === 2 && (
          <div className="panel-surface">
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                  Step 2: Confirm Configuration
                </h2>
                <p className="text-sm text-[var(--text-muted)]">
                  Ready to configure the Projects folder?
                </p>
              </div>

              <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg mb-6">
                <CheckCircle size={18} className="text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900 mb-1">
                    Valid Projects Folder Detected
                  </p>
                  <p className="text-xs text-green-700">
                    Selected folder: <code className="bg-green-100 px-1 rounded">{selectedFolderName}</code>
                  </p>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
                  <AlertCircle size={18} className="text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setStep(1);
                    setSelectedPath(null);
                    setError(null);
                  }}
                  disabled={loading}
                  className="px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded font-medium hover:bg-[var(--bg-secondary)] disabled:opacity-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSaveConfig}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Saving...' : 'Continue'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

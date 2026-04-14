import { FileText, Settings, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ResumeModal from '../components/ResumeModal';
import StaffGalleryPanel from '../components/StaffGalleryPanel';
import { apiFetch } from '../utils/apiFetch';

export default function HomePage() {
  const navigate = useNavigate();
  const [allStaff, setAllStaff] = useState([]);
  const [showResumeModal, setShowResumeModal] = useState(false);

  useEffect(() => {
    apiFetch('/api/people')
      .then((r) => r.json())
      .then((data) => setAllStaff(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    apiFetch('/api/config/paths')
      .then((r) => r.json())
      .then((data) => {
        if (!data.pursuits_root_exists) {
          navigate('/setup', { replace: true });
        }
      })
      .catch(() => {});
  }, [navigate]);

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
                <Users className="h-3.5 w-3.5" />
                Directory
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="button-secondary"
              onClick={() => navigate('/settings')}
              title="Settings"
              type="button"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </button>
            <button
              className="button-primary shadow-lg"
              onClick={() => setShowResumeModal(true)}
              type="button"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Generate Resumes</span>
              <span className="sm:hidden">Generate</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col p-4 sm:p-6 lg:p-8">
        <StaffGalleryPanel allStaff={allStaff} />
      </main>

      {showResumeModal && (
        <ResumeModal
          isOpen={showResumeModal}
          onClose={() => setShowResumeModal(false)}
        />
      )}
    </div>
  );
}

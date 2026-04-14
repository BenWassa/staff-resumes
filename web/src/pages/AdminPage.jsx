import { Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ResumeModal from '../components/ResumeModal';
import StaffGalleryPanel from '../components/StaffGalleryPanel';
import { apiFetch } from '../utils/apiFetch';

const TABS = ['resumes', 'profiles'];
const TAB_LABELS = {
  resumes: 'Generate Resumes',
  profiles: 'Staff Profiles',
};

export default function AdminPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('profiles');
  const [allStaff, setAllStaff] = useState([]);
  const [showResumeModal, setShowResumeModal] = useState(false);

  useEffect(() => {
    if (tab !== 'profiles') return;
    apiFetch('/api/people')
      .then((r) => r.json())
      .then((data) => setAllStaff(data))
      .catch(() => {});
  }, [tab]);

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

  useEffect(() => {
    setShowResumeModal(tab === 'resumes');
  }, [tab]);

  return (
    <div className="app-shell">
      <div className="app-shell-header flex items-center justify-between gap-4">
        <span className="app-shell-brand font-sans text-lg">
          Blackline <span className="text-[var(--text-muted)] font-normal">Staff Resumes</span>
        </span>
        <div className="flex items-center gap-4">
          <span className="text-xs text-[var(--text-muted)]">Local session</span>
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="Settings"
          >
            <Settings size={14} />
          </button>
        </div>
      </div>

      <div className="app-shell-tabs flex gap-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="app-shell-tab"
            data-active={tab === t}
            type="button"
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === 'profiles' && <StaffGalleryPanel allStaff={allStaff} />}

      {showResumeModal && (
        <ResumeModal
          isOpen={showResumeModal}
          onClose={() => {
            setShowResumeModal(false);
            setTab('profiles');
          }}
        />
      )}
    </div>
  );
}

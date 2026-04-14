import { signOut } from 'firebase/auth';
import { LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import ResumeModal from '../components/ResumeModal';
import StaffGalleryPanel from '../components/StaffGalleryPanel';
import UserManagementPanel from '../components/UserManagementPanel';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebase';
import { apiFetch } from '../utils/apiFetch';

const TABS = ['resumes', 'profiles', 'users'];
const TAB_LABELS = {
  resumes: 'Generate Resumes',
  profiles: 'Staff Profiles',
  users: 'Manage Users',
};

export default function AdminPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('profiles');
  const [allStaff, setAllStaff] = useState([]);
  const [showResumeModal, setShowResumeModal] = useState(false);

  useEffect(() => {
    apiFetch('/api/people')
      .then((r) => r.json())
      .then((data) => setAllStaff(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setShowResumeModal(tab === 'resumes');
  }, [tab]);

  async function handleSignOut() {
    await signOut(auth);
    window.location.href = '/login';
  }

  return (
    <div className="app-shell">
      <div className="app-shell-header flex items-center justify-between gap-4">
        <span className="app-shell-brand font-sans text-lg">
          Blackline <span className="text-[var(--text-muted)] font-normal">Staff Resumes</span>
        </span>
        <div className="flex items-center gap-4">
          <span className="text-xs text-[var(--text-muted)]">{user?.email}</span>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <LogOut size={14} />
            Sign out
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

      {tab === 'users' && (
        <div className="mx-auto max-w-4xl px-6 py-8">
          <div className="panel-surface overflow-hidden">
            <div className="panel-header">
              <div className="section-intro mb-0">
                <h1 className="section-title">Manage Users</h1>
                <p className="section-description">
                  Link each user to their staff profile and set their role. Staff members can only
                  edit their own profile; admins can generate resumes and manage users.
                </p>
              </div>
            </div>
            <div className="px-6 py-6">
              <UserManagementPanel allStaff={allStaff} />
            </div>
          </div>
        </div>
      )}

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

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
    <div className="min-h-screen bg-[var(--bg-main)]">
      <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--border)]">
        <span className="text-[var(--blc-red)] font-bold tracking-tight font-sans">
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

      <div className="flex gap-1 px-6 border-b border-[var(--border)]">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-[var(--blc-red)] text-[var(--text-primary)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
            type="button"
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === 'profiles' && <StaffGalleryPanel allStaff={allStaff} />}

      {tab === 'users' && (
        <div className="max-w-3xl mx-auto px-6 py-8">
          <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-1">Manage Users</h1>
          <p className="text-sm text-[var(--text-muted)] mb-6">
            Link each user to their staff profile and set their role. Staff members can only edit
            their own profile; admins can generate resumes and manage users.
          </p>
          <UserManagementPanel allStaff={allStaff} />
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

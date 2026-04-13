import { signOut } from 'firebase/auth';
import { LogOut } from 'lucide-react';
import { auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import BioEditor from '../components/profile/BioEditor';
import ProjectsEditor from '../components/profile/ProjectsEditor';
import EducationEditor from '../components/profile/EducationEditor';
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const TABS = ['bio', 'projects', 'education'];
const TAB_LABELS = { bio: 'Bio', projects: 'Projects', education: 'Education' };

export default function ProfilePage() {
  const { user, role, staffId: myStaffId } = useAuth();
  const { staffId: paramStaffId } = useParams();
  const navigate = useNavigate();
  const staffId = paramStaffId ?? myStaffId;

  const [tab, setTab] = useState('bio');

  async function handleSignOut() {
    await signOut(auth);
    window.location.href = '/login';
  }

  if (!staffId && role === 'admin') {
    navigate('/admin', { replace: true });
    return null;
  }

  if (!staffId) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <p className="text-sm" style={{ color: 'var(--text-main)' }}>
            Your account isn't linked to a staff profile yet.
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Signed in as <strong>{user?.email}</strong>
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Contact your admin to get linked up.
          </p>
          <button
            onClick={handleSignOut}
            className="mt-2 flex items-center gap-1.5 text-xs mx-auto transition-colors"
            style={{ color: 'var(--accent-main)' }}
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-main)]">
      {/* Top bar */}
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

      <div className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-1">My Profile</h1>
        <p className="text-sm text-[var(--text-muted)] mb-6">
          Keep your bio and projects up to date — this is what gets pulled into proposal resumes.
        </p>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-[var(--border)]">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t
                  ? 'border-[var(--blc-red)] text-[var(--text-primary)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        {tab === 'bio' && <BioEditor staffId={staffId} />}
        {tab === 'projects' && <ProjectsEditor staffId={staffId} />}
        {tab === 'education' && <EducationEditor staffId={staffId} />}
      </div>
    </div>
  );
}

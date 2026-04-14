import { signOut } from 'firebase/auth';
import { LogOut } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import ProfileEditorTabs from '../components/profile/ProfileEditorTabs';
import { useAuth } from '../contexts/AuthContext';

export default function ProfilePage() {
  const { user, role, staffId: myStaffId } = useAuth();
  const { staffId: paramStaffId } = useParams();
  const navigate = useNavigate();
  const staffId = paramStaffId ?? myStaffId;

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
            Your account isn&apos;t linked to a staff profile yet.
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
        <ProfileEditorTabs
          staffId={staffId}
          title="My Profile"
          description="Keep your bio and projects up to date — this is what gets pulled into proposal resumes."
        />
      </div>
    </div>
  );
}

import { useParams, useNavigate } from 'react-router-dom';
import ProfileEditorTabs from '../components/profile/ProfileEditorTabs';
import { useAuth } from '../contexts/AuthContext';

export default function ProfilePage() {
  const { role, staffId: myStaffId } = useAuth();
  const { staffId: paramStaffId } = useParams();
  const navigate = useNavigate();
  const staffId = paramStaffId ?? myStaffId;

  if (!staffId && role === 'admin') {
    navigate('/admin', { replace: true });
    return null;
  }

  if (!staffId) {
    return (
      <div className="app-shell flex items-center justify-center px-4">
        <div className="panel-surface max-w-md space-y-3 px-8 py-8 text-center">
          <p className="text-sm" style={{ color: 'var(--text-main)' }}>
            This profile is not linked to a staff record yet.
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Open a specific staff member from the gallery to edit their profile.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="app-shell-header flex items-center justify-between gap-4">
        <span className="app-shell-brand font-sans text-lg">
          Blackline <span className="text-[var(--text-muted)] font-normal">Staff Resumes</span>
        </span>
        <span className="text-xs text-[var(--text-muted)]">Local session</span>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8">
        <ProfileEditorTabs
          staffId={staffId}
          title="My Profile"
          description="Keep your bio and projects up to date â€” this is what gets pulled into proposal resumes."
        />
      </div>
    </div>
  );
}

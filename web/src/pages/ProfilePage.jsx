import { Navigate, useParams } from 'react-router-dom';
import ProfileEditorTabs from '../components/profile/ProfileEditorTabs';

export default function ProfilePage() {
  const { staffId } = useParams();

  if (!staffId) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="app-shell">
      <div className="app-shell-header flex items-center justify-between gap-4">
        <span className="app-shell-brand font-sans text-lg">
          Blackline <span className="font-normal text-[var(--text-muted)]">Staff Resumes</span>
        </span>
        <span className="text-xs text-[var(--text-muted)]">Local session</span>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8">
        <ProfileEditorTabs
          staffId={staffId}
          title="Staff Profile"
          description="Keep bio and projects up to date - this is what gets pulled into proposal resumes."
        />
      </div>
    </div>
  );
}

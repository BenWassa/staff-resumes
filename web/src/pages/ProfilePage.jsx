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
        <span className="app-shell-brand font-sans text-xl">
          Blackline <span className="font-normal text-[var(--text-muted)]">Staff Resumes</span>
        </span>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Local session</span>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-12">
        <ProfileEditorTabs
          staffId={staffId}
          title="Staff Profile"
          description="Keep bio and projects up to date - this is what gets pulled into proposal resumes."
        />
      </div>
    </div>
  );
}

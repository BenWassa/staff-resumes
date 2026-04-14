import { Navigate, useParams, useNavigate } from 'react-router-dom';
import { UserRound } from 'lucide-react';
import ProfileEditorTabs from '../components/profile/ProfileEditorTabs';
import CloseButton from '../components/CloseButton';

export default function ProfilePage() {
  const { staffId } = useParams();
  const navigate = useNavigate();

  if (!staffId) {
    return <Navigate to="/admin" replace />;
  }

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
                <UserRound className="h-3.5 w-3.5" />
                Profile
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <CloseButton 
              label="Exit Profile View" 
              onClick={() => navigate('/admin')} 
            />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <ProfileEditorTabs
          staffId={staffId}
          title="Staff Profile"
          description="Keep bio and projects up to date - this is what gets pulled into proposal resumes."
        />
      </div>
    </div>
  );
}

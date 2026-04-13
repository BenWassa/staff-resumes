import { signOut } from 'firebase/auth';
import { LogOut } from 'lucide-react';
import { auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import ResumeModal from '../components/ResumeModal';

export default function AdminPage() {
  const { user } = useAuth();

  async function handleSignOut() {
    await signOut(auth);
    window.location.href = '/login';
  }

  return (
    <div className="min-h-screen bg-[var(--bg-main)]">
      {/* Minimal top bar */}
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

      <ResumeModal isOpen={true} onClose={() => {}} />
    </div>
  );
}

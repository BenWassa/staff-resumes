import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Wraps a route so only authenticated users (and optionally a specific role)
 * can access it. Shows a blank loading screen while auth state resolves.
 *
 * Props:
 *   children  — the page component to render
 *   role      — optional: "admin" | "member" — redirects if role doesn't match
 *   redirect  — where to send unauthorized users (default: "/login")
 */
export default function ProtectedRoute({ children, role, redirect = '/login' }) {
  const { user, role: userRole, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-[var(--bg-main)]" />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role && userRole !== role) {
    // Member trying to access admin route → their profile
    // Admin trying to access member-only route → admin dashboard
    return <Navigate to={userRole === 'admin' ? '/admin' : '/profile'} replace />;
  }

  return children;
}

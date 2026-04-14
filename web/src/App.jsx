import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import SetupPage from './pages/SetupPage';
import SettingsPage from './pages/SettingsPage';
import { apiFetch } from './utils/apiFetch';

function RootRedirect() {
  const { user, role, loading } = useAuth();
  const [configStatus, setConfigStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    if (!user || role !== 'admin') {
      setStatusLoading(false);
      return;
    }
    apiFetch('/api/config/paths')
      .then((r) => r.json())
      .then((data) => setConfigStatus(data))
      .catch(() => setConfigStatus(null))
      .finally(() => setStatusLoading(false));
  }, [user, role]);

  if (loading || (user && role === 'admin' && statusLoading)) {
    return <div className="min-h-screen bg-[var(--bg-main)]" />;
  }

  if (!user) return <Navigate to="/login" replace />;

  // Admins must configure pursuits root before accessing /admin
  if (role === 'admin' && !configStatus?.pursuits_root_exists) {
    return <Navigate to="/setup" replace />;
  }

  return <Navigate to={role === 'admin' ? '/admin' : '/profile'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route path="/" element={<RootRedirect />} />

          {/* First-run setup wizard — admins only */}
          <Route
            path="/setup"
            element={
              <ProtectedRoute role="admin">
                <SetupPage />
              </ProtectedRoute>
            }
          />

          {/* Settings page — admins only */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute role="admin">
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          {/* Member profile editor — members see their own; admins can visit any */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/:staffId"
            element={
              <ProtectedRoute role="admin">
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Admin resume generation + staff management */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <AdminPage />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

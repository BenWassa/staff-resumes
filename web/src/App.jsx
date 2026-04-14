import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import SetupPage from './pages/SetupPage';
import SettingsPage from './pages/SettingsPage';
import { apiFetch } from './utils/apiFetch';

function RootRedirect() {
  const { loading } = useAuth();
  const [configStatus, setConfigStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/config/paths')
      .then((r) => r.json())
      .then((data) => setConfigStatus(data))
      .catch(() => setConfigStatus(null))
      .finally(() => setStatusLoading(false));
  }, []);

  if (loading || statusLoading) {
    return <div className="min-h-screen bg-[var(--bg-main)]" />;
  }

  if (!configStatus?.pursuits_root_exists) {
    return <Navigate to="/setup" replace />;
  }

  return <Navigate to="/admin" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />

          <Route
            path="/setup"
            element={
              <ProtectedRoute>
                <SetupPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

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
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

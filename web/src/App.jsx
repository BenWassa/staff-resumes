import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AdminPage from './pages/AdminPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import SetupPage from './pages/SetupPage';
import { apiFetch } from './utils/apiFetch';

function RootRedirect() {
  const [configStatus, setConfigStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/config/paths')
      .then((r) => r.json())
      .then((data) => setConfigStatus(data))
      .catch(() => setConfigStatus(null))
      .finally(() => setStatusLoading(false));
  }, []);

  if (statusLoading) {
    return <div className="min-h-screen bg-[var(--bg-main)]" />;
  }

  if (!configStatus?.pursuits_root_exists) {
    return <Navigate to="/setup" replace />;
  }

  return <Navigate to="/admin" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={<Navigate to="/admin" replace />} />
        <Route path="/profile/:staffId" element={<ProfilePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

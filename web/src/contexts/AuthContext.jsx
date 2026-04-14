import { createContext, useContext } from 'react';

const AuthContext = createContext(null);

const LOCAL_USER = {
  email: 'local@machine',
  displayName: 'Local User',
};

export function AuthProvider({ children }) {
  const value = {
    user: LOCAL_USER,
    userDoc: {
      role: 'admin',
      staff_id: null,
    },
    role: 'admin',
    staffId: null,
    loading: false,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

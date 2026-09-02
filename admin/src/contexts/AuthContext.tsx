import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../api/client';

export interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'EMPLOYEE';
  status: string;
  employee?: {
    id: string;
    displayName: string;
    employeeCode: string;
    position: string;
    department?: { id: string; name: string };
    schedule?: { id: string; name: string };
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('system_hr_admin_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('system_hr_admin_token');
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const verifySession = async () => {
      if (token) {
        try {
          const res = await apiClient.get('/auth/me');
          if (res.data.success && res.data.data.user.role === 'ADMIN') {
            setUser(res.data.data.user);
            localStorage.setItem('system_hr_admin_user', JSON.stringify(res.data.data.user));
          } else {
            await logout();
          }
        } catch {
          await logout();
        }
      }
      setIsLoading(false);
    };

    verifySession();
  }, [token]);

  const login = async (email: string, password?: string) => {
    const res = await apiClient.post('/auth/login', { email, password });
    const { token: newToken, user: newUser } = res.data.data;
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('system_hr_admin_token', newToken);
    localStorage.setItem('system_hr_admin_user', JSON.stringify(newUser));
  };

  const logout = async () => {
    try {
      if (token) await apiClient.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('system_hr_admin_token');
      localStorage.removeItem('system_hr_admin_user');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        isAdmin: user?.role === 'ADMIN',
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

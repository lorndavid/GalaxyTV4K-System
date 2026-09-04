import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface EmployeeProfile {
  id: string;
  employeeCode: string;
  firstName?: string;
  lastName?: string;
  displayName: string;
  khmerName?: string;
  latinName?: string;
  gender?: string;
  skill?: string;
  studyDay?: string;
  email: string;
  phone?: string;
  position: string;
  department?: {
    id?: string;
    name: string;
    code: string;
  };
  schedule?: {
    id?: string;
    name: string;
    days: Array<{
      dayOfWeek: string;
      isWorkingDay: boolean;
      startTime: string;
      endTime: string;
      breakStartTime?: string;
      breakEndTime?: string;
    }>;
  };
  isLocationSharingActive?: boolean;
}

export interface User {
  id: string;
  email: string;
  role: 'EMPLOYEE' | 'ADMIN';
  employee?: EmployeeProfile;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password?: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved =
        localStorage.getItem('system_hr_employee_user') ||
        sessionStorage.getItem('system_hr_employee_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return (
      localStorage.getItem('system_hr_employee_token') ||
      sessionStorage.getItem('system_hr_employee_token')
    );
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfile = async () => {
    try {
      const res = await apiClient.get('/auth/me');
      if (res.data.success) {
        setUser(res.data.data.user);
        if (localStorage.getItem('system_hr_employee_token')) {
          localStorage.setItem('system_hr_employee_user', JSON.stringify(res.data.data.user));
        } else {
          sessionStorage.setItem('system_hr_employee_user', JSON.stringify(res.data.data.user));
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const verifySession = async () => {
      if (token) {
        try {
          const res = await apiClient.get('/auth/me');
          if (res.data.success) {
            setUser(res.data.data.user);
            if (localStorage.getItem('system_hr_employee_token')) {
              localStorage.setItem('system_hr_employee_user', JSON.stringify(res.data.data.user));
            } else {
              sessionStorage.setItem('system_hr_employee_user', JSON.stringify(res.data.data.user));
            }
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

    // Listen to unauthorized custom event without hard page reload
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [token]);

  const login = async (email: string, password?: string, rememberMe: boolean = true) => {
    const res = await apiClient.post('/auth/login', { email, password, rememberMe });
    const { token: newToken, user: newUser } = res.data.data;
    setToken(newToken);
    setUser(newUser);

    if (rememberMe) {
      localStorage.setItem('system_hr_employee_token', newToken);
      localStorage.setItem('system_hr_employee_user', JSON.stringify(newUser));
      localStorage.setItem('system_hr_remember_me', 'true');
      localStorage.setItem('saved_login_email', email.trim());
      sessionStorage.removeItem('system_hr_employee_token');
      sessionStorage.removeItem('system_hr_employee_user');
    } else {
      sessionStorage.setItem('system_hr_employee_token', newToken);
      sessionStorage.setItem('system_hr_employee_user', JSON.stringify(newUser));
      localStorage.removeItem('system_hr_employee_token');
      localStorage.removeItem('system_hr_employee_user');
      localStorage.removeItem('system_hr_remember_me');
      localStorage.removeItem('saved_login_email');
    }
  };

  const logout = async () => {
    try {
      if (token) await apiClient.post('/auth/logout');
    } catch {
      // ignore
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('system_hr_employee_token');
      localStorage.removeItem('system_hr_employee_user');
      sessionStorage.removeItem('system_hr_employee_token');
      sessionStorage.removeItem('system_hr_employee_user');
      // Wipe sensitive user query cache on logout to avoid data leaks
      queryClient.clear();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        login,
        logout,
        refreshProfile,
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

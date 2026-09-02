import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './components/ui/Toast';
import { EmployeeLayout } from './components/layout/EmployeeLayout';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { AttendanceCalendarPage } from './pages/AttendanceCalendarPage';
import { ScanPage } from './pages/ScanPage';
import { LeaveRequestPage } from './pages/LeaveRequestPage';
import { OutRequestPage } from './pages/OutRequestPage';
import { ProfilePage } from './pages/ProfilePage';
import { LocationPrivacyPage } from './pages/LocationPrivacyPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<LoginPage />} />

                <Route path="/" element={<EmployeeLayout />}>
                  <Route index element={<HomePage />} />
                  <Route path="home" element={<HomePage />} />
                  <Route path="attendance" element={<AttendanceCalendarPage />} />
                  <Route path="attendance/scan" element={<ScanPage />} />
                  <Route path="leave" element={<LeaveRequestPage />} />
                  <Route path="leave/new" element={<LeaveRequestPage />} />
                  <Route path="out" element={<OutRequestPage />} />
                  <Route path="out/new" element={<OutRequestPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="location-privacy" element={<LocationPrivacyPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;

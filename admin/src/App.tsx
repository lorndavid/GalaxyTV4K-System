import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './components/ui/Toast';
import { AdminLayout } from './components/layout/AdminLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { QrStationPage } from './pages/QrStationPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { AttendancePage } from './pages/AttendancePage';
import { LocationPage } from './pages/LocationPage';
import { SchedulesPage } from './pages/SchedulesPage';
import { HolidaysPage } from './pages/HolidaysPage';
import { LeavePage } from './pages/LeavePage';
import { OutRequestsPage } from './pages/OutRequestsPage';
import { ReportsPage } from './pages/ReportsPage';
import { TelegramPage } from './pages/TelegramPage';
import { DepartmentsPage } from './pages/DepartmentsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5000,
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

                <Route path="/" element={<AdminLayout />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="qr-station" element={<QrStationPage />} />
                  <Route path="employees" element={<EmployeesPage />} />
                  <Route path="attendance" element={<AttendancePage />} />
                  <Route path="location" element={<LocationPage />} />
                  <Route path="schedules" element={<SchedulesPage />} />
                  <Route path="holidays" element={<HolidaysPage />} />
                  <Route path="leave" element={<LeavePage />} />
                  <Route path="out-requests" element={<OutRequestsPage />} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route path="telegram" element={<TelegramPage />} />
                  <Route path="departments" element={<DepartmentsPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="audit-logs" element={<AuditLogsPage />} />
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

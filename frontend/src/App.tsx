import { lazy, Suspense } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { queryClient } from './lib/queryClient';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Spinner } from './components/ui/Spinner';
import { LoginPage } from './pages/LoginPage';
import { TicketsPage } from './pages/TicketsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { UserRole } from './types';

const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const FilesPage = lazy(() => import('./pages/FilesPage').then((m) => ({ default: m.FilesPage })));
const QueuePage = lazy(() => import('./pages/QueuePage').then((m) => ({ default: m.QueuePage })));
const UsersPage = lazy(() => import('./pages/UsersPage').then((m) => ({ default: m.UsersPage })));

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <Suspense fallback={<Spinner />}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />

                <Route element={<ProtectedRoute />}>
                  <Route element={<Layout />}>
                    <Route path="/" element={<TicketsPage />} />

                    <Route element={<ProtectedRoute roles={[UserRole.ADMIN, UserRole.SUPERVISOR]} />}>
                      <Route path="/dashboard" element={<DashboardPage />} />
                      <Route path="/files" element={<FilesPage />} />
                    </Route>

                    <Route element={<ProtectedRoute roles={[UserRole.ADMIN]} />}>
                      <Route path="/queue" element={<QueuePage />} />
                      <Route path="/users" element={<UsersPage />} />
                    </Route>
                  </Route>
                </Route>

                <Route path="/404" element={<NotFoundPage />} />
                <Route path="*" element={<Navigate to="/404" replace />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

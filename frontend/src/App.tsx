import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { AppLayout } from './components/layout/AppLayout';

// Pages
import { RoleSelectPage } from './pages/RoleSelectPage';
import { CustomerFeedbackPage } from './pages/customer/CustomerFeedbackPage';
import { CustomerTrackPage } from './pages/customer/CustomerTrackPage';
import { SupervisorDashboardPage } from './pages/supervisor/SupervisorDashboardPage';
import { FeedbackInboxPage } from './pages/supervisor/FeedbackInboxPage';
import { FeedbackDetailPage } from './pages/supervisor/FeedbackDetailPage';
import { ActionManagementPage } from './pages/supervisor/ActionManagementPage';
import { ReportsPage } from './pages/supervisor/ReportsPage';
import { KitchenDashboardPage } from './pages/kitchen/KitchenDashboardPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminBranchesPage } from './pages/admin/AdminBranchesPage';
import { AdminStaffPage } from './pages/admin/AdminStaffPage';
import { AdminAuditLogsPage } from './pages/admin/AdminAuditLogsPage';
import { NotificationsPage } from './pages/notifications/NotificationsPage';
import { NotFoundPage } from './pages/NotFoundPage';

// Smart Home Redirector based on active persona
const HomeRedirect: React.FC = () => {
  const { currentRole } = useAuth();
  switch (currentRole) {
    case 'CUSTOMER':
      return <Navigate to="/feedback" replace />;
    case 'SUPERVISOR':
      return <Navigate to="/supervisor" replace />;
    case 'KITCHEN_STAFF':
      return <Navigate to="/kitchen" replace />;
    case 'ADMIN':
      return <Navigate to="/admin" replace />;
    default:
      return <Navigate to="/roles" replace />;
  }
};

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<HomeRedirect />} />
              <Route path="roles" element={<RoleSelectPage />} />

              {/* Customer Routes */}
              <Route path="feedback" element={<CustomerFeedbackPage />} />
              <Route path="track" element={<CustomerTrackPage />} />

              {/* Supervisor Routes */}
              <Route path="supervisor" element={<SupervisorDashboardPage />} />
              <Route path="supervisor/inbox" element={<FeedbackInboxPage />} />
              <Route path="supervisor/feedback/:id" element={<FeedbackDetailPage />} />
              <Route path="supervisor/actions" element={<ActionManagementPage />} />
              <Route path="supervisor/reports" element={<ReportsPage />} />

              {/* Kitchen Staff Routes */}
              <Route path="kitchen" element={<KitchenDashboardPage />} />

              {/* Admin Routes */}
              <Route path="admin" element={<AdminDashboardPage />} />
              <Route path="admin/branches" element={<AdminBranchesPage />} />
              <Route path="admin/staff" element={<AdminStaffPage />} />
              <Route path="admin/audit" element={<AdminAuditLogsPage />} />

              {/* Shared Notifications */}
              <Route path="notifications" element={<NotificationsPage />} />

              {/* 404 Catch-All */}
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}

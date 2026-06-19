// Application routes. HashRouter is provided by main.tsx (and MemoryRouter by tests),
// so this renders <Routes> only — never a Router. Role-gated routes redirect when the
// active prototype role lacks access.

import { Navigate, Route, Routes } from 'react-router-dom';
import { RoleProvider, useRole } from '@/hooks/useRole';
import { canReview, isAdmin } from '@/constants/status';
import { AppLayout } from '@/components/AppLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { DocumentsPage } from '@/pages/DocumentsPage';
import { DocumentDetailPage } from '@/pages/DocumentDetailPage';
import { ReviewQueuePage } from '@/pages/ReviewQueuePage';
import { ReviewWorkspacePage } from '@/pages/ReviewWorkspacePage';
import { SkillUpdatesPage } from '@/pages/SkillUpdatesPage';
import { AdminSettingsPage } from '@/pages/AdminSettingsPage';

function RequireReviewer({ children }: { children: JSX.Element }) {
  const { role } = useRole();
  return canReview(role) ? children : <Navigate to="/" replace />;
}

function RequireAdmin({ children }: { children: JSX.Element }) {
  const { role } = useRole();
  return isAdmin(role) ? children : <Navigate to="/" replace />;
}

export function App() {
  return (
    <RoleProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/documents/:id" element={<DocumentDetailPage />} />
          <Route
            path="/review"
            element={
              <RequireReviewer>
                <ReviewQueuePage />
              </RequireReviewer>
            }
          />
          <Route
            path="/review/:id"
            element={
              <RequireReviewer>
                <ReviewWorkspacePage />
              </RequireReviewer>
            }
          />
          <Route
            path="/skill-updates"
            element={
              <RequireReviewer>
                <SkillUpdatesPage />
              </RequireReviewer>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminSettingsPage />
              </RequireAdmin>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </RoleProvider>
  );
}

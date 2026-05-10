import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';

// ✅ Lowercase 'context' — matches your actual file: src/context/AuthContext.jsx
import { AuthProvider, AuthContext } from './context/AuthContext';
import ProtectedRoute from './Components/auth/ProtectedRoute';
import MainLayout     from './Components/layout/MainLayout';

// Public
import LoginPage        from './pages/LoginPage';
import RegisterPage     from './pages/Registerpage';
import LandingPage      from './pages/LandingPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import NotFoundPage     from './pages/NotFoundPage';

// Student
import StudentDashboard from './pages/student/StudentDashboard';
import LogbookPage      from './pages/student/LogbookPage';
import PlacementPage    from './pages/student/PlacementPage';
import EvaluationPage   from './pages/student/EvaluationPage';
import ScoreResultsPage from './pages/student/ScoreResultsPage';

// Supervisor
import SupervisorDashboard from './pages/supervisor/SupervisorDashboard';
import SupervisorReviews   from './pages/supervisor/SupervisorReviews';
import LogbookDetailPage   from './pages/supervisor/LogbookDetailPage';

// Academic
import AcademicDashboard      from './pages/academic/AcademicDashboard';
import AcademicEvaluationPage from './pages/academic/AcademicEvaluationPage';

// Admin
import AdminDashboard          from './pages/admin/AdminDashboard';
import UserManagementPage      from './pages/admin/UserManagementPage';
import PlacementManagementPage from './pages/admin/PlacementManagementPage';
import AdminStatisticsPage     from './pages/admin/AdminStatisticsPage';

import './styles/index.css';

// ─────────────────────────────────────────────
// AppRoutes lives INSIDE <AuthProvider> so
// useContext(AuthContext) is always defined here
// ─────────────────────────────────────────────
function AppRoutes() {
  const { user, loading } = useContext(AuthContext);

  // Wait for localStorage check to finish before rendering routes
  // This prevents a flash-redirect to /login on hard refresh
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'sans-serif',
        color: '#334155',
        fontSize: 14,
      }}>
        Loading…
      </div>
    );
  }

  const homePath = () => {
    if (!user) return '/login';
    const map = {
      student:              '/student/dashboard',
      workplace_supervisor: '/supervisor/dashboard',
      academic_supervisor:  '/academic/dashboard',
      admin:                '/admin/dashboard',
    };
    return map[user.role] || '/login';
  };

  return (
    <Routes>

      {/* ── Public ── */}
      <Route path="/" element={user ? <Navigate to={homePath()} replace /> : <LandingPage />} />
      <Route path="/login"        element={<LoginPage />} />
      <Route path="/register"     element={<RegisterPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* ── Student ── */}
      <Route
        path="/student"
        element={<ProtectedRoute roles={['student']}><MainLayout /></ProtectedRoute>}
      >
        <Route index             element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"  element={<StudentDashboard />} />
        <Route path="logbook"    element={<LogbookPage />} />
        <Route path="placement"  element={<PlacementPage />} />
        <Route path="evaluation" element={<EvaluationPage />} />
        <Route path="scores"     element={<ScoreResultsPage />} />
      </Route>

      {/* ── Workplace Supervisor ── */}
      <Route
        path="/supervisor"
        element={<ProtectedRoute roles={['workplace_supervisor']}><MainLayout /></ProtectedRoute>}
      >
        <Route index                 element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"      element={<SupervisorDashboard />} />
        <Route path="reviews"        element={<SupervisorReviews />} />
        <Route path="reviews/:logId" element={<LogbookDetailPage />} />
      </Route>

      {/* ── Academic Supervisor ── */}
      <Route
        path="/academic"
        element={<ProtectedRoute roles={['academic_supervisor']}><MainLayout /></ProtectedRoute>}
      >
        <Route index              element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"   element={<AcademicDashboard />} />
        <Route path="evaluations" element={<AcademicEvaluationPage />} />
        <Route path="scores"      element={<ScoreResultsPage />} />
      </Route>

      {/* ── Administrator ── */}
      <Route
        path="/admin"
        element={<ProtectedRoute roles={['admin']}><MainLayout /></ProtectedRoute>}
      >
        <Route index             element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"  element={<AdminDashboard />} />
        <Route path="users"      element={<UserManagementPage />} />
        <Route path="placements" element={<PlacementManagementPage />} />
        <Route path="reports"    element={<AdminStatisticsPage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<NotFoundPage />} />

    </Routes>
  );
}

// ─────────────────────────────────────────────
// App only sets up providers — never reads context
// ─────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

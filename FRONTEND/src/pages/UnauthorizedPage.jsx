import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLE_HOME = {
  student:              '/student/dashboard',
  workplace_supervisor: '/supervisor/dashboard',
  academic_supervisor:  '/academic/dashboard',
  admin:                '/admin/dashboard',
};

export default function UnauthorizedPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f6fb' }}>
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🚫</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Access Denied</h1>
        <p style={{ color: '#64748b', marginBottom: 24 }}>You don't have permission to view this page.</p>
        <button
          className="btn btn-primary"
          onClick={() => navigate(ROLE_HOME[user?.role] || '/login')}
        >
          Go to My Dashboard
        </button>
      </div>
    </div>
  );
}

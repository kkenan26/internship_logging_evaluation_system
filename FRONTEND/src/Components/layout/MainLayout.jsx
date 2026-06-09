import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV = {
  student: [
    { to: '/student/dashboard',  label: 'Dashboard' },
    { to: '/student/logbook',    label: 'My Logbook' },
    { to: '/student/placement',  label: 'My Placement' },
    { to: '/student/evaluation', label: 'Evaluation' },
  ],
  workplace_supervisor: [
    { to: '/supervisor/dashboard', label: 'Dashboard' },
    { to: '/supervisor/reviews',   label: 'Log Reviews' },
  ],
  academic_supervisor: [
    { to: '/academic/dashboard',   label: 'Dashboard' },
    { to: '/academic/evaluations', label: 'Evaluations' },
  ],
  administrator: [
    { to: '/admin/dashboard',   label: 'Dashboard' },
    { to: '/admin/users',       label: 'Users' },
    { to: '/admin/placements',  label: 'Placements' },
  ],
};

const ROLE_LABELS = {
  student:              'Student Intern',
  workplace_supervisor: 'Workplace Supervisor',
  academic_supervisor:  'Academic Supervisor',
  administrator:                'Administrator',
};

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navItems = NAV[user?.role] || [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: sidebarOpen ? 240 : 64, background: '#f5f5f5', borderRight: '1px solid #ddd', display: 'flex', flexDirection: 'column', transition: 'width 0.2s', overflow: 'hidden', flexShrink: 0, position: 'sticky', top: 0, height: '100vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 16px', borderBottom: '1px solid #ddd' }}>
          <div style={{ width: 36, height: 36, background: '#333', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 14, color: '#fff', flexShrink: 0 }}>IL</div>
          {sidebarOpen && <span style={{ fontWeight: 'bold', fontSize: 18 }}>ILES</span>}
        </div>
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 4, color: '#333', fontSize: 14, textDecoration: 'none', background: isActive ? '#e0e0e0' : 'transparent', fontWeight: isActive ? 600 : 400
            })}>
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: '12px 8px', borderTop: '1px solid #ddd', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sidebarOpen && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px' }}>
              <div style={{ width: 34, height: 34, background: '#ccc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 14, color: '#333', flexShrink: 0 }}>{user?.first_name?.[0] || user?.username?.[0] || 'U'}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{user?.first_name || user?.username}</div>
                <div style={{ fontSize: 11, color: '#666' }}>{ROLE_LABELS[user?.role]}</div>
              </div>
            </div>
          )}
          <button onClick={handleLogout} style={{ background: '#eee', color: '#333', border: '1px solid #ddd', borderRadius: 4, padding: '9px 12px', fontSize: 13, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}>
            🚪 {sidebarOpen && 'Logout'}
          </button>
        </div>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header style={{ height: 64, background: '#fff', borderBottom: '1px solid #ddd', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16, position: 'sticky', top: 0, zIndex: 10 }}>
          <button onClick={() => setSidebarOpen((s) => !s)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#333' }}>☰</button>
          <h2 style={{ fontSize: 16, fontWeight: 600, flex: 1, margin: 0 }}>Internship Logging and Evaluation System</h2>
          <div><span style={{ fontSize: 13, color: '#666' }}>{ROLE_LABELS[user?.role]}</span></div>
        </header>
        <main style={{ padding: 28, flex: 1 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
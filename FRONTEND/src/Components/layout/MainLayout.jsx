import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV = {
  student: [
    { to: '/student/dashboard',  label: 'Dashboard',    icon: '🏠' },
    { to: '/student/logbook',    label: 'My Logbook',   icon: '📓' },
    { to: '/student/placement',  label: 'My Placement', icon: '🏢' },
    { to: '/student/evaluation', label: 'Evaluation',   icon: '📊' },
  ],
  workplace_supervisor: [
    { to: '/supervisor/dashboard', label: 'Dashboard',   icon: '🏠' },
    { to: '/supervisor/reviews',   label: 'Log Reviews', icon: '✅' },
  ],
  academic_supervisor: [
    { to: '/academic/dashboard',   label: 'Dashboard',   icon: '🏠' },
    { to: '/academic/evaluations', label: 'Evaluations', icon: '📋' },
  ],
  admin: [
    { to: '/admin/dashboard',   label: 'Dashboard',   icon: '🏠' },
    { to: '/admin/users',       label: 'Users',        icon: '👥' },
    { to: '/admin/placements',  label: 'Placements',   icon: '🏢' },
  ],
};

const ROLE_LABELS = {
  student:              'Student Intern',
  workplace_supervisor: 'Workplace Supervisor',
  academic_supervisor:  'Academic Supervisor',
  admin:                'Administrator',
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
    <div style={styles.wrapper}>
      {/* ── Sidebar ── */}
      <aside style={{ ...styles.sidebar, width: sidebarOpen ? 240 : 64 }}>
        {/* Brand */}
        <div style={styles.brand}>
          <div style={styles.brandLogo}>IL</div>
          {sidebarOpen && <span style={styles.brandName}>ILES</span>}
        </div>

        {/* Nav */}
        <nav style={styles.nav}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                ...styles.navItem,
                background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                fontWeight: isActive ? 600 : 400,
              })}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <div style={styles.sidebarFooter}>
          {sidebarOpen && (
            <div style={styles.userInfo}>
              <div style={styles.avatar}>{user?.first_name?.[0] || user?.username?.[0] || 'U'}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{user?.first_name || user?.username}</div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>{ROLE_LABELS[user?.role]}</div>
              </div>
            </div>
          )}
          <button onClick={handleLogout} style={styles.logoutBtn} title="Logout">
            🚪 {sidebarOpen && 'Logout'}
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div style={styles.main}>
        {/* Header */}
        <header style={styles.header}>
          <button
            onClick={() => setSidebarOpen((s) => !s)}
            style={styles.menuBtn}
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
          <h2 style={styles.headerTitle}>Internship Logging &amp; Evaluation System</h2>
          <div style={styles.headerRight}>
            <span style={{ fontSize: 13, color: '#64748b' }}>
              {ROLE_LABELS[user?.role]}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main style={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

const styles = {
  wrapper: { display: 'flex', minHeight: '100vh' },
  sidebar: {
    background: 'linear-gradient(180deg, #1a56db 0%, #0e9f6e 100%)',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    transition: 'width 0.2s',
    overflow: 'hidden',
    flexShrink: 0,
    position: 'sticky',
    top: 0,
    height: '100vh',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '20px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.15)',
  },
  brandLogo: {
    width: 36, height: 36,
    background: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 800, fontSize: 14, flexShrink: 0,
  },
  brandName: { fontWeight: 800, fontSize: 18, letterSpacing: 1 },
  nav: { flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 4 },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 12px', borderRadius: 8,
    color: '#fff', fontSize: 14,
    transition: 'background 0.15s',
    whiteSpace: 'nowrap',
  },
  navIcon: { fontSize: 16, flexShrink: 0, width: 20, textAlign: 'center' },
  sidebarFooter: {
    padding: '12px 8px',
    borderTop: '1px solid rgba(255,255,255,0.15)',
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  userInfo: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 12px',
  },
  avatar: {
    width: 34, height: 34,
    background: 'rgba(255,255,255,0.25)',
    borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: 14, flexShrink: 0,
  },
  logoutBtn: {
    background: 'rgba(255,255,255,0.1)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '9px 12px',
    fontSize: 13,
    cursor: 'pointer',
    textAlign: 'left',
    display: 'flex', alignItems: 'center', gap: 8,
    whiteSpace: 'nowrap',
  },
  main: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 },
  header: {
    height: 64,
    background: '#fff',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex', alignItems: 'center',
    padding: '0 24px', gap: 16,
    position: 'sticky', top: 0, zIndex: 10,
  },
  menuBtn: {
    background: 'none', border: 'none',
    fontSize: 20, cursor: 'pointer', color: '#64748b',
  },
  headerTitle: { fontSize: 16, fontWeight: 600, flex: 1 },
  headerRight: {},
  content: { padding: 28, flex: 1 },
};






import { useState, useEffect } from 'react';
import API from '../../Services/Api';
import { useNavigate } from 'react-router-dom'; 

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalStudents:    0,
    activePlacements: 0,
    logsThisWeek:     0,
    pendingReviews:   0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersRes, placementsRes, logsRes] = await Promise.all([
          API.get('/users/'),
          API.get('/placements/'),
          API.get('/logs/'),
        ]);

        const users      = Array.isArray(usersRes.data)      ? usersRes.data      : usersRes.data.results      ?? [];
        const placements = Array.isArray(placementsRes.data) ? placementsRes.data : placementsRes.data.results ?? [];
        const logs       = Array.isArray(logsRes.data)       ? logsRes.data       : logsRes.data.results       ?? [];

        const now       = new Date();
        const weekAgo   = new Date(now - 7 * 24 * 60 * 60 * 1000);

        setStats({
          totalStudents:    users.filter(u => u.role === 'student').length,
          activePlacements: placements.filter(p => new Date(p.start_date) <= now && new Date(p.end_date) >= now).length,
          logsThisWeek:     logs.filter(l => new Date(l.created_at) >= weekAgo).length,
          pendingReviews:   logs.filter(l => l.status === 'submitted').length,
        });
      } catch (err) {
        console.error('Dashboard fetch failed:', err.response?.status, err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const cards = [
    { label: 'Total Students',    value: stats.totalStudents,    icon: '🎓', color: '#dbeafe' },
    { label: 'Active Placements', value: stats.activePlacements, icon: '🏢', color: '#dcfce7' },
    { label: 'Logs This Week',    value: stats.logsThisWeek,     icon: '📓', color: '#fef9c3' },
    { label: 'Pending Reviews',   value: stats.pendingReviews,   icon: '⏳', color: '#fee2e2' },
  ];

  return (
    <div>
      <h1 className="page-title">Administrator Dashboard</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
        {cards.map((s) => (
          <div key={s.label} className="card" style={{ background: s.color, border: 'none' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>
              {loading ? '…' : s.value}
            </div>
            <div style={{ fontSize: 13, color: '#374151', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Recent Activity</h3>
          <p style={{ color: '#64748b' }}>No recent activity yet.</p>
        </div>
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="btn btn-primary"  onClick={() => navigate('/admin/placements')}>+ Assign Placement</button>
            <button className="btn btn-outline"  onClick={() => navigate('/admin/users')}>👥 Manage Users</button>
            <button className="btn btn-outline"  onClick={() => navigate('/admin/reports')}>📈 View Reports</button>
          </div>
        </div>
      </div>
    </div>
  );
}
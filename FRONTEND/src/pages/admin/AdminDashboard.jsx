import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../Services/Api';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalStudents: 0,
    activePlacements: 0,
    totalLogs: 0,
    pendingReviews: 0,
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

        const users = Array.isArray(usersRes.data) ? usersRes.data : usersRes.data.results || [];
        const placements = Array.isArray(placementsRes.data) ? placementsRes.data : placementsRes.data.results || [];
        const logs = Array.isArray(logsRes.data) ? logsRes.data : logsRes.data.results || [];

        const now = new Date();

        setStats({
          totalStudents: users.filter(u => u.role === 'student').length,
          activePlacements: placements.filter(p => {
            const start = new Date(p.start_date);
            const end = new Date(p.end_date);
            return start <= now && end >= now;
          }).length,
          totalLogs: logs.length,
          pendingReviews: logs.filter(l => l.status === 'submitted').length,
        });
      } catch (err) {
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <p style={{ padding: '32px', textAlign: 'center', color: '#666' }}>Loading dashboard...</p>;
  }

  return (
    <div>
      <h1>Admin Dashboard</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#e3f2fd', padding: '20px', borderRadius: '8px' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{stats.totalStudents}</div>
          <div style={{ color: '#666' }}>Total Students</div>
        </div>
        <div style={{ background: '#e8f5e9', padding: '20px', borderRadius: '8px' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{stats.activePlacements}</div>
          <div style={{ color: '#666' }}>Active Placements</div>
        </div>
        <div style={{ background: '#fff3e0', padding: '20px', borderRadius: '8px' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{stats.totalLogs}</div>
          <div style={{ color: '#666' }}>Total Logs</div>
        </div>
        <div style={{ background: '#ffebee', padding: '20px', borderRadius: '8px' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{stats.pendingReviews}</div>
          <div style={{ color: '#666' }}>Pending Reviews</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '20px' }}>
          <h3>Recent Activity</h3>
          <p style={{ color: '#666', marginTop: '16px' }}>No recent activity to display.</p>
        </div>
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '20px' }}>
          <h3>Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
            <button
              onClick={() => navigate('/admin/placements')}
              style={{ background: '#1976d2', color: '#fff', border: 'none', padding: '10px', borderRadius: '4px', cursor: 'pointer' }}
            >
              Manage Placements
            </button>
            <button
              onClick={() => navigate('/admin/users')}
              style={{ background: '#fff', color: '#333', border: '1px solid #ddd', padding: '10px', borderRadius: '4px', cursor: 'pointer' }}
            >
              Manage Users
            </button>
            <button
              onClick={() => navigate('/admin/reports')}
              style={{ background: '#fff', color: '#333', border: '1px solid #ddd', padding: '10px', borderRadius: '4px', cursor: 'pointer' }}
            >
              View Reports
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
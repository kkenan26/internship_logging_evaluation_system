import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../Services/Api';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalStudents: 0, activePlacements: 0, totalLogs: 0, pendingReviews: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersRes, placementsRes, logsRes] = await Promise.all([
          API.get('/admin/users/'),
          API.get('/placements/'),
          API.get('/logs/'),
        ]);
        const users = Array.isArray(usersRes.data) ? usersRes.data : usersRes.data.results || [];
        const placements = Array.isArray(placementsRes.data) ? placementsRes.data : placementsRes.data.results || [];
        const logs = Array.isArray(logsRes.data) ? logsRes.data : logsRes.data.results || [];
        const now = new Date();
        setStats({
          totalStudents: users.filter(u => u.role === 'student').length,
          activePlacements: placements.filter(p => new Date(p.start_date) <= now && new Date(p.end_date) >= now).length,
          totalLogs: logs.length,
          pendingReviews: logs.filter(l => l.status === 'submitted').length,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h1>Admin Dashboard</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#fff', border: '1px solid #ddd', padding: '20px', borderRadius: '4px' }}><div style={{ fontSize: '28px', fontWeight: 'bold' }}>{stats.totalStudents}</div><div>Total Students</div></div>
        <div style={{ background: '#fff', border: '1px solid #ddd', padding: '20px', borderRadius: '4px' }}><div style={{ fontSize: '28px', fontWeight: 'bold' }}>{stats.activePlacements}</div><div>Active Placements</div></div>
        <div style={{ background: '#fff', border: '1px solid #ddd', padding: '20px', borderRadius: '4px' }}><div style={{ fontSize: '28px', fontWeight: 'bold' }}>{stats.totalLogs}</div><div>Total Logs</div></div>
        <div style={{ background: '#fff', border: '1px solid #ddd', padding: '20px', borderRadius: '4px' }}><div style={{ fontSize: '28px', fontWeight: 'bold' }}>{stats.pendingReviews}</div><div>Pending Reviews</div></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '4px', padding: '20px' }}><h3>Recent Activity</h3><p>No recent activity.</p></div>
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '4px', padding: '20px' }}>
          <h3>Quick Actions</h3>
          <button onClick={() => navigate('/admin/placements')} style={{ background: '#eee', border: '1px solid #ddd', padding: '10px', width: '100%', borderRadius: '4px', cursor: 'pointer', marginBottom: '10px' }}>Manage Placements</button>
          <button onClick={() => navigate('/admin/users')} style={{ background: '#eee', border: '1px solid #ddd', padding: '10px', width: '100%', borderRadius: '4px', cursor: 'pointer' }}>Manage Users</button>
        </div>
      </div>
    </div>
  );
}
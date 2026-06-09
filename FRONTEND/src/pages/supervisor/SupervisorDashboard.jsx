import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import API from '../../Services/Api';

export default function SupervisorDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await API.get('/logs/dashboard/');
        const workload = res.data.workload || {};
        setData({
          totalStudents: workload.total_students || 0,
          pendingReviews: workload.pending_reviews || 0,
          reviewed: workload.reviewed || 0,
          approved: workload.approved || 0,
          completionRate: workload.review_completion_rate || 0,
          studentPerformance: res.data.student_performance || [],
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <p style={{ padding: '32px', color: '#666' }}>loading...</p>;
  if (!data) return <p style={{ padding: '32px', color: '#666' }}>could not load.</p>;

  const color = data.completionRate >= 70 ? '#2e7d32' : data.completionRate >= 40 ? '#ed6c02' : '#c62828';

  return (
    <div>
      <h1>Supervisor Dashboard</h1>
      <p>welcome, {user?.first_name || user?.username}</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#e3f2fd', padding: '20px', borderRadius: '4px' }}><div style={{ fontSize: '28px', fontWeight: 'bold' }}>{data.totalStudents}</div><div>Assigned Students</div></div>
        <div style={{ background: '#fff0d0', padding: '20px', borderRadius: '4px' }}><div style={{ fontSize: '28px', fontWeight: 'bold' }}>{data.pendingReviews}</div><div>Pending Reviews</div></div>
        <div style={{ background: '#d0f0d0', padding: '20px', borderRadius: '4px' }}><div style={{ fontSize: '28px', fontWeight: 'bold' }}>{data.reviewed}</div><div>Reviewed</div></div>
        <div style={{ background: '#f0e0ff', padding: '20px', borderRadius: '4px' }}><div style={{ fontSize: '28px', fontWeight: 'bold' }}>{data.approved}</div><div>Approved</div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '4px', padding: '20px' }}>
          <h3>Review Progress</h3>
          <div style={{ marginTop: '16px' }}><div>Completion Rate: {data.completionRate}%</div>
          <div style={{ width: '100%', background: '#ccc', borderRadius: '4px', overflow: 'hidden' }}><div style={{ width: `${data.completionRate}%`, height: '8px', background: color }}></div></div></div>
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
            <span>Pending: {data.pendingReviews}</span>
            <span>Reviewed: {data.reviewed}</span>
            <span>Approved: {data.approved}</span>
          </div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '4px', padding: '20px' }}>
          <h3>Quick Actions</h3>
          <a href="/supervisor/reviews" style={{ display: 'block', background: '#333', color: '#fff', textDecoration: 'none', padding: '10px', borderRadius: '4px', textAlign: 'center', marginTop: '16px' }}>View Pending Reviews</a>
        </div>
      </div>

      {data.studentPerformance.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '4px', padding: '20px', marginTop: '20px' }}>
          <h3>Student Performance</h3>
          <table style={{ width: '100%', marginTop: '16px' }}>
            <thead><tr style={{ borderBottom: '1px solid #ddd' }}>
              <th style={{ padding: '8px', textAlign: 'left' }}>Student</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>Total Logs</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>Approved</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>Approval Rate</th>
            </tr></thead>
            <tbody>
              {data.studentPerformance.map((s, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px' }}>{s.student}</td>
                  <td style={{ padding: '8px' }}>{s.total_logs}</td>
                  <td style={{ padding: '8px' }}>{s.approved_logs}</td>
                  <td style={{ padding: '8px' }}>{s.approval_rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
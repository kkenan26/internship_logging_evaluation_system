import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import API from '../../Services/Api';

export default function SupervisorDashboard() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await API.get('/logs/dashboard/');
        const data = res.data;
        const workload = data.workload || {};
        const studentPerformance = data.student_performance || [];

        setDashboardData({
          totalStudents: workload.total_students || 0,
          pendingReviews: workload.pending_reviews || 0,
          reviewedCount: workload.reviewed || 0,
          approvedCount: workload.approved || 0,
          completionRate: workload.review_completion_rate || 0,
          studentPerformance: studentPerformance,
        });
      } catch (err) {
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <p style={{ padding: '32px', textAlign: 'center', color: '#666' }}>Loading dashboard...</p>;
  }

  if (!dashboardData) {
    return <p style={{ padding: '32px', textAlign: 'center', color: '#666' }}>Could not load dashboard.</p>;
  }

  const completionColor = dashboardData.completionRate >= 70 ? '#2e7d32' : dashboardData.completionRate >= 40 ? '#ed6c02' : '#c62828';

  return (
    <div>
      <h1>Supervisor Dashboard</h1>
      <p>Welcome, {user?.first_name || user?.username}</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#e3f2fd', padding: '20px', borderRadius: '8px' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{dashboardData.totalStudents}</div>
          <div style={{ color: '#666' }}>Assigned Students</div>
        </div>
        <div style={{ background: '#fff3e0', padding: '20px', borderRadius: '8px' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{dashboardData.pendingReviews}</div>
          <div style={{ color: '#666' }}>Pending Reviews</div>
        </div>
        <div style={{ background: '#e8f5e9', padding: '20px', borderRadius: '8px' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{dashboardData.reviewedCount}</div>
          <div style={{ color: '#666' }}>Reviewed</div>
        </div>
        <div style={{ background: '#f3e5f5', padding: '20px', borderRadius: '8px' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{dashboardData.approvedCount}</div>
          <div style={{ color: '#666' }}>Approved</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '20px' }}>
          <h3>Review Progress</h3>
          <div style={{ marginTop: '16px' }}>
            <div style={{ marginBottom: '8px' }}>Completion Rate: {dashboardData.completionRate}%</div>
            <div style={{ width: '100%', background: '#eee', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${dashboardData.completionRate}%`, height: '8px', background: completionColor }}></div>
            </div>
          </div>
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>Pending: {dashboardData.pendingReviews}</span>
              <span>Reviewed: {dashboardData.reviewedCount}</span>
              <span>Approved: {dashboardData.approvedCount}</span>
            </div>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '20px' }}>
          <h3>Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
            <a href="/supervisor/reviews" style={{ background: '#1976d2', color: '#fff', textDecoration: 'none', padding: '10px', borderRadius: '4px', textAlign: 'center' }}>
              View Pending Reviews
            </a>
          </div>
        </div>
      </div>

      {dashboardData.studentPerformance.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '20px', marginTop: '20px' }}>
          <h3>Student Performance</h3>
          <table style={{ width: '100%', marginTop: '16px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #ddd' }}>
                <th style={{ padding: '8px', textAlign: 'left' }}>Student</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Total Logs</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Approved</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Approval Rate</th>
              </tr>
            </thead>
            <tbody>
              {dashboardData.studentPerformance.map((student, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px' }}>{student.student}</td>
                  <td style={{ padding: '8px' }}>{student.total_logs}</td>
                  <td style={{ padding: '8px' }}>{student.approved_logs}</td>
                  <td style={{ padding: '8px' }}>{student.approval_rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
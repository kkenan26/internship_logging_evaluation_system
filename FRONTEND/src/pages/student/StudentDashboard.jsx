import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import API from '../../Services/Api';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [logbookRes, placementRes, evaluationRes] = await Promise.all([
          API.get('/logs/dashboard/'),
          API.get('/student/placement/'),
          API.get(`/evaluations/score/${user.id}/`),
        ]);

        const logbookData = logbookRes.data || {};
        const summary = logbookData.summary || {};
        const placementData = placementRes.data;
        const evaluationData = evaluationRes.data;

        let progress = 0;
        if (placementData && placementData.start_date && placementData.end_date) {
          const start = new Date(placementData.start_date);
          const end = new Date(placementData.end_date);
          const today = new Date();
          const total = (end - start) / (1000 * 60 * 60 * 24);
          const elapsed = (today - start) / (1000 * 60 * 60 * 24);
          progress = Math.min(Math.max((elapsed / total) * 100, 0), 100);
        }

        setDashboardData({
          totalLogs: summary.total_logs || 0,
          draft: summary.draft || 0,
          submitted: summary.submitted || 0,
          reviewed: summary.reviewed || 0,
          approved: summary.approved || 0,
          submissionRate: summary.submission_rate || 0,
          totalScore: evaluationData?.total_weighted_score || 'Not available',
          grade: evaluationData?.grade || 'Not graded',
          placement: placementData,
          progress: progress,
          breakdown: evaluationData?.breakdown || [],
        });
      } catch (err) {
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) fetchData();
  }, [user?.id]);

  if (loading) return <p style={{ padding: '32px', textAlign: 'center', color: '#555' }}>loading dashboard...</p>;
  if (!dashboardData) return <p style={{ padding: '32px', textAlign: 'center', color: '#555' }}>could not load dashboard.</p>;

  const placement = dashboardData.placement;

  return (
    <div>
      <h1>welcome, {user?.first_name || user?.username}</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#f0f0f0', padding: '20px', borderRadius: '4px' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{dashboardData.totalLogs}</div>
          <div style={{ color: '#666' }}>Total Logs</div>
        </div>
        <div style={{ background: '#e0e0e0', padding: '20px', borderRadius: '4px' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{dashboardData.approved}</div>
          <div style={{ color: '#666' }}>Approved</div>
        </div>
        <div style={{ background: '#fff0d0', padding: '20px', borderRadius: '4px' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{dashboardData.submitted}</div>
          <div style={{ color: '#666' }}>Pending Review</div>
        </div>
        <div style={{ background: '#f0e0ff', padding: '20px', borderRadius: '4px' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{dashboardData.totalScore}</div>
          <div style={{ color: '#666' }}>Score: {dashboardData.grade}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '4px', padding: '20px' }}>
          <h3>Log Summary</h3>
          <table style={{ width: '100%', marginTop: '16px' }}>
            <tbody>
              <tr><td style={{ padding: '8px 0' }}>Draft</td><td style={{ padding: '8px 0', textAlign: 'right' }}>{dashboardData.draft}</td></tr>
              <tr><td style={{ padding: '8px 0' }}>Submitted</td><td style={{ padding: '8px 0', textAlign: 'right' }}>{dashboardData.submitted}</td></tr>
              <tr><td style={{ padding: '8px 0' }}>Reviewed</td><td style={{ padding: '8px 0', textAlign: 'right' }}>{dashboardData.reviewed}</td></tr>
              <tr><td style={{ padding: '8px 0' }}>Approved</td><td style={{ padding: '8px 0', textAlign: 'right' }}>{dashboardData.approved}</td></tr>
              <tr><td style={{ padding: '8px 0' }}>Submission Rate</td><td style={{ padding: '8px 0', textAlign: 'right' }}>{dashboardData.submissionRate}%</td></tr>
            </tbody>
          </table>
        </div>

        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '4px', padding: '20px' }}>
          <h3>Internship Progress</h3>
          {placement ? (
            <>
              <div style={{ marginBottom: '8px' }}>Company: {placement.company_name || placement.company || '—'}</div>
              <div style={{ marginBottom: '8px' }}>Period: {placement.start_date} to {placement.end_date}</div>
              <div style={{ padding: '8px', borderRadius: '4px', marginBottom: '16px', background: '#f5f5f5' }}>
                Status: {placement.status}
              </div>
              <div style={{ marginBottom: '8px' }}>Progress: {Math.round(dashboardData.progress)}%</div>
              <div style={{ width: '100%', background: '#ccc', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${dashboardData.progress}%`, height: '8px', background: '#333' }}></div>
              </div>
            </>
          ) : (
            <p style={{ color: '#666' }}>No active placement found.</p>
          )}
        </div>
      </div>

      {dashboardData.breakdown && dashboardData.breakdown.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '4px', padding: '20px', marginTop: '20px' }}>
          <h3>Evaluation Breakdown</h3>
          <table style={{ width: '100%', marginTop: '16px' }}>
            <thead><tr style={{ borderBottom: '1px solid #ddd' }}>
              <th style={{ padding: '8px', textAlign: 'left' }}>Criteria</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>Score</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>Weight</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>Weighted</th>
            </tr></thead>
            <tbody>
              {dashboardData.breakdown.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px' }}>{item.criteria}</td>
                  <td style={{ padding: '8px' }}>{item.score}</td>
                  <td style={{ padding: '8px' }}>{item.weight}</td>
                  <td style={{ padding: '8px' }}>{item.weighted_score?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <a href="/student/logbook" style={{ color: '#1976d2', textDecoration: 'none' }}>View My Logbook →</a>
      </div>
    </div>
  );
}
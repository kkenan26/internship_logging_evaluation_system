import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import API from '../../Services/Api';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // allSettled means one failure won't crash the whole dashboard
        const [logbookRes, placementRes, evaluationRes] = await Promise.allSettled([
          API.get('/logs/dashboard/'),
          API.get('/student/placement/'),
          API.get(`/evaluations/score/${user.id}/`),
        ]);

        const logbookData   = logbookRes.status   === 'fulfilled' ? logbookRes.value.data   : null;
        const placementData = placementRes.status === 'fulfilled' ? placementRes.value.data : null;
        const evaluationData= evaluationRes.status=== 'fulfilled' ? evaluationRes.value.data: null;

        const summary = logbookData?.summary || {};

        const logStatusData = [
          { name: 'Draft',      value: summary.draft      || 0, color: '#64748b' },
          { name: 'Submitted',  value: summary.submitted   || 0, color: '#f59e0b' },
          { name: 'Reviewed',   value: summary.reviewed    || 0, color: '#3b82f6' },
          { name: 'Approved',   value: summary.approved    || 0, color: '#22c55e' },
        ];

        const weeklyCompletionData = (logbookData?.weekly_completion || []).map(week => ({
          week: `Week ${week.week}`,
          onTime: week.submitted_on_time ? 1 : 0,
        }));

        let progressPercentage = 0;
        if (placementData?.start_date && placementData?.end_date) {
          const start   = new Date(placementData.start_date);
          const end     = new Date(placementData.end_date);
          const today   = new Date();
          const total   = Math.ceil((end - start) / 86400000);
          const elapsed = Math.ceil((today - start) / 86400000);
          progressPercentage = Math.min(Math.max((elapsed / total) * 100, 0), 100);
        }

        setDashboardData({
          stats: {
            totalLogs:      summary.total_logs      || 0,
            approvedLogs:   summary.approved        || 0,
            pendingReviews: summary.submitted       || 0,
            submissionRate: summary.submission_rate || 0,
            overallScore:   evaluationData?.total_weighted_score ?? '—',
            grade:          evaluationData?.grade   ?? 'Not graded',
          },
          placement:   placementData,
          evaluation:  evaluationData,
          charts: { logStatusData, weeklyCompletionData, progressPercentage },
        });
      } catch (error) {
        console.error('Student dashboard error:', error);
        setDashboardData(null);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) fetchDashboardData();
  }, [user?.id]);

  if (loading) return <div style={styles.center}><p>Loading your dashboard...</p></div>;
  if (!dashboardData) return <div style={styles.center}><p>Failed to load dashboard data. Please try again.</p></div>;

  const { stats, placement, evaluation, charts } = dashboardData;

  return (
    <div>
      <h1 style={styles.heading}>Welcome back, {user?.first_name || user?.username} 👋</h1>

      <div style={styles.statsGrid}>
        {[
          { icon: '📓', value: stats.totalLogs,      label: 'Total Logs',      sub: `${stats.submissionRate}% submitted`,  bg: '#dbeafe', subColor: '#3730a3' },
          { icon: '✅', value: stats.approvedLogs,   label: 'Logs Approved',   sub: `${stats.totalLogs > 0 ? Math.round(stats.approvedLogs/stats.totalLogs*100) : 0}% approval rate`, bg: '#dcfce7', subColor: '#166534' },
          { icon: '⏳', value: stats.pendingReviews, label: 'Pending Reviews', sub: 'Awaiting feedback',                   bg: '#fef9c3', subColor: '#92400e' },
          { icon: '🏆', value: stats.overallScore,   label: 'Overall Score',   sub: stats.grade,                          bg: '#f3e8ff', subColor: '#7c3aed' },
        ].map((card, i) => (
          <div key={i} style={{ ...styles.statCard, background: card.bg }}>
            <div style={styles.statIcon}>{card.icon}</div>
            <div style={styles.statValue}>{card.value}</div>
            <div style={styles.statLabel}>{card.label}</div>
            <div style={{ fontSize: 11, color: card.subColor, marginTop: 4 }}>{card.sub}</div>
          </div>
        ))}
      </div>

      <div style={styles.chartsRow}>
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Internship Progress</h3>
          {placement ? (
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 14, color: '#64748b' }}>Progress</span>
                <span style={{ fontSize: 14, fontWeight: 'bold' }}>{charts.progressPercentage.toFixed(1)}%</span>
              </div>
              <div style={{ width: '100%', height: 12, background: '#e2e8f0', borderRadius: 6, overflow: 'hidden', marginBottom: 20 }}>
                <div style={{
                  width: `${charts.progressPercentage}%`, height: '100%', borderRadius: 6,
                  background: charts.progressPercentage > 75 ? '#22c55e' : charts.progressPercentage > 50 ? '#3b82f6' : '#f59e0b',
                }} />
              </div>
              <div style={{ fontSize: 14, color: '#64748b', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div><strong>Company:</strong> {placement.company || placement.company_name || '—'}</div>
                <div><strong>Period:</strong> {placement.start_date} to {placement.end_date}</div>
                <div><strong>Status:</strong> {placement.status}</div>
              </div>
            </div>
          ) : (
            <div style={styles.empty}>No active internship placement found.</div>
          )}
        </div>

        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Logbook Status</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={charts.logStatusData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}>
                {charts.logStatusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={styles.chartsRow}>
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Weekly Log Completion</h3>
          {charts.weeklyCompletionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={charts.weeklyCompletionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="week" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }} />
                <Bar dataKey="onTime" fill="#22c55e" radius={[4,4,0,0]} name="On Time" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={styles.empty}>No weekly log data yet.</div>
          )}
        </div>

        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Evaluation Breakdown</h3>
          {evaluation?.breakdown?.length > 0 ? (
            <div style={{ padding: 20 }}>
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {evaluation.breakdown.map((item, i) => (
                  <div key={i} style={{ marginBottom: 12, padding: 8, background: '#f8fafc', borderRadius: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{item.criteria}</span>
                      <span style={{ fontSize: 14, fontWeight: 'bold', color: '#3b82f6' }}>{item.score}/100</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                      Weight: {item.weight}% | Weighted: {item.weighted_score?.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, padding: 12, background: '#e0f2fe', borderRadius: 6 }}>
                <div style={{ fontSize: 16, fontWeight: 'bold' }}>
                  Total: {evaluation.total_weighted_score?.toFixed(2)} ({evaluation.grade})
                </div>
              </div>
            </div>
          ) : (
            <div style={styles.empty}>No evaluations available yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  center:    { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' },
  heading:   { fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 700, color: '#1e293b', marginBottom: 24 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 },
  statCard:  { border: 'none', borderRadius: 12, padding: 24 },
  statIcon:  { fontSize: 28, marginBottom: 8 },
  statValue: { fontSize: 32, fontWeight: 700, lineHeight: 1, color: '#1e293b' },
  statLabel: { fontSize: 13, color: '#64748b', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.5px' },
  chartsRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 },
  chartCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  chartTitle:{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 600, color: '#1e293b', marginBottom: 20 },
  empty:     { padding: 40, textAlign: 'center', color: '#64748b' },
};
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import API from '../../Services/Api';

export default function SupervisorDashboard() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Only one call needed — /logs/dashboard/ returns everything
        const logbookRes = await API.get('/logs/dashboard/');
        const logbookData = logbookRes.data;

        const studentPerformanceData = (logbookData.student_performance || []).map(student => ({
          name: student.student.length > 10 ? student.student.substring(0, 10) + '...' : student.student,
          totalLogs: student.total_logs,
          approvedLogs: student.approved_logs,
          approvalRate: student.approval_rate,
        }));

        const logStatusData = [
          { name: 'Submitted', value: logbookData.workload?.pending_reviews || 0, color: '#f59e0b' },
          { name: 'Reviewed',  value: logbookData.workload?.reviewed || 0,         color: '#3b82f6' },
          { name: 'Approved',  value: logbookData.workload?.approved || 0,         color: '#22c55e' },
        ];

        setDashboardData({
          stats: {
            assignedInterns:      logbookData.workload?.total_students || 0,
            pendingReviews:       logbookData.workload?.pending_reviews || 0,
            reviewedThisWeek:     logbookData.workload?.reviewed || 0,
            reviewCompletionRate: logbookData.workload?.review_completion_rate || 0,
          },
          charts: { studentPerformanceData, logStatusData },
        });
      } catch (error) {
        console.error('Supervisor dashboard error:', error);
        setDashboardData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) return <div style={styles.center}><p>Loading your dashboard...</p></div>;
  if (!dashboardData) return <div style={styles.center}><p>Failed to load dashboard data. Please try again.</p></div>;

  const { stats, charts } = dashboardData;

  return (
    <div>
      <h1 style={styles.heading}>Supervisor Dashboard</h1>

      <div style={styles.statsGrid}>
        {[
          { icon: '🎓', value: stats.assignedInterns,      label: 'Assigned Interns',    sub: 'Active students',          bg: '#dbeafe', subColor: '#3730a3' },
          { icon: '⏳', value: stats.pendingReviews,       label: 'Pending Reviews',     sub: 'Require attention',        bg: '#fef9c3', subColor: '#92400e' },
          { icon: '✅', value: stats.reviewedThisWeek,     label: 'Reviewed',            sub: `${stats.reviewCompletionRate}% completion`, bg: '#dcfce7', subColor: '#166534' },
          { icon: '📊', value: `${stats.reviewCompletionRate}%`, label: 'Review Efficiency', sub: 'Overall performance', bg: '#f3e8ff', subColor: '#7c3aed' },
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
          <h3 style={styles.chartTitle}>Log Review Status</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={charts.logStatusData} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}>
                {charts.logStatusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Student Performance</h3>
          {charts.studentPerformanceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={charts.studentPerformanceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }} />
                <Legend wrapperStyle={{ color: '#64748b', fontSize: 12 }} />
                <Bar dataKey="totalLogs"    fill="#3b82f6" radius={[4,4,0,0]} name="Total Logs" />
                <Bar dataKey="approvedLogs" fill="#22c55e" radius={[4,4,0,0]} name="Approved" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={styles.empty}>No student data available yet.</div>
          )}
        </div>
      </div>

      <div style={styles.chartsRow}>
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Student Approval Rates</h3>
          {charts.studentPerformanceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={charts.studentPerformanceData} layout="horizontal" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}
                  formatter={(v) => [`${v}%`, 'Approval Rate']} />
                <Bar dataKey="approvalRate" fill="#f59e0b" radius={[0,4,4,0]} name="Approval Rate %" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={styles.empty}>No approval rate data available yet.</div>
          )}
        </div>

        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Workload Summary</h3>
          <div style={{ padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 'bold', color: '#3b82f6', marginBottom: 8 }}>{stats.assignedInterns}</div>
                <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase' }}>Total Students</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 'bold', color: '#f59e0b', marginBottom: 8 }}>{stats.pendingReviews}</div>
                <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase' }}>Pending Reviews</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 14, color: '#64748b' }}>Review Completion</span>
              <span style={{ fontSize: 14, fontWeight: 'bold' }}>{stats.reviewCompletionRate}%</span>
            </div>
            <div style={{ width: '100%', height: 12, background: '#e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{
                width: `${stats.reviewCompletionRate}%`, height: '100%', borderRadius: 6,
                background: stats.reviewCompletionRate > 75 ? '#22c55e' : stats.reviewCompletionRate > 50 ? '#3b82f6' : '#f59e0b',
              }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  center:    { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' },
  heading:   { fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 700, color: '#1e293b', marginBottom: 24 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 24 },
  statCard:  { border: 'none', borderRadius: 12, padding: 24 },
  statIcon:  { fontSize: 28, marginBottom: 8 },
  statValue: { fontSize: 32, fontWeight: 700, lineHeight: 1, color: '#1e293b' },
  statLabel: { fontSize: 13, color: '#64748b', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.5px' },
  chartsRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 },
  chartCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  chartTitle:{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 600, color: '#1e293b', marginBottom: 20 },
  empty:     { padding: 40, textAlign: 'center', color: '#64748b' },
};

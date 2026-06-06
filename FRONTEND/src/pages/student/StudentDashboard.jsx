import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import API from '../../Services/Api';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];

export default function StudentDashboard() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [placementRes, logbookRes, evaluationRes] = await Promise.all([
          API.get('/placements/dashboard/'),
          API.get('/logbook/dashboard/'),
          API.get(`/evaluations/score/${user.id}/`)
        ]);

        const placementData = placementRes.data;
        const logbookData = logbookRes.data;
        const evaluationData = evaluationRes.data;

        // Process log status data for pie chart
        const logStatusData = [
          { name: 'Draft', value: logbookData.summary.draft, color: '#64748b' },
          { name: 'Submitted', value: logbookData.summary.submitted, color: '#f59e0b' },
          { name: 'Reviewed', value: logbookData.summary.reviewed, color: '#3b82f6' },
          { name: 'Approved', value: logbookData.summary.approved, color: '#22c55e' },
        ];

        // Process weekly completion data for bar chart
        const weeklyCompletionData = logbookData.weekly_completion.map(week => ({
          week: `Week ${week.week}`,
          status: week.status,
          onTime: week.submitted_on_time ? 1 : 0,
          color: week.status === 'approved' ? '#22c55e' :
                 week.status === 'submitted' ? '#f59e0b' :
                 week.status === 'reviewed' ? '#3b82f6' : '#64748b'
        }));

        // Calculate progress percentage for current placement
        let progressPercentage = 0;
        let currentPlacement = null;

        if (placementData.current_placement) {
          currentPlacement = placementData.current_placement;
          const startDate = new Date(currentPlacement.start_date);
          const endDate = new Date(currentPlacement.end_date);
          const today = new Date();
          const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
          const daysElapsed = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24));
          progressPercentage = Math.min(Math.max((daysElapsed / totalDays) * 100, 0), 100);
        }

        setDashboardData({
          stats: {
            totalLogs: logbookData.summary.total_logs,
            approvedLogs: logbookData.summary.approved,
            pendingReviews: logbookData.summary.submitted,
            overallScore: evaluationData.total_weighted_score || '—',
            submissionRate: logbookData.summary.submission_rate,
          },
          placement: placementData,
          logbook: logbookData,
          evaluation: evaluationData,
          charts: {
            logStatusData,
            weeklyCompletionData,
            progressPercentage,
          }
        });
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        setDashboardData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user.id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <p>Failed to load dashboard data. Please try again.</p>
      </div>
    );
  }

  const { stats, placement, evaluation, charts } = dashboardData;

  return (
    <div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@600;700&display=swap');
        * { box-sizing: border-box; }
      `}</style>

      <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 700, color: '#1e293b', marginBottom: 24 }}>
        Welcome back, {user?.first_name || user?.username} 👋
      </h1>

      {/* Enhanced Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={{ ...styles.statCard, background: '#dbeafe' }}>
          <div style={styles.statIcon}>📓</div>
          <div style={styles.statValue}>{stats.totalLogs}</div>
          <div style={styles.statLabel}>Total Logs</div>
          <div style={{ fontSize: 11, color: '#3730a3', marginTop: 4 }}>
            {stats.submissionRate}% submitted
          </div>
        </div>
        <div style={{ ...styles.statCard, background: '#dcfce7' }}>
          <div style={styles.statIcon}>✅</div>
          <div style={styles.statValue}>{stats.approvedLogs}</div>
          <div style={styles.statLabel}>Logs Approved</div>
          <div style={{ fontSize: 11, color: '#166534', marginTop: 4 }}>
            {stats.totalLogs > 0 ? Math.round((stats.approvedLogs / stats.totalLogs) * 100) : 0}% approval rate
          </div>
        </div>
        <div style={{ ...styles.statCard, background: '#fef9c3' }}>
          <div style={styles.statIcon}>⏳</div>
          <div style={styles.statValue}>{stats.pendingReviews}</div>
          <div style={styles.statLabel}>Pending Reviews</div>
          <div style={{ fontSize: 11, color: '#92400e', marginTop: 4 }}>
            Awaiting feedback
          </div>
        </div>
        <div style={{ ...styles.statCard, background: '#f3e8ff' }}>
          <div style={styles.statIcon}>🏆</div>
          <div style={styles.statValue}>{stats.overallScore}</div>
          <div style={styles.statLabel}>Overall Score</div>
          <div style={{ fontSize: 11, color: '#7c3aed', marginTop: 4 }}>
            {evaluation.grade || 'Not graded'}
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div style={styles.chartsRow}>
        {/* Internship Progress */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Internship Progress</h3>
          {placement.current_placement ? (
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#64748b' }}>Progress</span>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b' }}>
                    {charts.progressPercentage.toFixed(1)}%
                  </span>
                </div>
                <div style={{ width: '100%', height: '12px', background: '#e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${charts.progressPercentage}%`,
                      height: '100%',
                      background: charts.progressPercentage > 75 ? '#22c55e' : charts.progressPercentage > 50 ? '#3b82f6' : '#f59e0b',
                      borderRadius: '6px',
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>
              </div>
              <div style={{ fontSize: '14px', color: '#64748b' }}>
                <div><strong>Company:</strong> {placement.current_placement.company}</div>
                <div><strong>Period:</strong> {placement.current_placement.start_date} to {placement.current_placement.end_date}</div>
                <div><strong>Status:</strong> {placement.current_placement.status}</div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              No active internship placement found.
            </div>
          )}
        </div>

        {/* Log Status Distribution */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Logbook Status</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={charts.logStatusData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}
                labelLine={{ stroke: "#475569" }}
              >
                {charts.logStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  color: "#1e293b"
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div style={styles.chartsRow}>
        {/* Weekly Completion Status */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Weekly Log Completion</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={charts.weeklyCompletionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="week"
                tick={{ fill: "#64748b", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#64748b", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  color: "#1e293b"
                }}
              />
              <Bar dataKey="onTime" fill="#22c55e" radius={[4, 4, 0, 0]} name="On Time" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Evaluation Breakdown */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Evaluation Breakdown</h3>
          {evaluation.breakdown && evaluation.breakdown.length > 0 ? (
            <div style={{ padding: '20px' }}>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {evaluation.breakdown.map((item, index) => (
                  <div key={index} style={{ marginBottom: '12px', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', fontWeight: '500', color: '#1e293b' }}>
                        {item.criteria}
                      </span>
                      <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#3b82f6' }}>
                        {item.score}/100
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                      Weight: {item.weight}% | Weighted: {item.weighted_score.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '16px', padding: '12px', background: '#e0f2fe', borderRadius: '6px' }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e293b' }}>
                  Total Score: {evaluation.total_weighted_score.toFixed(2)} ({evaluation.grade})
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              No evaluations available yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    border: 'none',
    borderRadius: 12,
    padding: '24px',
    position: 'relative',
    overflow: 'hidden',
  },
  statIcon: { fontSize: 28, marginBottom: 8 },
  statValue: { fontSize: 32, fontWeight: 700, lineHeight: 1, color: '#1e293b' },
  statLabel: { fontSize: 13, color: '#64748b', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.5px' },
  chartsRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 },
  chartCard: { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  chartTitle: { fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 600, color: '#1e293b', marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 700, marginBottom: 16 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    padding: '10px 14px', textAlign: 'left',
    fontSize: 12, fontWeight: 700,
    color: '#64748b', textTransform: 'uppercase',
    borderBottom: '1px solid #e2e8f0',
  },
  td: {
    padding: '12px 14px',
    borderBottom: '1px solid #f1f5f9',
    fontSize: 14,
  },
};

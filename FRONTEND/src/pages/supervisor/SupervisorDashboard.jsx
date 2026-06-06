import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import API from '../../Services/Api';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function SupervisorDashboard() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [placementRes, logbookRes] = await Promise.all([
          API.get('/placements/dashboard/'),
          API.get('/logbook/dashboard/')
        ]);

        const placementData = placementRes.data;
        const logbookData = logbookRes.data;

        // Process student performance data
        const studentPerformanceData = logbookData.student_performance?.map(student => ({
          name: student.student.length > 10 ? student.student.substring(0, 10) + '...' : student.student,
          totalLogs: student.total_logs,
          approvedLogs: student.approved_logs,
          approvalRate: student.approval_rate,
        })) || [];

        // Process log status data for pie chart
        const logStatusData = [
          { name: 'Submitted', value: logbookData.workload.pending_reviews, color: '#f59e0b' },
          { name: 'Reviewed', value: logbookData.workload.reviewed, color: '#3b82f6' },
          { name: 'Approved', value: logbookData.workload.approved, color: '#22c55e' },
        ];

        setDashboardData({
          stats: {
            assignedInterns: placementData.workload.total_students,
            pendingReviews: logbookData.workload.pending_reviews,
            reviewedThisWeek: logbookData.workload.reviewed,
            reviewCompletionRate: logbookData.workload.review_completion_rate,
          },
          placement: placementData,
          logbook: logbookData,
          charts: {
            studentPerformanceData,
            logStatusData,
          }
        });
      } catch (error) {
        console.error('Failed to fetch supervisor dashboard data:', error);
        setDashboardData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

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

  const { stats, charts } = dashboardData;

  return (
    <div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@600;700&display=swap');
        * { box-sizing: border-box; }
      `}</style>

      <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 700, color: '#1e293b', marginBottom: 24 }}>
        Supervisor Dashboard
      </h1>

      {/* Enhanced Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={{ ...styles.statCard, background: '#dbeafe' }}>
          <div style={styles.statIcon}>🎓</div>
          <div style={styles.statValue}>{stats.assignedInterns}</div>
          <div style={styles.statLabel}>Assigned Interns</div>
          <div style={{ fontSize: 11, color: '#3730a3', marginTop: 4 }}>
            Active students
          </div>
        </div>
        <div style={{ ...styles.statCard, background: '#fef9c3' }}>
          <div style={styles.statIcon}>⏳</div>
          <div style={styles.statValue}>{stats.pendingReviews}</div>
          <div style={styles.statLabel}>Pending Reviews</div>
          <div style={{ fontSize: 11, color: '#92400e', marginTop: 4 }}>
            Require attention
          </div>
        </div>
        <div style={{ ...styles.statCard, background: '#dcfce7' }}>
          <div style={styles.statIcon}>✅</div>
          <div style={styles.statValue}>{stats.reviewedThisWeek}</div>
          <div style={styles.statLabel}>Reviewed This Week</div>
          <div style={{ fontSize: 11, color: '#166534', marginTop: 4 }}>
            {stats.reviewCompletionRate}% completion rate
          </div>
        </div>
        <div style={{ ...styles.statCard, background: '#f3e8ff' }}>
          <div style={styles.statIcon}>📊</div>
          <div style={styles.statValue}>{stats.reviewCompletionRate}%</div>
          <div style={styles.statLabel}>Review Efficiency</div>
          <div style={{ fontSize: 11, color: '#7c3aed', marginTop: 4 }}>
            Overall performance
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div style={styles.chartsRow}>
        {/* Log Review Status */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Log Review Status</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={charts.logStatusData}
                cx="50%"
                cy="50%"
                outerRadius={90}
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

        {/* Student Performance Overview */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Student Performance Overview</h3>
          {charts.studentPerformanceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={charts.studentPerformanceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#64748b", fontSize: 10 }}
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
                <Legend wrapperStyle={{ color: "#64748b", fontSize: 12 }} />
                <Bar dataKey="totalLogs" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Total Logs" />
                <Bar dataKey="approvedLogs" fill="#22c55e" radius={[4, 4, 0, 0]} name="Approved" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              No student performance data available yet.
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div style={styles.chartsRow}>
        {/* Approval Rates */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Student Approval Rates</h3>
          {charts.studentPerformanceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={charts.studentPerformanceData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                layout="horizontal"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    color: "#1e293b"
                  }}
                  formatter={(value) => [`${value}%`, 'Approval Rate']}
                />
                <Bar dataKey="approvalRate" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Approval Rate %" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              No approval rate data available yet.
            </div>
          )}
        </div>

        {/* Workload Summary */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Workload Summary</h3>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#3b82f6', marginBottom: '8px' }}>
                  {stats.assignedInterns}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>
                  Total Students
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '8px' }}>
                  {stats.pendingReviews}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>
                  Pending Reviews
                </div>
              </div>
            </div>
            <div style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', color: '#64748b' }}>Review Completion</span>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b' }}>
                  {stats.reviewCompletionRate}%
                </span>
              </div>
              <div style={{ width: '100%', height: '12px', background: '#e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${stats.reviewCompletionRate}%`,
                    height: '100%',
                    background: stats.reviewCompletionRate > 75 ? '#22c55e' : stats.reviewCompletionRate > 50 ? '#3b82f6' : '#f59e0b',
                    borderRadius: '6px',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
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
};

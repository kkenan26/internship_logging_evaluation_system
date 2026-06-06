import { useState, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  ComposedChart, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";
import API from '../../Services/Api';

const COLORS = ["#6ee7b7", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];
const SCORE_COLORS = ["#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e"];

const StatCard = ({ label, value, color, icon, sub }) => (
  <div style={{ background: "#161824", border: "1px solid #2a2d3e", borderRadius: 12, padding: "24px", borderTop: `3px solid ${color}` }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <p style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{label}</p>
        <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 36, fontWeight: 700, color }}>{value}</p>
        {sub && <p style={{ fontSize: 12, color: "#475569", marginTop: 6 }}>{sub}</p>}
      </div>
      <span style={{ fontSize: 28 }}>{icon}</span>
    </div>
  </div>
);

const AdminStatisticsPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Use the new comprehensive dashboard API
        const dashboardRes = await API.get("/evaluations/comprehensive-dashboard/");
        const dashboardData = dashboardRes.data;

        // Transform data for charts
        const placementStatusData = [
          { name: 'Active', value: dashboardData.placements.active, color: '#22c55e' },
          { name: 'Pending', value: dashboardData.placements.pending, color: '#f59e0b' },
          { name: 'Completed', value: dashboardData.placements.completed, color: '#3b82f6' },
          { name: 'Cancelled', value: dashboardData.placements.cancelled, color: '#ef4444' },
        ];

        const userRoleData = [
          { name: 'Students', value: dashboardData.users.students, color: '#6ee7b7' },
          { name: 'Academic Sup', value: dashboardData.users.academic_supervisors, color: '#3b82f6' },
          { name: 'Workplace Sup', value: dashboardData.users.workplace_supervisors, color: '#f59e0b' },
          { name: 'Admins', value: dashboardData.users.admins, color: '#8b5cf6' },
        ];

        const logStatusData = [
          { name: 'Draft', value: dashboardData.logbook.draft, color: '#64748b' },
          { name: 'Submitted', value: dashboardData.logbook.submitted, color: '#f59e0b' },
          { name: 'Reviewed', value: dashboardData.logbook.reviewed, color: '#3b82f6' },
          { name: 'Approved', value: dashboardData.logbook.approved, color: '#22c55e' },
        ];

        // Score distribution from total_scores
        const scoreRanges = dashboardData.total_scores.score_ranges;
        const scoreDistributionData = [
          { range: '90-100', count: scoreRanges.excellent_90_plus, color: '#22c55e' },
          { range: '80-89', count: scoreRanges.good_80_89, color: '#84cc16' },
          { range: '70-79', count: scoreRanges.satisfactory_70_79, color: '#eab308' },
          { range: '60-69', count: scoreRanges.needs_improvement_below_70, color: '#f97316' },
        ];

        // Weekly trends from logbook
        const weeklyTrendsData = dashboardData.logbook.weekly_trends.map(trend => ({
          week: trend.week,
          submitted: trend.submitted,
          approved: trend.approved,
        }));

        // Company distribution
        const companyData = dashboardData.top_companies.slice(0, 8).map(company => ({
          name: company.company_name.length > 15 ? company.company_name.substring(0, 15) + '...' : company.company_name,
          placements: company.count,
        }));

        // Supervisor performance radar chart
        const supervisorRadarData = [
          { subject: 'Academic Evals', A: dashboardData.supervisor_performance.filter(s => s.role === 'academic_supervisor').reduce((sum, s) => sum + s.evaluations_completed, 0) },
          { subject: 'Workplace Evals', A: dashboardData.supervisor_performance.filter(s => s.role === 'workplace_supervisor').reduce((sum, s) => sum + s.evaluations_completed, 0) },
          { subject: 'Placements', A: dashboardData.supervisor_performance.reduce((sum, s) => sum + s.placements_supervised, 0) },
          { subject: 'Avg Score', A: dashboardData.supervisor_performance.reduce((sum, s) => sum + s.avg_score_given, 0) / dashboardData.supervisor_performance.length },
        ];

        setStats({
          // Summary stats
          totalUsers: dashboardData.users.total_users,
          totalStudents: dashboardData.users.students,
          totalPlacements: dashboardData.placements.total,
          activePlacements: dashboardData.placements.active,
          totalLogs: dashboardData.logbook.total,
          submittedLogs: dashboardData.logbook.submitted + dashboardData.logbook.reviewed + dashboardData.logbook.approved,
          totalEvaluations: dashboardData.evaluations.total_criteria_evaluations,
          avgScore: dashboardData.total_scores.average_total_score.toFixed(1),

          // Chart data
          placementStatusData,
          userRoleData,
          logStatusData,
          scoreDistributionData,
          weeklyTrendsData,
          companyData,
          supervisorRadarData,

          // Additional metrics
          completionRate: dashboardData.placements.completion_rate,
          submissionRate: dashboardData.logbook.submission_rate,
          approvalRate: dashboardData.logbook.approval_rate,
          academicEvalRate: dashboardData.evaluations.academic_evaluations.completion_rate,
          workplaceEvalRate: dashboardData.evaluations.workplace_evaluations.completion_rate,
        });
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        setStats(null);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div style={{ ...styles.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#475569" }}>Loading statistics...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div style={{ ...styles.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#ef4444" }}>Failed to load statistics. Check your API connection.</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@600;700&display=swap');
        * { box-sizing: border-box; }
        .recharts-tooltip-wrapper { font-family: 'DM Sans', sans-serif !important; }
      `}</style>

      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Advanced System Analytics</h1>
          <p style={styles.subtitle}>Comprehensive dashboard with real-time metrics and trends</p>
        </div>
        <div style={styles.refreshNote}>
          Generated: {new Date().toLocaleString()}
        </div>
      </div>

      {/* Enhanced stat cards */}
      <div style={styles.statsGrid}>
        <StatCard
          label="Total Users"
          value={stats.totalUsers}
          color="#6ee7b7"
          icon="👥"
          sub={`${stats.totalStudents} students enrolled`}
        />
        <StatCard
          label="Active Placements"
          value={stats.activePlacements}
          color="#3b82f6"
          icon="🏢"
          sub={`${stats.completionRate}% completion rate`}
        />
        <StatCard
          label="Log Submissions"
          value={stats.totalLogs}
          color="#f59e0b"
          icon="📓"
          sub={`${stats.submissionRate}% submission rate`}
        />
        <StatCard
          label="Avg Total Score"
          value={stats.avgScore}
          color="#8b5cf6"
          icon="📊"
          sub={`${stats.totalEvaluations} evaluations completed`}
        />
      </div>

      {/* Charts Row 1: Status Distributions */}
      <div style={styles.chartsRow}>
        {/* Placement Status Distribution */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Placement Status Overview</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={stats.placementStatusData}
                cx="50%"
                cy="50%"
                outerRadius={90}
                dataKey="value"
                label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                labelLine={{ stroke: "#475569" }}
              >
                {stats.placementStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#161824",
                  border: "1px solid #2a2d3e",
                  borderRadius: 8,
                  color: "#e2e8f0"
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* User Role Distribution */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>User Role Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.userRoleData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" vertical={false} />
              <XAxis
                dataKey="name"
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
                  background: "#161824",
                  border: "1px solid #2a2d3e",
                  borderRadius: 8,
                  color: "#e2e8f0"
                }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {stats.userRoleData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2: Performance Metrics */}
      <div style={styles.chartsRow}>
        {/* Logbook Status Breakdown */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Logbook Status Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={stats.logStatusData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" vertical={false} />
              <XAxis
                dataKey="name"
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
                  background: "#161824",
                  border: "1px solid #2a2d3e",
                  borderRadius: 8,
                  color: "#e2e8f0"
                }}
              />
              <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Count" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Score Distribution */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Final Score Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.scoreDistributionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" vertical={false} />
              <XAxis
                dataKey="range"
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
                  background: "#161824",
                  border: "1px solid #2a2d3e",
                  borderRadius: 8,
                  color: "#e2e8f0"
                }}
              />
              <Bar dataKey="count" name="Students" radius={[6, 6, 0, 0]}>
                {stats.scoreDistributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 3: Trends and Top Performers */}
      <div style={styles.chartsRow}>
        {/* Weekly Trends */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Weekly Log Submission Trends</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={stats.weeklyTrendsData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" vertical={false} />
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
                  background: "#161824",
                  border: "1px solid #2a2d3e",
                  borderRadius: 8,
                  color: "#e2e8f0"
                }}
              />
              <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="submitted"
                stackId="1"
                stroke="#22c55e"
                fill="#22c55e"
                fillOpacity={0.6}
                name="Submitted"
              />
              <Area
                type="monotone"
                dataKey="approved"
                stackId="2"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.6}
                name="Approved"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top Companies */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Top Placement Companies</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={stats.companyData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              layout="horizontal"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" horizontal={false} />
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
                  background: "#161824",
                  border: "1px solid #2a2d3e",
                  borderRadius: 8,
                  color: "#e2e8f0"
                }}
              />
              <Bar dataKey="placements" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Placements" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 4: Advanced Analytics */}
      <div style={styles.chartsRow}>
        {/* Supervisor Performance Radar */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Supervisor Performance Overview</h3>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={stats.supervisorRadarData}>
              <PolarGrid stroke="#2a2d3e" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: "#64748b", fontSize: 11 }}
              />
              <PolarRadiusAxis
                tick={{ fill: "#64748b", fontSize: 10 }}
                tickCount={5}
              />
              <Radar
                name="Performance"
                dataKey="A"
                stroke="#8b5cf6"
                fill="#8b5cf6"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Tooltip
                contentStyle={{
                  background: "#161824",
                  border: "1px solid #2a2d3e",
                  borderRadius: 8,
                  color: "#e2e8f0"
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Completion Rates Overview */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>System Completion Rates</h3>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#22c55e', marginBottom: '8px' }}>
                  {stats.completionRate}%
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>
                  Placement Completion
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#3b82f6', marginBottom: '8px' }}>
                  {stats.submissionRate}%
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>
                  Log Submission
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '8px' }}>
                  {stats.academicEvalRate}%
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>
                  Academic Evaluations
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#8b5cf6', marginBottom: '8px' }}>
                  {stats.workplaceEvalRate}%
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>
                  Workplace Evaluations
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: { minHeight: "100vh", background: "#0f1117", fontFamily: "'DM Sans', sans-serif", color: "#e2e8f0", padding: "32px 24px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 },
  title: { fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 700, color: "#f1f5f9" },
  subtitle: { fontSize: 14, color: "#64748b", marginTop: 4 },
  refreshNote: { fontSize: 12, color: "#475569", marginTop: 8 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 },
  chartsRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 },
  chartCard: { background: "#161824", border: "1px solid #2a2d3e", borderRadius: 12, padding: "24px" },
  chartTitle: { fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 600, color: "#f1f5f9", marginBottom: 20 },
};

export default AdminStatisticsPage;

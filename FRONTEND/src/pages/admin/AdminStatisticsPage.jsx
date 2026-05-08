import { useState, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import API from '../../Services/Api';

const COLORS = ["#6ee7b7", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

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
        const [usersRes, placementsRes, logsRes, evaluationsRes] = await Promise.all([
          API.get("/users/"),
          API.get("/placements/"),
          API.get("/logs/"),
          API.get("/evaluations/"),
        ]);

        // ✅ Add these 4 lines to normalize paginated responses
        const users       = Array.isArray(usersRes.data)       ? usersRes.data       : usersRes.data.results       ?? [];
        const placements  = Array.isArray(placementsRes.data)  ? placementsRes.data  : placementsRes.data.results  ?? [];
        const logs        = Array.isArray(logsRes.data)        ? logsRes.data        : logsRes.data.results        ?? [];
        const evaluations = Array.isArray(evaluationsRes.data) ? evaluationsRes.data : evaluationsRes.data.results ?? [];

        // Role distribution
        const roleDist = ["student", "workplace_supervisor", "academic_supervisor", "admin"].map((role) => ({
          name: role.charAt(0).toUpperCase() + role.slice(1),
          value: users.filter((u) => u.role === role).length,
        }));

        // Log status distribution
        const logStatuses = ["draft", "submitted", "reviewed", "approved"];
        const logStatusDist = logStatuses.map((s) => ({
          name: s.charAt(0).toUpperCase() + s.slice(1),
          count: logs.filter((l) => l.status === s).length,
        }));

        // Placement status
        const now = new Date();
        const activePlacements = placements.filter(
          (p) => new Date(p.start_date) <= now && new Date(p.end_date) >= now
        ).length;

        // Score distribution for evaluations
        const scoreBuckets = [
          { range: "0-49", min: 0, max: 49 },
          { range: "50-59", min: 50, max: 59 },
          { range: "60-69", min: 60, max: 69 },
          { range: "70-79", min: 70, max: 79 },
          { range: "80-89", min: 80, max: 89 },
          { range: "90-100", min: 90, max: 100 },
        ].map((b) => ({
          range: b.range,
          count: evaluations.filter(
            (e) => e.total_score >= b.min && e.total_score <= b.max
          ).length,
        }));

        // Weekly log submission trend (by week number if available)
        const weeklyTrend = Array.from({ length: 8 }, (_, i) => ({
          week: `Wk ${i + 1}`,
          submitted: logs.filter((l) => l.week_number === i + 1 && l.status !== "draft").length,
          pending: logs.filter((l) => l.week_number === i + 1 && l.status === "draft").length,
        }));

        setStats({
          totalUsers: users.length,
          totalStudents: users.filter((u) => u.role === "student").length,
          totalPlacements: placements.length,
          activePlacements,
          totalLogs: logs.length,
          submittedLogs: logs.filter((l) => l.status !== "draft").length,
          totalEvaluations: evaluations.length,
          avgScore: evaluations.length
            ? (evaluations.reduce((a, e) => a + (parseFloat(e.total_score) || 0), 0) / evaluations.length).toFixed(1)
            : "—",
          roleDist,
          logStatusDist,
          scoreBuckets,
          weeklyTrend,
        });
      } catch {
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
          <h1 style={styles.title}>System Statistics</h1>
          <p style={styles.subtitle}>Live overview of ILES activity and performance</p>
        </div>
        <div style={styles.refreshNote}>Last updated: {new Date().toLocaleTimeString()}</div>
      </div>

      {/* Top stat cards */}
      <div style={styles.statsGrid}>
        <StatCard label="Total Users" value={stats.totalUsers} color="#6ee7b7" icon="👥" sub={`${stats.totalStudents} students`} />
        <StatCard label="Placements" value={stats.totalPlacements} color="#3b82f6" icon="🏢" sub={`${stats.activePlacements} active now`} />
        <StatCard label="Logbook Entries" value={stats.totalLogs} color="#f59e0b" icon="📓" sub={`${stats.submittedLogs} submitted`} />
        <StatCard label="Evaluations" value={stats.totalEvaluations} color="#8b5cf6" icon="📊" sub={`Avg score: ${stats.avgScore}`} />
      </div>

      {/* Charts Row 1 */}
      <div style={styles.chartsRow}>
        {/* Log Status Distribution */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Logbook Status Breakdown</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats.logStatusDist} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#161824", border: "1px solid #2a2d3e", borderRadius: 8, color: "#e2e8f0" }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {stats.logStatusDist.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Role Distribution Pie */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>User Role Distribution</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={stats.roleDist} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={{ stroke: "#475569" }}>
                {stats.roleDist.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "#161824", border: "1px solid #2a2d3e", borderRadius: 8, color: "#e2e8f0" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div style={styles.chartsRow}>
        {/* Weekly Submission Trend */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Weekly Log Submission Trend</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={stats.weeklyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" vertical={false} />
              <XAxis dataKey="week" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#161824", border: "1px solid #2a2d3e", borderRadius: 8, color: "#e2e8f0" }} />
              <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />
              <Line type="monotone" dataKey="submitted" stroke="#6ee7b7" strokeWidth={2} dot={{ fill: "#6ee7b7", r: 4 }} name="Submitted" />
              <Line type="monotone" dataKey="pending" stroke="#f59e0b" strokeWidth={2} dot={{ fill: "#f59e0b", r: 4 }} name="Draft" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Score Distribution */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Evaluation Score Distribution</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats.scoreBuckets} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" vertical={false} />
              <XAxis dataKey="range" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#161824", border: "1px solid #2a2d3e", borderRadius: 8, color: "#e2e8f0" }} />
              <Bar dataKey="count" name="Students" radius={[6, 6, 0, 0]}>
                {stats.scoreBuckets.map((_, i) => (
                  <Cell key={i} fill={i < 2 ? "#ef4444" : i < 4 ? "#f59e0b" : "#6ee7b7"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
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

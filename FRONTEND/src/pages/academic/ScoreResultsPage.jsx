import { useState, useEffect } from "react";
import { RadialBarChart, RadialBar, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import API from "../../Services/Api";

const getGrade = (score) => {
  if (score >= 80) return { label: "A", desc: "Distinction", color: "#00c48c" };
  if (score >= 70) return { label: "B", desc: "Credit", color: "#3b82f6" };
  if (score >= 60) return { label: "C", desc: "Pass", color: "#f59e0b" };
  if (score >= 50) return { label: "D", desc: "Satisfactory", color: "#f97316" };
  return { label: "F", desc: "Fail", color: "#ef4444" };
};

const ScoreRing = ({ score, color, label, weight }) => {
  const data = [{ value: score, fill: color }, { value: 100 - score, fill: "#1e2130" }];
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ position: "relative", width: 120, height: 120, margin: "0 auto" }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={42} outerRadius={56} startAngle={90} endAngle={-270} dataKey="value" strokeWidth={0}>
              {data.map((_, i) => <Cell key={i} fill={data[i].fill} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color, lineHeight: 1 }}>{score?.toFixed(0) ?? "—"}</span>
          <span style={{ fontSize: 10, color: "#475569" }}>/ 100</span>
        </div>
      </div>
      <p style={{ fontSize: 13, fontWeight: 500, color: "#cbd5e1", marginTop: 10 }}>{label}</p>
      <p style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>Weight: {weight}</p>
    </div>
  );
};

const ScoreResultsPage = () => {
  const [evaluation, setEvaluation] = useState(null);
  const [placement, setPlacement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [evalRes, placementRes] = await Promise.all([
          API.get("/evaluations/my/"),
          API.get("/placements/my/"),
        ]);
        setEvaluation(evalRes.data[0] || evalRes.data || null);
        setPlacement(placementRes.data[0] || placementRes.data || null);
      } catch {
        setError("Could not load evaluation data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ ...styles.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#475569" }}>Loading your results...</p>
      </div>
    );
  }

  if (error || !evaluation) {
    return (
      <div style={{ ...styles.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>📋</div>
          <p style={{ color: "#94a3b8", fontSize: 16, fontWeight: 600 }}>No evaluation results yet</p>
          <p style={{ color: "#475569", fontSize: 13, marginTop: 8 }}>
            {error || "Your academic supervisor has not submitted your evaluation."}
          </p>
        </div>
      </div>
    );
  }

  const total = parseFloat(evaluation.total_score);
  const grade = getGrade(total);

  const breakdownData = [
    { label: "Logbook", score: parseFloat(evaluation.logbook_score), weight: "40%", color: "#6ee7b7", weighted: parseFloat(evaluation.logbook_score) * 0.4 },
    { label: "Supervisor", score: parseFloat(evaluation.supervisor_score), weight: "30%", color: "#3b82f6", weighted: parseFloat(evaluation.supervisor_score) * 0.3 },
    { label: "Presentation", score: parseFloat(evaluation.presentation_score), weight: "30%", color: "#8b5cf6", weighted: parseFloat(evaluation.presentation_score) * 0.3 },
  ];

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@600;700&display=swap');
        * { box-sizing: border-box; }
      `}</style>

      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Evaluation Results</h1>
          <p style={styles.subtitle}>Your internship performance assessment</p>
        </div>
      </div>

      {/* Placement Info Banner */}
      {placement && (
        <div style={styles.placementBanner}>
          <span style={styles.bannerIcon}>🏢</span>
          <div>
            <p style={styles.bannerCompany}>{placement.company_name}</p>
            <p style={styles.bannerDates}>
              {new Date(placement.start_date).toLocaleDateString()} – {new Date(placement.end_date).toLocaleDateString()}
            </p>
          </div>
          <div style={styles.bannerRight}>
            <p style={styles.bannerSup}>Academic Supervisor</p>
            <p style={styles.bannerSupName}>{evaluation.academic_supervisor_name || "—"}</p>
          </div>
        </div>
      )}

      {/* Total Score Hero */}
      <div style={{ ...styles.heroCard, borderColor: grade.color }}>
        <div style={styles.heroLeft}>
          <p style={styles.heroLabel}>Overall Score</p>
          <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 80, fontWeight: 700, color: grade.color, lineHeight: 1 }}>
            {total.toFixed(1)}
          </p>
          <p style={{ fontSize: 14, color: "#64748b", marginTop: 6 }}>out of 100</p>
        </div>
        <div style={styles.heroRight}>
          <div style={{ ...styles.gradeBig, background: grade.color + "22", borderColor: grade.color }}>
            <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 64, fontWeight: 700, color: grade.color, lineHeight: 1 }}>
              {grade.label}
            </span>
          </div>
          <p style={{ color: grade.color, fontWeight: 600, fontSize: 16, marginTop: 12 }}>{grade.desc}</p>
        </div>
      </div>

      {/* Score Breakdown Rings */}
      <div style={styles.ringsCard}>
        <h3 style={styles.sectionTitle}>Score Breakdown</h3>
        <div style={styles.ringsRow}>
          {breakdownData.map((d) => (
            <ScoreRing key={d.label} score={d.score} color={d.color} label={d.label} weight={d.weight} />
          ))}
        </div>

        {/* Weighted Calculation Table */}
        <div style={styles.calcTable}>
          <div style={styles.calcHeader}>
            <span>Component</span>
            <span>Raw Score</span>
            <span>Weight</span>
            <span>Weighted</span>
          </div>
          {breakdownData.map((d) => (
            <div key={d.label} style={styles.calcRow}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: d.color, display: "inline-block" }} />
                {d.label}
              </span>
              <span style={{ color: d.color, fontWeight: 600 }}>{d.score.toFixed(1)}</span>
              <span style={{ color: "#64748b" }}>{d.weight}</span>
              <span style={{ color: "#e2e8f0", fontWeight: 500 }}>{d.weighted.toFixed(2)}</span>
            </div>
          ))}
          <div style={{ ...styles.calcRow, borderTop: "1px solid #2a2d3e", marginTop: 8, paddingTop: 16 }}>
            <span style={{ fontWeight: 700, color: "#f1f5f9" }}>Total</span>
            <span />
            <span />
            <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: grade.color }}>
              {total.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Comments */}
      {evaluation.comments && (
        <div style={styles.commentsCard}>
          <h3 style={styles.sectionTitle}>Supervisor Comments</h3>
          <p style={styles.commentsText}>"{evaluation.comments}"</p>
          <p style={styles.commentsBy}>— {evaluation.academic_supervisor_name || "Academic Supervisor"}</p>
        </div>
      )}

      {/* Grade Scale Reference */}
      <div style={styles.gradeScaleCard}>
        <h3 style={styles.sectionTitle}>Grade Scale</h3>
        <div style={styles.gradeScaleRow}>
          {[
            { range: "80–100", grade: "A", desc: "Distinction", color: "#00c48c" },
            { range: "70–79", grade: "B", desc: "Credit", color: "#3b82f6" },
            { range: "60–69", grade: "C", desc: "Pass", color: "#f59e0b" },
            { range: "50–59", grade: "D", desc: "Satisfactory", color: "#f97316" },
            { range: "0–49", grade: "F", desc: "Fail", color: "#ef4444" },
          ].map(({ range, grade: g, desc, color }) => (
            <div key={g} style={{ ...styles.gradeScaleItem, borderColor: g === grade.label ? color : "#2a2d3e", background: g === grade.label ? color + "15" : "transparent" }}>
              <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color }}>{g}</span>
              <span style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{range}</span>
              <span style={{ fontSize: 11, color: "#475569" }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: { minHeight: "100vh", background: "#0f1117", fontFamily: "'DM Sans', sans-serif", color: "#e2e8f0", padding: "32px 24px" },
  header: { marginBottom: 28 },
  title: { fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 700, color: "#f1f5f9" },
  subtitle: { fontSize: 14, color: "#64748b", marginTop: 4 },
  placementBanner: { display: "flex", alignItems: "center", gap: 16, background: "#161824", border: "1px solid #2a2d3e", borderRadius: 10, padding: "16px 24px", marginBottom: 24 },
  bannerIcon: { fontSize: 28 },
  bannerCompany: { fontSize: 15, fontWeight: 600, color: "#f1f5f9" },
  bannerDates: { fontSize: 12, color: "#64748b", marginTop: 2 },
  bannerRight: { marginLeft: "auto", textAlign: "right" },
  bannerSup: { fontSize: 11, color: "#475569" },
  bannerSupName: { fontSize: 14, fontWeight: 500, color: "#94a3b8" },
  heroCard: { background: "#161824", border: "2px solid", borderRadius: 16, padding: "36px 40px", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" },
  heroLeft: {},
  heroLabel: { fontSize: 13, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 },
  heroRight: { display: "flex", flexDirection: "column", alignItems: "center" },
  gradeBig: { width: 120, height: 120, borderRadius: 16, border: "2px solid", display: "flex", alignItems: "center", justifyContent: "center" },
  ringsCard: { background: "#161824", border: "1px solid #2a2d3e", borderRadius: 12, padding: "28px 32px", marginBottom: 20 },
  sectionTitle: { fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, color: "#f1f5f9", marginBottom: 24 },
  ringsRow: { display: "flex", justifyContent: "space-around", marginBottom: 32, flexWrap: "wrap", gap: 20 },
  calcTable: { background: "#0f1117", borderRadius: 10, padding: "16px 20px" },
  calcHeader: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid #1e2130" },
  calcRow: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, fontSize: 14, color: "#94a3b8", padding: "8px 0" },
  commentsCard: { background: "#161824", border: "1px solid #2a2d3e", borderRadius: 12, padding: "28px 32px", marginBottom: 20 },
  commentsText: { fontSize: 15, color: "#94a3b8", fontStyle: "italic", lineHeight: 1.7 },
  commentsBy: { fontSize: 12, color: "#475569", marginTop: 12 },
  gradeScaleCard: { background: "#161824", border: "1px solid #2a2d3e", borderRadius: 12, padding: "28px 32px" },
  gradeScaleRow: { display: "flex", gap: 12 },
  gradeScaleItem: { flex: 1, border: "1px solid", borderRadius: 10, padding: "16px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 },
};

export default ScoreResultsPage;

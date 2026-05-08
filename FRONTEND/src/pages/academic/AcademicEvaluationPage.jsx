import { useState, useEffect } from "react";
import API from '../../Services/Api';

const AcademicEvaluationPage = () => {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [placement, setPlacement] = useState(null);
  const [existingEval, setExistingEval] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [scores, setScores] = useState({
    logbook_score: "",
    supervisor_score: "",
    presentation_score: "",
    comments: "",
  });

  const weights = { logbook_score: 0.4, supervisor_score: 0.3, presentation_score: 0.3 };

  const computedTotal =
    scores.logbook_score && scores.supervisor_score && scores.presentation_score
      ? (
          parseFloat(scores.logbook_score) * weights.logbook_score +
          parseFloat(scores.supervisor_score) * weights.supervisor_score +
          parseFloat(scores.presentation_score) * weights.presentation_score
        ).toFixed(2)
      : null;

  const getGrade = (score) => {
    if (score >= 80) return { label: "A", color: "#00c48c" };
    if (score >= 70) return { label: "B", color: "#3b82f6" };
    if (score >= 60) return { label: "C", color: "#f59e0b" };
    if (score >= 50) return { label: "D", color: "#f97316" };
    return { label: "F", color: "#ef4444" };
  };

  // ── Fetch placements assigned to this academic supervisor ──────
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        // Fetch all placements — backend filters to only those where
        // the logged-in user is the academic_supervisor
        const res = await API.get("/placements/");
        const placements = Array.isArray(res.data)
          ? res.data
          : res.data.results || [];

        // Extract the student object from each placement
        // Each placement has student info embedded via the serializer
        const studentList = placements
          .filter((p) => p.student_name) // only placements with a student
          .map((p) => ({
            id: p.student,
            username: p.student_name,
            email: p.student_email || "",
            placementId: p.id,
            company: p.company_name,
            start_date: p.start_date,
            end_date: p.end_date,
            placementStatus: p.status,
          }));

        setStudents(studentList);
      } catch {
        setStudents([]);
      }
    };
    fetchStudents();
  }, []);

  const handleStudentSelect = async (student) => {
    setSelectedStudent(student);
    setExistingEval(null);
    setSuccessMsg("");
    setErrorMsg("");
    setScores({ logbook_score: "", supervisor_score: "", presentation_score: "", comments: "" });
    setLoading(true);
    try {
      // Use the placement we already have from the student object
      setPlacement({
        company_name: student.company,
        start_date: student.start_date,
        end_date: student.end_date,
      });

      // Check for existing evaluation
      const evalRes = await API.get(`/evaluations/?student=${student.id}`);
      const evals = Array.isArray(evalRes.data)
        ? evalRes.data
        : evalRes.data.results || [];

      if (evals.length > 0) {
        const ev = evals[0];
        setExistingEval(ev);
        setScores({
          logbook_score:      ev.logbook_score      || "",
          supervisor_score:   ev.supervisor_score   || "",
          presentation_score: ev.presentation_score || "",
          comments:           ev.comments           || "",
        });
      }
    } catch {
      setErrorMsg("Failed to load student evaluation data.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name !== "comments") {
      const num = parseFloat(value);
      if (value !== "" && (isNaN(num) || num < 0 || num > 100)) return;
    }
    setScores((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const payload = {
        student:            selectedStudent.id,
        placement:          selectedStudent.placementId,
        logbook_score:      parseFloat(scores.logbook_score),
        supervisor_score:   parseFloat(scores.supervisor_score),
        presentation_score: parseFloat(scores.presentation_score),
        total_score:        parseFloat(computedTotal),
        comments:           scores.comments,
      };
      if (existingEval) {
        await API.put(`/evaluations/${existingEval.id}/`, payload);
        setSuccessMsg("Evaluation updated successfully.");
      } else {
        const res = await API.post("/evaluations/", payload);
        setSuccessMsg("Evaluation submitted successfully.");
        setExistingEval(res.data);
      }
    } catch (err) {
      const data = err.response?.data;
      setErrorMsg(data ? JSON.stringify(data) : "Submission failed. Please check inputs and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const grade = computedTotal ? getGrade(parseFloat(computedTotal)) : null;

  return (
    // ── Scoped wrapper — dark theme only applies inside this component ──
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Academic Evaluation</h1>
          <p style={styles.subtitle}>Score student internship performance</p>
        </div>
        <div style={styles.weightBadges}>
          <span style={styles.badge}>Logbook 40%</span>
          <span style={styles.badge}>Supervisor 30%</span>
          <span style={styles.badge}>Presentation 30%</span>
        </div>
      </div>

      <div style={styles.layout}>
        {/* Student List */}
        <div style={styles.sidebar}>
          <p style={styles.sectionLabel}>Assigned Students</p>
          {students.length === 0 ? (
            <div>
              <p style={styles.empty}>No students assigned yet.</p>
              <p style={{ fontSize: 12, color: '#374151', marginTop: 8 }}>
                Students will appear here once an admin assigns you as their academic supervisor on a placement.
              </p>
            </div>
          ) : (
            students.map((s) => (
              <div
                key={s.id}
                onClick={() => handleStudentSelect(s)}
                style={{
                  ...styles.studentCard,
                  borderColor: selectedStudent?.id === s.id ? "#6ee7b7" : "#2a2d3e",
                  background:  selectedStudent?.id === s.id ? "#1e2130" : "#161824",
                  cursor: "pointer",
                }}
              >
                <div style={styles.avatar}>{s.username?.[0]?.toUpperCase() || "S"}</div>
                <div>
                  <p style={styles.studentName}>{s.username}</p>
                  <p style={styles.studentMeta}>{s.company || s.email}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Evaluation Form */}
        <div style={styles.main}>
          {!selectedStudent ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📋</div>
              <p style={styles.emptyTitle}>Select a student to evaluate</p>
              <p style={styles.emptyText}>Choose a student from the list to begin scoring.</p>
            </div>
          ) : loading ? (
            <div style={styles.emptyState}><p style={styles.emptyText}>Loading...</p></div>
          ) : (
            <>
              {/* Student Info */}
              <div style={styles.studentHeader}>
                <div style={styles.avatarLg}>{selectedStudent.username?.[0]?.toUpperCase()}</div>
                <div>
                  <h2 style={styles.studentFullName}>{selectedStudent.username}</h2>
                  {placement && (
                    <p style={styles.placementInfo}>
                      📍 {placement.company_name} &nbsp;|&nbsp;
                      {new Date(placement.start_date).toLocaleDateString()} –{" "}
                      {new Date(placement.end_date).toLocaleDateString()}
                    </p>
                  )}
                  {existingEval && (
                    <span style={styles.evalBadge}>✓ Evaluation on record — editing</span>
                  )}
                </div>
              </div>

              {successMsg && <div style={styles.successAlert}>{successMsg}</div>}
              {errorMsg   && <div style={styles.errorAlert}>{errorMsg}</div>}

              <form onSubmit={handleSubmit} style={styles.form}>
                <div style={styles.scoreGrid}>
                  {[
                    { name: "logbook_score",      label: "Logbook Score",      weight: "40%", icon: "📓" },
                    { name: "supervisor_score",    label: "Supervisor Score",   weight: "30%", icon: "👤" },
                    { name: "presentation_score",  label: "Presentation Score", weight: "30%", icon: "🎤" },
                  ].map(({ name, label, weight, icon }) => (
                    <div key={name} style={styles.scoreCard}>
                      <div style={styles.scoreCardHeader}>
                        <span style={styles.scoreIcon}>{icon}</span>
                        <div>
                          <p style={styles.scoreLabel}>{label}</p>
                          <p style={styles.scoreWeight}>Weight: {weight}</p>
                        </div>
                      </div>
                      <input
                        type="number"
                        name={name}
                        value={scores[name]}
                        onChange={handleChange}
                        placeholder="0 – 100"
                        min="0"
                        max="100"
                        required
                        style={{
                          ...styles.scoreInput,
                          // ensure input is always interactive
                          pointerEvents: 'auto',
                          userSelect: 'text',
                        }}
                      />
                    </div>
                  ))}
                </div>

                {/* Computed Score */}
                {computedTotal && (
                  <div style={styles.totalBox}>
                    <div>
                      <p style={styles.totalLabel}>Weighted Total Score</p>
                      <p style={styles.totalFormula}>
                        ({scores.logbook_score} × 0.4) + ({scores.supervisor_score} × 0.3) + ({scores.presentation_score} × 0.3)
                      </p>
                    </div>
                    <div style={styles.totalRight}>
                      <span style={{ ...styles.totalScore, color: grade.color }}>{computedTotal}</span>
                      <span style={{ ...styles.gradePill, background: grade.color + "22", color: grade.color }}>
                        Grade {grade.label}
                      </span>
                    </div>
                  </div>
                )}

                <div style={styles.commentsBlock}>
                  <label style={styles.commentsLabel}>Comments (optional)</label>
                  <textarea
                    name="comments"
                    value={scores.comments}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Add any remarks about the student's internship performance..."
                    style={styles.textarea}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || !computedTotal}
                  style={{
                    ...styles.submitBtn,
                    opacity: (submitting || !computedTotal) ? 0.5 : 1,
                    cursor:  (submitting || !computedTotal) ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submitting ? "Submitting..." : existingEval ? "Update Evaluation" : "Submit Evaluation"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  page:            { minHeight: "100vh", background: "#0f1117", fontFamily: "'DM Sans', sans-serif", color: "#e2e8f0", padding: "32px 24px", borderRadius: 12 },
  header:          { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 36 },
  title:           { fontSize: 28, fontWeight: 700, color: "#f1f5f9", letterSpacing: "-0.5px" },
  subtitle:        { fontSize: 14, color: "#64748b", marginTop: 4 },
  weightBadges:    { display: "flex", gap: 8, flexWrap: "wrap" },
  badge:           { background: "#1e2130", border: "1px solid #2a2d3e", color: "#94a3b8", fontSize: 12, padding: "4px 12px", borderRadius: 20 },
  layout:          { display: "grid", gridTemplateColumns: "260px 1fr", gap: 24 },
  sidebar:         { background: "#161824", border: "1px solid #2a2d3e", borderRadius: 12, padding: 20 },
  sectionLabel:    { fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 },
  empty:           { fontSize: 13, color: "#475569" },
  studentCard:     { display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 8, border: "1px solid", marginBottom: 8, transition: "all 0.15s" },
  avatar:          { width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #6ee7b7, #3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#0f1117", flexShrink: 0 },
  studentName:     { fontSize: 13, fontWeight: 500, color: "#e2e8f0" },
  studentMeta:     { fontSize: 11, color: "#475569", marginTop: 2 },
  main:            { background: "#161824", border: "1px solid #2a2d3e", borderRadius: 12, padding: 32 },
  emptyState:      { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 320, gap: 12 },
  emptyIcon:       { fontSize: 48 },
  emptyTitle:      { fontSize: 16, fontWeight: 600, color: "#94a3b8" },
  emptyText:       { fontSize: 13, color: "#475569" },
  studentHeader:   { display: "flex", alignItems: "center", gap: 16, marginBottom: 28, paddingBottom: 24, borderBottom: "1px solid #2a2d3e" },
  avatarLg:        { width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg, #6ee7b7, #3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#0f1117", flexShrink: 0 },
  studentFullName: { fontSize: 20, fontWeight: 700, color: "#f1f5f9" },
  placementInfo:   { fontSize: 13, color: "#64748b", marginTop: 4 },
  evalBadge:       { display: "inline-block", background: "#1a3a2e", color: "#6ee7b7", fontSize: 11, padding: "3px 10px", borderRadius: 20, marginTop: 6 },
  successAlert:    { background: "#0d2818", border: "1px solid #16a34a", color: "#4ade80", borderRadius: 8, padding: "12px 16px", marginBottom: 20, fontSize: 13 },
  errorAlert:      { background: "#2d1212", border: "1px solid #dc2626", color: "#f87171", borderRadius: 8, padding: "12px 16px", marginBottom: 20, fontSize: 13 },
  form:            {},
  scoreGrid:       { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 },
  scoreCard:       { background: "#0f1117", border: "1px solid #2a2d3e", borderRadius: 10, padding: 20 },
  scoreCardHeader: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 },
  scoreIcon:       { fontSize: 24 },
  scoreLabel:      { fontSize: 13, fontWeight: 500, color: "#cbd5e1" },
  scoreWeight:     { fontSize: 11, color: "#475569", marginTop: 2 },
  scoreInput:      { width: "100%", background: "#161824", border: "1px solid #2a2d3e", borderRadius: 8, padding: "10px 14px", color: "#f1f5f9", fontSize: 20, fontWeight: 600, transition: "border-color 0.15s" },
  totalBox:        { background: "linear-gradient(135deg, #0d1f17, #0f1a2e)", border: "1px solid #2a2d3e", borderRadius: 12, padding: "20px 24px", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" },
  totalLabel:      { fontSize: 14, fontWeight: 600, color: "#94a3b8" },
  totalFormula:    { fontSize: 11, color: "#475569", marginTop: 4 },
  totalRight:      { display: "flex", alignItems: "center", gap: 12 },
  totalScore:      { fontSize: 40, fontWeight: 700 },
  gradePill:       { padding: "4px 14px", borderRadius: 20, fontWeight: 700, fontSize: 14 },
  commentsBlock:   { marginBottom: 24 },
  commentsLabel:   { display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 8 },
  textarea:        { width: "100%", background: "#0f1117", border: "1px solid #2a2d3e", borderRadius: 8, padding: "12px 14px", color: "#e2e8f0", fontSize: 13, resize: "vertical", outline: "none" },
  submitBtn:       { width: "100%", background: "#10b981", color: "#fff", border: "none", borderRadius: 10, padding: "14px", fontSize: 15, fontWeight: 600, transition: "all 0.15s" },
};

export default AcademicEvaluationPage;
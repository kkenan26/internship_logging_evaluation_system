import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../../Services/Api";

const STATUS_FLOW = { draft: "submitted", submitted: "reviewed", reviewed: "approved" };
const STATUS_COLORS = {
  draft: { color: "#94a3b8", bg: "#1e293b" },
  submitted: { color: "#3b82f6", bg: "#1e3a5f22" },
  reviewed: { color: "#f59e0b", bg: "#78350f22" },
  approved: { color: "#10b981", bg: "#0d281822" },
};

const LogbookDetailPage = () => {
  const { logId } = useParams();
  const navigate = useNavigate();
  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const fetchLog = async () => {
      try {
        const res = await API.get(`/logs/${logId}/`);
        setLog(res.data);
        setComment(res.data.supervisor_comment || "");
      } catch {
        setErrorMsg("Failed to load logbook entry.");
      } finally {
        setLoading(false);
      }
    };
    fetchLog();
  }, [logId]);

  const handleStatusChange = async (newStatus) => {
    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await API.patch(`/logs/${logId}/`, {
        status: newStatus,
        supervisor_comment: comment,
      });
      setLog(res.data);
      setSuccessMsg(`Log marked as "${newStatus}" successfully.`);
    } catch {
      setErrorMsg("Failed to update log status.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveComment = async () => {
    setSubmitting(true);
    setErrorMsg("");
    try {
      const res = await API.patch(`/logs/${logId}/`, { supervisor_comment: comment });
      setLog(res.data);
      setSuccessMsg("Comment saved.");
    } catch {
      setErrorMsg("Failed to save comment.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ ...styles.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#475569" }}>Loading log entry...</p>
      </div>
    );
  }

  if (!log) {
    return (
      <div style={{ ...styles.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#ef4444", fontSize: 16 }}>Log not found.</p>
          <button onClick={() => navigate(-1)} style={styles.backBtn}>← Go Back</button>
        </div>
      </div>
    );
  }

  const statusMeta = STATUS_COLORS[log.status] || STATUS_COLORS.draft;
  const nextStatus = STATUS_FLOW[log.status];

  const nextStatusLabel = {
    submitted: "Mark as Reviewed",
    reviewed: "Approve Log",
  };

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@600;700&display=swap');
        * { box-sizing: border-box; }
        .textarea:focus { outline: none; border-color: #6ee7b7 !important; }
        .approve-btn:hover:not(:disabled) { background: #059669 !important; }
        .review-btn:hover:not(:disabled) { background: #d97706 !important; }
      `}</style>

      {/* Back nav */}
      <button onClick={() => navigate(-1)} style={styles.backBtn}>← Back to Reviews</button>

      <div style={styles.layout}>
        {/* Main log content */}
        <div style={styles.mainCol}>
          <div style={styles.logHeader}>
            <div>
              <h1 style={styles.title}>Week {log.week_number} — Logbook Entry</h1>
              <p style={styles.metaLine}>
                Submitted by <strong style={{ color: "#f1f5f9" }}>{log.student_name || log.student}</strong>
                {log.submitted_at && (
                  <> on {new Date(log.submitted_at).toLocaleDateString()}</>
                )}
              </p>
            </div>
            <span style={{ ...styles.statusBadge, background: statusMeta.bg, color: statusMeta.color }}>
              {log.status?.charAt(0).toUpperCase() + log.status?.slice(1)}
            </span>
          </div>

          {/* Activities */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Activities Performed</h3>
            <div style={styles.contentBox}>{log.activities || "No activities recorded."}</div>
          </div>

          {/* Learning Outcomes */}
          {log.learning_outcomes && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Learning Outcomes</h3>
              <div style={styles.contentBox}>{log.learning_outcomes}</div>
            </div>
          )}

          {/* Challenges */}
          {log.challenges && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Challenges Faced</h3>
              <div style={styles.contentBox}>{log.challenges}</div>
            </div>
          )}

          {/* Plan Next Week */}
          {log.next_week_plan && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Plan for Next Week</h3>
              <div style={styles.contentBox}>{log.next_week_plan}</div>
            </div>
          )}
        </div>

        {/* Sidebar: Review Panel */}
        <div style={styles.sideCol}>
          {/* Status Timeline */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Workflow Status</h3>
            <div style={styles.timeline}>
              {["draft", "submitted", "reviewed", "approved"].map((s, i) => {
                const statuses = ["draft", "submitted", "reviewed", "approved"];
                const currentIdx = statuses.indexOf(log.status);
                const isComplete = i <= currentIdx;
                const isCurrent = i === currentIdx;
                const meta = STATUS_COLORS[s];
                return (
                  <div key={s} style={styles.timelineItem}>
                    <div style={{
                      ...styles.timelineDot,
                      background: isComplete ? meta.color : "#2a2d3e",
                      border: `2px solid ${isComplete ? meta.color : "#2a2d3e"}`,
                      boxShadow: isCurrent ? `0 0 0 4px ${meta.color}33` : "none",
                    }} />
                    <div style={styles.timelineText}>
                      <p style={{ color: isComplete ? meta.color : "#475569", fontSize: 13, fontWeight: isCurrent ? 600 : 400 }}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </p>
                    </div>
                    {i < 3 && <div style={{ ...styles.timelineLine, background: i < currentIdx ? "#6ee7b7" : "#2a2d3e" }} />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Supervisor Comment */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Supervisor Comment</h3>
            <textarea
              className="textarea"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={5}
              placeholder="Leave feedback for the student..."
              disabled={log.status === "approved"}
              style={{
                ...styles.textarea,
                opacity: log.status === "approved" ? 0.5 : 1,
              }}
            />
            {log.status !== "approved" && (
              <button
                onClick={handleSaveComment}
                disabled={submitting}
                style={styles.saveCommentBtn}
              >
                {submitting ? "Saving..." : "Save Comment"}
              </button>
            )}
          </div>

          {successMsg && <div style={styles.successAlert}>{successMsg}</div>}
          {errorMsg && <div style={styles.errorAlert}>{errorMsg}</div>}

          {/* Action Buttons */}
          {nextStatus && (
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Review Action</h3>
              <p style={{ fontSize: 12, color: "#475569", marginBottom: 16, lineHeight: 1.5 }}>
                {nextStatus === "reviewed"
                  ? "Mark this log as reviewed to indicate you have read and assessed the entry."
                  : "Approve this log to finalise the review. The student will be notified."}
              </p>
              <button
                onClick={() => handleStatusChange(nextStatus)}
                disabled={submitting}
                className={nextStatus === "approved" ? "approve-btn" : "review-btn"}
                style={{
                  ...styles.actionBtn,
                  background: nextStatus === "approved" ? "#10b981" : "#f59e0b",
                }}
              >
                {submitting ? "Processing..." : nextStatusLabel[nextStatus] || `Move to ${nextStatus}`}
              </button>
            </div>
          )}

          {log.status === "approved" && (
            <div style={styles.approvedBanner}>
              <span style={{ fontSize: 24 }}>✅</span>
              <div>
                <p style={{ color: "#10b981", fontWeight: 600, fontSize: 14 }}>Log Approved</p>
                <p style={{ color: "#475569", fontSize: 12, marginTop: 2 }}>No further action required.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: { minHeight: "100vh", background: "#0f1117", fontFamily: "'DM Sans', sans-serif", color: "#e2e8f0", padding: "24px 24px 48px" },
  backBtn: { background: "transparent", border: "none", color: "#64748b", fontSize: 13, cursor: "pointer", padding: "0 0 20px", display: "flex", alignItems: "center", gap: 6 },
  layout: { display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "start" },
  mainCol: {},
  sideCol: { display: "flex", flexDirection: "column", gap: 16 },
  logHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, paddingBottom: 24, borderBottom: "1px solid #2a2d3e" },
  title: { fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: "#f1f5f9" },
  metaLine: { fontSize: 13, color: "#64748b", marginTop: 6 },
  statusBadge: { padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, flexShrink: 0 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 12, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 },
  contentBox: { background: "#161824", border: "1px solid #2a2d3e", borderRadius: 10, padding: "18px 20px", fontSize: 14, color: "#cbd5e1", lineHeight: 1.7, whiteSpace: "pre-wrap" },
  card: { background: "#161824", border: "1px solid #2a2d3e", borderRadius: 12, padding: "20px" },
  cardTitle: { fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 600, color: "#f1f5f9", marginBottom: 16 },
  timeline: { display: "flex", flexDirection: "column", gap: 0 },
  timelineItem: { display: "flex", alignItems: "flex-start", gap: 12, position: "relative" },
  timelineDot: { width: 14, height: 14, borderRadius: "50%", flexShrink: 0, marginTop: 2, transition: "all 0.2s", zIndex: 1 },
  timelineText: { paddingBottom: 20 },
  timelineLine: { position: "absolute", left: 6, top: 16, width: 2, height: 24, borderRadius: 1 },
  textarea: { width: "100%", background: "#0f1117", border: "1px solid #2a2d3e", borderRadius: 8, padding: "12px 14px", color: "#e2e8f0", fontSize: 13, resize: "vertical", fontFamily: "'DM Sans', sans-serif", transition: "border-color 0.15s", marginBottom: 12 },
  saveCommentBtn: { width: "100%", background: "#1e2130", border: "1px solid #2a2d3e", color: "#94a3b8", borderRadius: 8, padding: "10px", fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  actionBtn: { width: "100%", border: "none", color: "#fff", borderRadius: 10, padding: "13px", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "background 0.15s", fontFamily: "'DM Sans', sans-serif" },
  successAlert: { background: "#0d2818", border: "1px solid #16a34a", color: "#4ade80", borderRadius: 8, padding: "10px 16px", fontSize: 13 },
  errorAlert: { background: "#2d1212", border: "1px solid #dc2626", color: "#f87171", borderRadius: 8, padding: "10px 16px", fontSize: 13 },
  approvedBanner: { background: "#0d281822", border: "1px solid #10b98133", borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 },
};

export default LogbookDetailPage;

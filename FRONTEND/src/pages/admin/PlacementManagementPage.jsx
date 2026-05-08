import { useState, useEffect } from "react";
import API from '../../Services/Api';

const PlacementManagementPage = () => {
  const [placements, setPlacements] = useState([]);
  const [students, setStudents] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [academics, setAcademics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editPlacement, setEditPlacement] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const emptyForm = {
    student: "",
    supervisor: "",
    academic_supervisor: "",
    company_name: "",
    company_address: "",
    start_date: "",
    end_date: "",
  };
  const [formData, setFormData] = useState(emptyForm);

  const fetchAll = async () => {
  setLoading(true);
  try {
    const [p, u] = await Promise.all([
      API.get("/placements/"),
      API.get("/users/"),
    ]);

    const placementList = Array.isArray(p.data) ? p.data : p.data.results ?? [];
    const allUsers      = Array.isArray(u.data) ? u.data : u.data.results ?? [];

    setPlacements(placementList);
    setStudents(allUsers.filter((u) => u.role === "student"));
    setSupervisors(allUsers.filter((u) => u.role === "workplace_supervisor"));
    setAcademics(allUsers.filter((u) => u.role === "academic_supervisor"));
  } catch (err) {
    console.error('fetchAll failed:', err.response?.status, err.message);
    setPlacements([]);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => { fetchAll(); }, []);

  const getStatusMeta = (p) => {
    const now = new Date();
    const start = new Date(p.start_date);
    const end = new Date(p.end_date);
    if (now < start) return { label: "Upcoming", color: "#3b82f6", bg: "#1e3a5f22" };
    if (now > end) return { label: "Completed", color: "#10b981", bg: "#0d281822" };
    return { label: "Active", color: "#f59e0b", bg: "#78350f22" };
  };

  const filtered = placements.filter((p) => {
    const q = searchTerm.toLowerCase();
    return (
      p.student_name?.toLowerCase().includes(q) ||
      p.company_name?.toLowerCase().includes(q) ||
      p.supervisor_name?.toLowerCase().includes(q)
    );
  });

  const openCreate = () => {
    setEditPlacement(null);
    setFormData(emptyForm);
    setErrorMsg("");
    setSuccessMsg("");
    setShowModal(true);
  };

  const openEdit = (p) => {
    setEditPlacement(p);
    setFormData({
      student: p.student || "",
      supervisor: p.supervisor || "",
      academic_supervisor: p.academic_supervisor || "",
      company_name: p.company_name || "",
      company_address: p.company_address || "",
      start_date: p.start_date?.split("T")[0] || "",
      end_date: p.end_date?.split("T")[0] || "",
    });
    setErrorMsg("");
    setSuccessMsg("");
    setShowModal(true);
  };

  const validateDates = () => {
    if (formData.start_date && formData.end_date) {
      if (new Date(formData.start_date) >= new Date(formData.end_date)) {
        setErrorMsg("End date must be after start date.");
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateDates()) return;
    setSubmitting(true);
    setErrorMsg("");
    try {
      if (editPlacement) {
        await API.put(`/placements/${editPlacement.id}/`, formData);
        setSuccessMsg("Placement updated.");
      } else {
        await API.post("/placements/", formData);
        setSuccessMsg("Placement created.");
      }
      setShowModal(false);
      fetchAll();
    } catch (err) {
      const data = err.response?.data;
      setErrorMsg(
        typeof data === "object"
          ? Object.values(data).flat().join(" ")
          : "Operation failed."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await API.delete(`/placements/${id}/`);
      setConfirmDelete(null);
      fetchAll();
    } catch {
      setErrorMsg("Delete failed.");
    }
  };

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@600;700&display=swap');
        * { box-sizing: border-box; }
        .form-input:focus { outline: none; border-color: #6ee7b7 !important; }
        .search-input:focus { outline: none; border-color: #6ee7b7 !important; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); display: flex; align-items: center; justify-content: center; z-index: 100; backdrop-filter: blur(4px); overflow-y: auto; padding: 24px; }
        tr:hover td { background: #1a1d2e; }
      `}</style>

      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Placement Management</h1>
          <p style={styles.subtitle}>Assign students to companies and supervisors</p>
        </div>
        <button onClick={openCreate} style={styles.createBtn}>+ New Placement</button>
      </div>

      {/* Summary Cards */}
      <div style={styles.summaryRow}>
        {[
          { label: "Total Placements", value: placements.length, color: "#94a3b8" },
          { label: "Active Now", value: placements.filter((p) => getStatusMeta(p).label === "Active").length, color: "#f59e0b" },
          { label: "Upcoming", value: placements.filter((p) => getStatusMeta(p).label === "Upcoming").length, color: "#3b82f6" },
          { label: "Completed", value: placements.filter((p) => getStatusMeta(p).label === "Completed").length, color: "#10b981" },
        ].map(({ label, value, color }) => (
          <div key={label} style={styles.summaryCard}>
            <p style={{ ...styles.summaryCount, color }}>{value}</p>
            <p style={styles.summaryLabel}>{label}</p>
          </div>
        ))}
      </div>

      <input
        type="text"
        placeholder="Search by student, company, or supervisor..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="search-input"
        style={styles.searchInput}
      />

      {successMsg && <div style={styles.successAlert}>{successMsg}</div>}
      {errorMsg && !showModal && <div style={styles.errorAlert}>{errorMsg}</div>}

      {/* Table */}
      <div style={styles.tableWrap}>
        {loading ? (
          <div style={styles.loadingBox}>Loading placements...</div>
        ) : filtered.length === 0 ? (
          <div style={styles.loadingBox}>No placements found.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr style={styles.thead}>
                {["Student", "Company", "Supervisor", "Academic Supervisor", "Period", "Status", "Actions"].map((h) => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const status = getStatusMeta(p);
                return (
                  <tr key={p.id}>
                    <td style={styles.td}>
                      <span style={styles.boldCell}>{p.student_name || p.student}</span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.boldCell}>{p.company_name}</div>
                      <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{p.company_address}</div>
                    </td>
                    <td style={{ ...styles.td, color: "#94a3b8" }}>{p.supervisor_name || p.supervisor || "—"}</td>
                    <td style={{ ...styles.td, color: "#94a3b8" }}>{p.academic_supervisor_name || p.academic_supervisor || "—"}</td>
                    <td style={{ ...styles.td, color: "#64748b", fontSize: 12 }}>
                      {p.start_date ? new Date(p.start_date).toLocaleDateString() : "—"}
                      {" → "}
                      {p.end_date ? new Date(p.end_date).toLocaleDateString() : "—"}
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.statusBadge, background: status.bg, color: status.color }}>
                        {status.label}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actions}>
                        <button onClick={() => openEdit(p)} style={styles.editBtn}>Edit</button>
                        <button onClick={() => setConfirmDelete(p)} style={styles.deleteBtn}>Del</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>{editPlacement ? "Edit Placement" : "New Placement"}</h2>
            {errorMsg && <div style={styles.errorAlert}>{errorMsg}</div>}
            <form onSubmit={handleSubmit} style={styles.modalForm}>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Student *</label>
                  <select value={formData.student} onChange={(e) => setFormData((p) => ({ ...p, student: e.target.value }))} required className="form-input" style={styles.formInput}>
                    <option value="">Select student</option>
                    {students.map((s) => <option key={s.id} value={s.id}>{s.username}</option>)}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Workplace Supervisor</label>
                  <select value={formData.supervisor} onChange={(e) => setFormData((p) => ({ ...p, supervisor: e.target.value }))} className="form-input" style={styles.formInput}>
                    <option value="">Select supervisor</option>
                    {supervisors.map((s) => <option key={s.id} value={s.id}>{s.username}</option>)}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Academic Supervisor</label>
                  <select value={formData.academic_supervisor} onChange={(e) => setFormData((p) => ({ ...p, academic_supervisor: e.target.value }))} className="form-input" style={styles.formInput}>
                    <option value="">Select academic</option>
                    {academics.map((a) => <option key={a.id} value={a.id}>{a.username}</option>)}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Company Name *</label>
                  <input type="text" value={formData.company_name} onChange={(e) => setFormData((p) => ({ ...p, company_name: e.target.value }))} required className="form-input" style={styles.formInput} placeholder="e.g. Stanbic Bank Uganda" />
                </div>
                <div style={{ ...styles.formGroup, gridColumn: "1 / -1" }}>
                  <label style={styles.formLabel}>Company Address</label>
                  <input type="text" value={formData.company_address} onChange={(e) => setFormData((p) => ({ ...p, company_address: e.target.value }))} className="form-input" style={styles.formInput} placeholder="e.g. Kampala, Uganda" />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Start Date *</label>
                  <input type="date" value={formData.start_date} onChange={(e) => setFormData((p) => ({ ...p, start_date: e.target.value }))} required className="form-input" style={styles.formInput} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>End Date *</label>
                  <input type="date" value={formData.end_date} onChange={(e) => setFormData((p) => ({ ...p, end_date: e.target.value }))} required className="form-input" style={styles.formInput} />
                </div>
              </div>
              <div style={styles.modalActions}>
                <button type="button" onClick={() => setShowModal(false)} style={styles.cancelBtn}>Cancel</button>
                <button type="submit" disabled={submitting} style={styles.saveBtn}>
                  {submitting ? "Saving..." : editPlacement ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div style={{ ...styles.modal, maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ ...styles.modalTitle, color: "#ef4444" }}>Remove Placement?</h2>
            <p style={styles.confirmText}>
              This will remove <strong style={{ color: "#f1f5f9" }}>{confirmDelete.student_name || "this student"}</strong>'s
              placement at <strong style={{ color: "#f1f5f9" }}>{confirmDelete.company_name}</strong>. Are you sure?
            </p>
            <div style={styles.modalActions}>
              <button onClick={() => setConfirmDelete(null)} style={styles.cancelBtn}>Cancel</button>
              <button onClick={() => handleDelete(confirmDelete.id)} style={styles.dangerBtn}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  page: { minHeight: "100vh", background: "#0f1117", fontFamily: "'DM Sans', sans-serif", color: "#e2e8f0", padding: "32px 24px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 },
  title: { fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 700, color: "#f1f5f9" },
  subtitle: { fontSize: 14, color: "#64748b", marginTop: 4 },
  createBtn: { background: "#10b981", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 600, cursor: "pointer", fontSize: 14 },
  summaryRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 },
  summaryCard: { background: "#161824", border: "1px solid #2a2d3e", borderRadius: 10, padding: "20px 24px" },
  summaryCount: { fontFamily: "'Syne', sans-serif", fontSize: 32, fontWeight: 700 },
  summaryLabel: { fontSize: 12, color: "#64748b", marginTop: 4 },
  searchInput: { width: "100%", background: "#161824", border: "1px solid #2a2d3e", borderRadius: 8, padding: "10px 16px", color: "#e2e8f0", fontSize: 13, marginBottom: 20, transition: "border-color 0.15s" },
  successAlert: { background: "#0d2818", border: "1px solid #16a34a", color: "#4ade80", borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 13 },
  errorAlert: { background: "#2d1212", border: "1px solid #dc2626", color: "#f87171", borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 13 },
  tableWrap: { background: "#161824", border: "1px solid #2a2d3e", borderRadius: 12, overflow: "auto" },
  loadingBox: { padding: 48, textAlign: "center", color: "#475569" },
  table: { width: "100%", borderCollapse: "collapse" },
  thead: { background: "#0f1117" },
  th: { padding: "13px 18px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid #2a2d3e", whiteSpace: "nowrap" },
  td: { padding: "14px 18px", fontSize: 13, color: "#cbd5e1", borderBottom: "1px solid #1e2130", transition: "background 0.1s" },
  boldCell: { fontWeight: 500, color: "#f1f5f9" },
  statusBadge: { padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 },
  actions: { display: "flex", gap: 8 },
  editBtn: { background: "transparent", border: "1px solid #2a2d3e", color: "#94a3b8", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12 },
  deleteBtn: { background: "transparent", border: "1px solid #7f1d1d44", color: "#ef4444", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 12 },
  modal: { background: "#161824", border: "1px solid #2a2d3e", borderRadius: 16, padding: 32, width: "100%", maxWidth: 560 },
  modalTitle: { fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: "#f1f5f9", marginBottom: 24 },
  modalForm: {},
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 },
  formGroup: { display: "flex", flexDirection: "column", gap: 6 },
  formLabel: { fontSize: 12, fontWeight: 500, color: "#94a3b8" },
  formInput: { background: "#0f1117", border: "1px solid #2a2d3e", borderRadius: 8, padding: "10px 14px", color: "#f1f5f9", fontSize: 13, fontFamily: "'DM Sans', sans-serif", transition: "border-color 0.15s" },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: 12 },
  cancelBtn: { background: "transparent", border: "1px solid #2a2d3e", color: "#94a3b8", borderRadius: 8, padding: "10px 20px", cursor: "pointer", fontSize: 14 },
  saveBtn: { background: "#10b981", color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontWeight: 600, cursor: "pointer", fontSize: 14 },
  dangerBtn: { background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 600, cursor: "pointer", fontSize: 14 },
  confirmText: { color: "#94a3b8", fontSize: 14, lineHeight: 1.6, marginBottom: 24 },
};

export default PlacementManagementPage;

import { useState, useEffect } from "react";
import API from "../../Services/Api";

const ROLES = ["student", "supervisor", "academic", "admin"];

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [formData, setFormData] = useState({ username: "", email: "", role: "student", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await API.get("/users/");
      setUsers(res.data);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.username?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "all" || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const openCreate = () => {
    setEditUser(null);
    setFormData({ username: "", email: "", role: "student", password: "" });
    setShowModal(true);
    setErrorMsg("");
    setSuccessMsg("");
  };

  const openEdit = (user) => {
    setEditUser(user);
    setFormData({ username: user.username, email: user.email, role: user.role, password: "" });
    setShowModal(true);
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");
    try {
      if (editUser) {
        const payload = { username: formData.username, email: formData.email, role: formData.role };
        if (formData.password) payload.password = formData.password;
        await API.patch(`/users/${editUser.id}/`, payload);
        setSuccessMsg("User updated.");
      } else {
        await API.post("/users/", formData);
        setSuccessMsg("User created.");
      }
      setShowModal(false);
      fetchUsers();
    } catch {
      setErrorMsg("Operation failed. Check inputs.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (userId) => {
    try {
      await API.delete(`/users/${userId}/`);
      setConfirmDelete(null);
      fetchUsers();
    } catch {
      setErrorMsg("Delete failed.");
    }
  };

  const roleMeta = {
    student: { color: "#3b82f6", bg: "#1e3a5f22", label: "Student" },
    supervisor: { color: "#f59e0b", bg: "#78350f22", label: "Supervisor" },
    academic: { color: "#8b5cf6", bg: "#4c1d9522", label: "Academic" },
    admin: { color: "#ef4444", bg: "#7f1d1d22", label: "Admin" },
  };

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@600;700&display=swap');
        * { box-sizing: border-box; }
        .row-action:hover { color: #e2e8f0 !important; }
        .search-input:focus { outline: none; border-color: #6ee7b7 !important; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 100; backdrop-filter: blur(4px); }
        .form-input:focus { outline: none; border-color: #6ee7b7 !important; }
        .btn-primary:hover { background: #059669 !important; }
        .btn-danger:hover { background: #b91c1c !important; }
      `}</style>

      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>User Management</h1>
          <p style={styles.subtitle}>{users.length} total users across all roles</p>
        </div>
        <button onClick={openCreate} style={styles.createBtn} className="btn-primary">
          + New User
        </button>
      </div>

      {/* Stats Row */}
      <div style={styles.statsRow}>
        {Object.entries(roleMeta).map(([role, meta]) => {
          const count = users.filter((u) => u.role === role).length;
          return (
            <div key={role} style={{ ...styles.statCard, borderTop: `3px solid ${meta.color}` }}>
              <p style={{ ...styles.statCount, color: meta.color }}>{count}</p>
              <p style={styles.statLabel}>{meta.label}s</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
          style={styles.searchInput}
        />
        <div style={styles.roleTabs}>
          {["all", ...ROLES].map((r) => (
            <button
              key={r}
              onClick={() => setFilterRole(r)}
              style={{ ...styles.roleTab, ...(filterRole === r ? styles.roleTabActive : {}) }}
            >
              {r === "all" ? "All" : roleMeta[r]?.label}
            </button>
          ))}
        </div>
      </div>

      {successMsg && <div style={styles.successAlert}>{successMsg}</div>}
      {errorMsg && <div style={styles.errorAlert}>{errorMsg}</div>}

      {/* Table */}
      <div style={styles.tableWrap}>
        {loading ? (
          <div style={styles.loadingBox}>Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <div style={styles.loadingBox}>No users found.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr style={styles.thead}>
                <th style={styles.th}>User</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Role</th>
                <th style={styles.th}>Joined</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const meta = roleMeta[user.role] || roleMeta.student;
                return (
                  <tr key={user.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={styles.userCell}>
                        <div style={{ ...styles.avatarSm, background: meta.color }}>
                          {user.username?.[0]?.toUpperCase()}
                        </div>
                        <span style={styles.userName}>{user.username}</span>
                      </div>
                    </td>
                    <td style={{ ...styles.td, color: "#64748b" }}>{user.email}</td>
                    <td style={styles.td}>
                      <span style={{ ...styles.roleBadge, background: meta.bg, color: meta.color }}>
                        {meta.label}
                      </span>
                    </td>
                    <td style={{ ...styles.td, color: "#64748b" }}>
                      {user.date_joined ? new Date(user.date_joined).toLocaleDateString() : "—"}
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actions}>
                        <button className="row-action" onClick={() => openEdit(user)} style={styles.editBtn}>
                          Edit
                        </button>
                        <button className="row-action" onClick={() => setConfirmDelete(user)} style={styles.deleteBtn}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>{editUser ? "Edit User" : "Create New User"}</h2>
            {errorMsg && <div style={styles.errorAlert}>{errorMsg}</div>}
            <form onSubmit={handleSubmit} style={styles.modalForm}>
              {[
                { name: "username", label: "Username", type: "text" },
                { name: "email", label: "Email", type: "email" },
              ].map(({ name, label, type }) => (
                <div key={name} style={styles.formGroup}>
                  <label style={styles.formLabel}>{label}</label>
                  <input
                    type={type}
                    value={formData[name]}
                    onChange={(e) => setFormData((p) => ({ ...p, [name]: e.target.value }))}
                    required
                    className="form-input"
                    style={styles.formInput}
                  />
                </div>
              ))}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData((p) => ({ ...p, role: e.target.value }))}
                  className="form-input"
                  style={styles.formInput}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{roleMeta[r]?.label || r}</option>
                  ))}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>{editUser ? "New Password (leave blank to keep)" : "Password"}</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                  required={!editUser}
                  className="form-input"
                  style={styles.formInput}
                />
              </div>
              <div style={styles.modalActions}>
                <button type="button" onClick={() => setShowModal(false)} style={styles.cancelBtn}>Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary" style={styles.saveBtn}>
                  {submitting ? "Saving..." : editUser ? "Update" : "Create"}
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
            <h2 style={{ ...styles.modalTitle, color: "#ef4444" }}>Delete User?</h2>
            <p style={styles.confirmText}>
              Are you sure you want to delete <strong style={{ color: "#f1f5f9" }}>{confirmDelete.username}</strong>?
              This action cannot be undone.
            </p>
            <div style={styles.modalActions}>
              <button onClick={() => setConfirmDelete(null)} style={styles.cancelBtn}>Cancel</button>
              <button onClick={() => handleDelete(confirmDelete.id)} className="btn-danger" style={styles.dangerBtn}>
                Delete
              </button>
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
  createBtn: { background: "#10b981", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 600, cursor: "pointer", fontSize: 14, transition: "background 0.15s" },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 },
  statCard: { background: "#161824", border: "1px solid #2a2d3e", borderRadius: 10, padding: "20px 24px" },
  statCount: { fontFamily: "'Syne', sans-serif", fontSize: 32, fontWeight: 700 },
  statLabel: { fontSize: 13, color: "#64748b", marginTop: 4 },
  filters: { display: "flex", gap: 16, alignItems: "center", marginBottom: 20, flexWrap: "wrap" },
  searchInput: { flex: 1, minWidth: 200, background: "#161824", border: "1px solid #2a2d3e", borderRadius: 8, padding: "10px 14px", color: "#e2e8f0", fontSize: 13, transition: "border-color 0.15s" },
  roleTabs: { display: "flex", gap: 8 },
  roleTab: { background: "transparent", border: "1px solid #2a2d3e", color: "#64748b", borderRadius: 6, padding: "7px 14px", cursor: "pointer", fontSize: 13, transition: "all 0.15s" },
  roleTabActive: { background: "#1e2130", borderColor: "#6ee7b7", color: "#6ee7b7" },
  successAlert: { background: "#0d2818", border: "1px solid #16a34a", color: "#4ade80", borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 13 },
  errorAlert: { background: "#2d1212", border: "1px solid #dc2626", color: "#f87171", borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 13 },
  tableWrap: { background: "#161824", border: "1px solid #2a2d3e", borderRadius: 12, overflow: "hidden" },
  loadingBox: { padding: 48, textAlign: "center", color: "#475569" },
  table: { width: "100%", borderCollapse: "collapse" },
  thead: { background: "#0f1117" },
  th: { padding: "14px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid #2a2d3e" },
  tr: { borderBottom: "1px solid #1e2130", transition: "background 0.1s" },
  td: { padding: "14px 20px", fontSize: 13, color: "#cbd5e1" },
  userCell: { display: "flex", alignItems: "center", gap: 10 },
  avatarSm: { width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 },
  userName: { fontWeight: 500, color: "#f1f5f9" },
  roleBadge: { padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 },
  actions: { display: "flex", gap: 8 },
  editBtn: { background: "transparent", border: "1px solid #2a2d3e", color: "#94a3b8", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, transition: "color 0.15s" },
  deleteBtn: { background: "transparent", border: "1px solid #7f1d1d44", color: "#ef4444", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, transition: "color 0.15s" },
  modal: { background: "#161824", border: "1px solid #2a2d3e", borderRadius: 16, padding: 32, width: "100%", maxWidth: 460 },
  modalTitle: { fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: "#f1f5f9", marginBottom: 24 },
  modalForm: { display: "flex", flexDirection: "column", gap: 16 },
  formGroup: { display: "flex", flexDirection: "column", gap: 6 },
  formLabel: { fontSize: 12, fontWeight: 500, color: "#94a3b8" },
  formInput: { background: "#0f1117", border: "1px solid #2a2d3e", borderRadius: 8, padding: "10px 14px", color: "#f1f5f9", fontSize: 14, transition: "border-color 0.15s", fontFamily: "'DM Sans', sans-serif" },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 8 },
  cancelBtn: { background: "transparent", border: "1px solid #2a2d3e", color: "#94a3b8", borderRadius: 8, padding: "10px 20px", cursor: "pointer", fontSize: 14 },
  saveBtn: { background: "#10b981", color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontWeight: 600, cursor: "pointer", fontSize: 14, transition: "background 0.15s" },
  dangerBtn: { background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 600, cursor: "pointer", fontSize: 14, transition: "background 0.15s" },
  confirmText: { color: "#94a3b8", fontSize: 14, lineHeight: 1.6, marginBottom: 24 },
};

export default UserManagementPage;

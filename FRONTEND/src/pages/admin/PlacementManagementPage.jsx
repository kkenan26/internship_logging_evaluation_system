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
  const [formData, setFormData] = useState({ student: "", workplace_supervisor: "", academic_supervisor: "", company_name: "", company_address: "", start_date: "", end_date: "" });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [p, u] = await Promise.all([
        API.get("/placements/admin/"),
        API.get("/admin/users/"),
      ]);
      setPlacements(Array.isArray(p.data) ? p.data : p.data.results || []);
      const users = Array.isArray(u.data) ? u.data : u.data.results || [];
      setStudents(users.filter(u => u.role === "student"));
      setSupervisors(users.filter(u => u.role === "workplace_supervisor"));
      setAcademics(users.filter(u => u.role === "academic_supervisor"));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const updateStatus = async (id, newStatus) => {
    try {
      await API.patch(`/placements/${id}/status/`, { status: newStatus });
      setMsg(`Placement status updated to ${newStatus}.`);
      fetchAll();
    } catch (err) {
      setMsg("Status update failed.");
    }
  };

  const openCreate = () => {
    setEditPlacement(null);
    setFormData({ student: "", workplace_supervisor: "", academic_supervisor: "", company_name: "", company_address: "", start_date: "", end_date: "" });
    setMsg("");
    setShowModal(true);
  };

  const openEdit = (p) => {
    setEditPlacement(p);
    setFormData({
      student: p.student || "",
      workplace_supervisor: p.workplace_supervisor || "",
      academic_supervisor: p.academic_supervisor || "",
      company_name: p.company_name || "",
      company_address: p.company_address || "",
      start_date: p.start_date?.split("T")[0] || "",
      end_date: p.end_date?.split("T")[0] || "",
    });
    setMsg("");
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editPlacement) {
        await API.put(`/placements/${editPlacement.id}/`, formData);
        setMsg("Placement updated.");
      } else {
        await API.post("/placements/", formData);
        setMsg("Placement created.");
      }
      setShowModal(false);
      fetchAll();
    } catch (err) {
      const data = err.response?.data;
      setMsg(data ? JSON.stringify(data) : "Operation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete?")) return;
    try {
      await API.delete(`/placements/${id}/`);
      fetchAll();
    } catch {
      setMsg("Delete failed.");
    }
  };

  if (loading) return <p>Loading placements...</p>;

  return (
    <div>
      <h1>Placement Management</h1>
      <button onClick={openCreate} style={{ background: '#eee', border: '1px solid #ddd', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', marginBottom: '20px' }}>+ New Placement</button>
      {msg && <div style={{ background: '#ffe0e0', padding: '10px', marginBottom: '16px' }}>{msg}</div>}
      <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Student</th>
            <th>Company</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {placements.map(p => (
            <tr key={p.id}>
              <td>{p.student_name || p.student}</td>
              <td>{p.company_name}</td>
              <td>{p.status}</td>
              <td>
                <button onClick={() => openEdit(p)} style={{ marginRight: '5px' }}>Edit</button>
                {p.status === 'pending' && (
                  <button onClick={() => updateStatus(p.id, 'active')} style={{ marginRight: '5px' }}>Approve</button>
                )}
                {p.status === 'active' && (
                  <button onClick={() => updateStatus(p.id, 'completed')} style={{ marginRight: '5px' }}>Complete</button>
                )}
                <button onClick={() => handleDelete(p.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', width: '500px' }}>
            <h2>{editPlacement ? "Edit Placement" : "New Placement"}</h2>
            <form onSubmit={handleSubmit}>
              <div><label>Student *</label><select value={formData.student} onChange={e => setFormData({...formData, student: e.target.value})} required><option value="">Select</option>{students.map(s => <option key={s.id} value={s.id}>{s.username}</option>)}</select></div>
              <div><label>Workplace Supervisor</label><select value={formData.workplace_supervisor} onChange={e => setFormData({...formData, workplace_supervisor: e.target.value})}>  <option value="">Select</option>  {supervisors.map(s => <option key={s.id} value={s.id}>{s.username}</option>)}</select></div>
              <div><label>Academic Supervisor</label><select value={formData.academic_supervisor} onChange={e => setFormData({...formData, academic_supervisor: e.target.value})}><option value="">Select</option>{academics.map(a => <option key={a.id} value={a.id}>{a.username}</option>)}</select></div>
              <div><label>Company Name *</label><input type="text" value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} required /></div>
              <div><label>Company Address</label><input type="text" value={formData.company_address} onChange={e => setFormData({...formData, company_address: e.target.value})} /></div>
              <div><label>Start Date *</label><input type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} required /></div>
              <div><label>End Date *</label><input type="date" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} required /></div>
              <button type="submit" disabled={submitting} style={{ marginRight: '8px' }}>{submitting ? "Saving..." : editPlacement ? "Update" : "Create"}</button>
              <button type="button" onClick={() => setShowModal(false)}>Cancel</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlacementManagementPage;
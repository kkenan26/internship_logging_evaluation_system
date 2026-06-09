import { useState, useEffect } from "react";
import API from '../../Services/Api';

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ username: "", email: "", role: "student", password: "" });
  const [msg, setMsg] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await API.get("/admin/users/");
      setUsers(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editUser) {
        const payload = { username: form.username, email: form.email, role: form.role };
        if (form.password) payload.password = form.password;
        await API.patch(`/users/${editUser.id}/`, payload);
        setMsg("User updated.");
      } else {
        await API.post("/users/", form);
        setMsg("User created.");
      }
      setShowModal(false);
      fetchUsers();
    } catch {
      setMsg("Operation failed.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete?")) return;
    try {
      await API.delete(`/users/${id}/`);
      fetchUsers();
    } catch {
      setMsg("Delete failed.");
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h1>User Management</h1>
      <button onClick={() => { setEditUser(null); setForm({ username: "", email: "", role: "student", password: "" }); setShowModal(true); }} style={{ background: '#333', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', marginBottom: '20px' }}>+ New User</button>
      {msg && <div style={{ background: '#ffe0e0', padding: '10px', marginBottom: '16px' }}>{msg}</div>}
      <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr><th>Username</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td>{u.username}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td><button onClick={() => { setEditUser(u); setForm({ username: u.username, email: u.email, role: u.role, password: "" }); setShowModal(true); }}>Edit</button> <button onClick={() => handleDelete(u.id)}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', width: '400px' }}>
            <h2>{editUser ? "Edit User" : "Create User"}</h2>
            <form onSubmit={handleSubmit}>
              <div><label>Username</label><input type="text" value={form.username} onChange={e => setForm({...form, username: e.target.value})} required /></div>
              <div><label>Email</label><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required /></div>
              <div><label>Role</label><select value={form.role} onChange={e => setForm({...form, role: e.target.value})}><option value="student">Student</option><option value="workplace_supervisor">Workplace Supervisor</option><option value="academic_supervisor">Academic Supervisor</option><option value="admin">Admin</option></select></div>
              <div><label>{editUser ? "New Password (leave blank to keep)" : "Password"}</label><input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required={!editUser} /></div>
              <button type="submit">Save</button>
              <button type="button" onClick={() => setShowModal(false)}>Cancel</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;
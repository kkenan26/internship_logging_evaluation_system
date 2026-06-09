import { useState, useEffect } from 'react';
import API from '../../Services/Api';

export default function LogbookPage() {
  const [logs, setLogs] = useState([]);
  const [placement, setPlacement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [form, setForm] = useState({ week_number: '', activities: '', skills_learned: '', challenges: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const placementRes = await API.get('/placements/');
      const placements = Array.isArray(placementRes.data) ? placementRes.data : placementRes.data.results || [];
      const activePlacement = placements.find(p => p.status === 'active') || placements[0] || null;
      setPlacement(activePlacement);
      const logsRes = await API.get('/logs/');
      setLogs(Array.isArray(logsRes.data) ? logsRes.data : logsRes.data.results || []);
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleNewLog = () => {
    if (!placement) {
      setError('You need an active placement before adding logs.');
      return;
    }
    setEditingLog(null);
    setForm({ week_number: '', activities: '', skills_learned: '', challenges: '' });
    setError('');
    setShowForm(true);
  };

  const handleEdit = (log) => {
    setEditingLog(log);
    setForm({
      week_number: log.week_number || '',
      activities: log.activities || '',
      skills_learned: log.skills_learned || '',
      challenges: log.challenges || '',
    });
    setError('');
    setShowForm(true);
  };

  const handleSubmit = async (e, submitNow = false) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      placement: placement.id,
      week_number: parseInt(form.week_number, 10),
      activities: form.activities,
      skills_learned: form.skills_learned,
      challenges: form.challenges,
      status: submitNow ? 'submitted' : 'draft',
    };
    try {
      if (editingLog) {
        const res = await API.put(`/logs/${editingLog.id}/`, payload);
        setLogs(logs.map(l => l.id === editingLog.id ? res.data : l));
      } else {
        const res = await API.post('/logs/', payload);
        setLogs([res.data, ...logs]);
      }
      setShowForm(false);
      setForm({ week_number: '', activities: '', skills_learned: '', challenges: '' });
      setEditingLog(null);
    } catch (err) {
      const data = err.response?.data;
      setError(data ? JSON.stringify(data) : 'Failed to save log');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setForm({ week_number: '', activities: '', skills_learned: '', challenges: '' });
    setEditingLog(null);
    setError('');
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'approved': return { background: '#d0f0d0', color: '#2e7d32' };
      case 'reviewed': return { background: '#fff0d0', color: '#ed6c02' };
      case 'submitted': return { background: '#d0e0ff', color: '#1565c0' };
      default: return { background: '#f0f0f0', color: '#616161' };
    }
  };

  if (loading) return <p style={{ padding: '32px', color: '#666' }}>Loading logs...</p>;

  return (
    <div>
      <h1>Weekly Logbook</h1>
      {!placement && (
        <div style={{ background: '#fff0d0', padding: '12px', borderRadius: '4px', marginBottom: '16px' }}>
          You need an active placement before adding log entries. Contact your administrator.
        </div>
      )}
      {placement && !showForm && (
        <button onClick={handleNewLog} style={{ background: '#333', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', marginBottom: '20px', marginLeft: '10px' }}>
          New Log Entry
        </button>
      )}
      {error && !showForm && <div style={{ background: '#ffe0e0', color: '#c62828', padding: '10px', borderRadius: '4px', marginBottom: '16px' }}>{error}</div>}
      {showForm && (
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '4px', padding: '24px', marginBottom: '24px' }}>
          <h3>{editingLog ? `Edit Week ${editingLog.week_number}` : 'New Weekly Log'}</h3>
          {error && <div style={{ background: '#ffe0e0', color: '#c62828', padding: '10px', borderRadius: '4px', marginBottom: '16px' }}>{error}</div>}
          <form onSubmit={(e) => handleSubmit(e, false)}>
            <div style={{ marginBottom: '16px' }}><label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Week Number</label>
            <input type="number" name="week_number" value={form.week_number} onChange={handleChange} min="1" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} required /></div>
            <div style={{ marginBottom: '16px' }}><label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Activities</label>
            <textarea name="activities" value={form.activities} onChange={handleChange} rows={4} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} required /></div>
            <div style={{ marginBottom: '16px' }}><label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Skills Learned</label>
            <textarea name="skills_learned" value={form.skills_learned} onChange={handleChange} rows={2} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} /></div>
            <div style={{ marginBottom: '16px' }}><label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Challenges</label>
            <textarea name="challenges" value={form.challenges} onChange={handleChange} rows={2} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} /></div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-start' }}>
              <button type="submit" disabled={saving} style={{ background: '#fff', color: '#333', border: '1px solid #ddd', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>{saving ? 'Saving...' : 'Save as Draft'}</button>
              <button type="button" onClick={(e) => handleSubmit(e, true)} disabled={saving} style={{ background: '#1976d2', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>{saving ? 'Submitting...' : 'Submit Log'}</button>
              <button type="button" onClick={handleCancel} disabled={saving} style={{ background: '#fff', color: '#333', border: '1px solid #ddd', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}
      <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '4px', overflow: 'auto' }}>
        {logs.length === 0 ? (
          <p style={{ padding: '32px', textAlign: 'center', color: '#666' }}>No log entries yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#f5f5f5', borderBottom: '1px solid #ddd' }}>
              <th style={{ padding: '12px', textAlign: 'left' }}>Week</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Activities</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Submitted</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Actions</th>
            </tr></thead>
            <tbody>
              {logs.map(log => {
                const style = getStatusStyle(log.status);
                return (
                  <tr key={log.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px' }}>Week {log.week_number}</td>
                    <td style={{ padding: '12px', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.activities}</td>
                    <td style={{ padding: '12px' }}><span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', ...style }}>{log.status}</span></td>
                    <td style={{ padding: '12px', color: '#666' }}>{log.submitted_at ? new Date(log.submitted_at).toLocaleDateString() : '—'}</td>
                    <td style={{ padding: '12px' }}>
                      <button onClick={() => handleEdit(log)} style={{ background: '#fff', border: '1px solid #ddd', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer' }}>
                        {log.status === 'draft' ? 'Edit' : 'View'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
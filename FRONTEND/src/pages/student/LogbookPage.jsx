import { useState, useEffect } from 'react';
import API from '../../Services/Api';

const STATUS_COLORS = {
  approved:  { background: '#dcfce7', color: '#16a34a' },
  reviewed:  { background: '#fef9c3', color: '#ca8a04' },
  submitted: { background: '#dbeafe', color: '#2563eb' },
  draft:     { background: '#f1f5f9', color: '#64748b' },
};

const EMPTY_FORM = {
  title:          '',
  activities:     '',
  challenges:     '',
  skills_learned: '',
  week_number:    '',
};

export default function LogbookPage() {
  const [logs, setLogs]             = useState([]);
  const [placement, setPlacement]   = useState(null);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');

  useEffect(() => {
    fetchPlacementThenLogs();
  }, []);

  const fetchPlacementThenLogs = async () => {
    try {
      setLoading(true);

      // Auto-fetch the student's placement
      const placementRes = await API.get('/placements/');
      const placements = Array.isArray(placementRes.data)
        ? placementRes.data
        : placementRes.data.results || [];

      const activePlacement =
        placements.find((p) => p.status === 'active') || placements[0] || null;
      setPlacement(activePlacement);

      // Fetch logs
      const logsRes = await API.get('/logs/');
      setLogs(Array.isArray(logsRes.data) ? logsRes.data : logsRes.data.results || []);

    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load data. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const handleNewLog = () => {
    if (!placement) {
      setError('You need an active placement before you can add log entries. Contact your administrator.');
      return;
    }
    setEditingLog(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowForm(true);
  };

  const handleEdit = (log) => {
    setEditingLog(log);
    setForm({
      title:          log.title          || '',
      activities:     log.activities     || '',
      challenges:     log.challenges     || '',
      skills_learned: log.skills_learned || '',
      week_number:    log.week_number    || '',
    });
    setError('');
    setShowForm(true);
  };

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e, submitAsSubmitted = false) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const payload = {
      placement:      placement.id,  // auto-attached silently
      week_number:    parseInt(form.week_number, 10),
      activities:     form.activities,
      skills_learned: form.skills_learned,
      challenges:     form.challenges,
      status:         submitAsSubmitted ? 'submitted' : 'draft',
    };

    try {
      if (editingLog) {
        const res = await API.put(`/logs/${editingLog.id}/`, payload);
        setLogs((prev) => prev.map((l) => (l.id === editingLog.id ? res.data : l)));
      } else {
        const res = await API.post('/logs/', payload);
        setLogs((prev) => [res.data, ...prev]);
      }
      setShowForm(false);
      setForm(EMPTY_FORM);
      setEditingLog(null);
    } catch (err) {
      const data = err.response?.data;
      setError(data ? JSON.stringify(data) : 'Failed to save log. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setForm(EMPTY_FORM);
    setEditingLog(null);
    setError('');
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Weekly Logbook</h1>
        {!showForm && (
          <button className="btn btn-primary" onClick={handleNewLog}>
            + New Log Entry
          </button>
        )}
      </div>

      {/* No placement warning */}
      {!loading && !placement && (
        <div style={{ background: '#fef9c3', color: '#92400e', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          ⚠️ You don't have an active placement yet. Contact your administrator to be assigned one before adding log entries.
        </div>
      )}

      {/* Placement badge */}
      {placement && (
        <div style={{ background: '#dbeafe', color: '#1e40af', padding: '8px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13, display: 'inline-block' }}>
          📍 Placement: <strong>{placement.company_name}</strong> — {placement.status}
        </div>
      )}

      {/* Global error */}
      {error && !showForm && (
        <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 24, borderLeft: '4px solid #1a56db' }}>
          <h3 style={{ marginBottom: 16, fontWeight: 700 }}>
            {editingLog ? `Editing Week ${editingLog.week_number} Log` : 'New Weekly Log'}
          </h3>

          {error && (
            <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label>Week Number</label>
                <input
                  className="form-control"
                  name="week_number" type="number" min="1" max="52"
                  value={form.week_number} onChange={handleChange}
                  placeholder="e.g. 1" required
                />
              </div>
              <div className="form-group">
                <label>Log Title <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 12 }}>(optional)</span></label>
                <input
                  className="form-control"
                  name="title" value={form.title}
                  onChange={handleChange}
                  placeholder="Brief title for this week"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Activities Performed</label>
              <textarea
                className="form-control"
                name="activities" value={form.activities}
                onChange={handleChange} rows={4}
                placeholder="Describe what you did this week..." required
              />
            </div>

            <div className="form-group">
              <label>Skills Learned</label>
              <textarea
                className="form-control"
                name="skills_learned" value={form.skills_learned}
                onChange={handleChange} rows={3}
                placeholder="What skills did you learn or develop this week..." required
              />
            </div>

            <div className="form-group">
              <label>Challenges Encountered <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 12 }}>(optional)</span></label>
              <textarea
                className="form-control"
                name="challenges" value={form.challenges}
                onChange={handleChange} rows={3}
                placeholder="Describe any challenges or learnings..."
              />
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="submit" className="btn btn-outline" disabled={saving}>
                {saving ? 'Saving…' : 'Save as Draft'}
              </button>
              <button type="button" className="btn btn-primary" disabled={saving}
                onClick={(e) => handleSubmit(e, true)}>
                {saving ? 'Submitting…' : 'Submit Log'}
              </button>
              <button type="button" className="btn btn-outline" onClick={handleCancel} disabled={saving}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Logs table */}
      <div className="card">
        {loading ? (
          <p style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>Loading logs…</p>
        ) : logs.length === 0 ? (
          <p style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>
            No log entries yet. Click <strong>+ New Log Entry</strong> to get started.
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Week', 'Activities (preview)', 'Status', 'Submitted', 'Actions'].map((h) => (
                  <th key={h} style={{
                    padding: '10px 14px', textAlign: 'left', fontSize: 12,
                    fontWeight: 700, color: '#64748b', textTransform: 'uppercase',
                    borderBottom: '1px solid #e2e8f0'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>Week {log.week_number}</td>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', color: '#475569', maxWidth: 260 }}>
                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.activities}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, ...(STATUS_COLORS[log.status] || STATUS_COLORS.draft) }}>
                      {log.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>
                    {log.submitted_at ? new Date(log.submitted_at).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
                    <button className="btn btn-outline" style={{ padding: '5px 12px', fontSize: 13 }} onClick={() => handleEdit(log)}>
                      {log.status === 'draft' ? 'Edit' : 'View'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

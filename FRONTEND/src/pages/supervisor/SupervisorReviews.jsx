import { useState, useEffect } from 'react';
import API from '../../Services/Api';

export default function SupervisorReviews() {
  const [logs, setLogs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await API.get('/supervisor/reviews/');
      const list = Array.isArray(res.data) ? res.data : res.data.results || [];
      setLogs(list);
    } catch (err) {
      setError('Failed to load pending reviews.');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async () => {
    if (!selected) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await API.post(`/logs/${selected.id}/review/`, { comments: comment });
      setSuccess('Log reviewed successfully!');
      // Remove from list
      setLogs(logs.filter(l => l.id !== selected.id));
      setSelected(null);
      setComment('');
    } catch (err) {
      const data = err.response?.data;
      setError(data?.error || data?.message || 'Failed to review log.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h1>Log Reviews</h1>
      {success && <div style={{ background: '#d0f0d0', padding: '10px', marginBottom: '16px' }}>{success}</div>}
      {error && <div style={{ background: '#ffe0e0', padding: '10px', marginBottom: '16px' }}>{error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: '24px' }}>
        <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '4px' }}>
          <h3>Pending Reviews ({logs.length})</h3>
          {logs.length === 0 && <p>All logs reviewed.</p>}
          {logs.map(log => (
            <div
              key={log.id}
              onClick={() => setSelected(log)}
              style={{
                padding: '14px',
                border: `1px solid ${selected?.id === log.id ? '#333' : '#ddd'}`,
                marginBottom: '10px',
                cursor: 'pointer',
                background: selected?.id === log.id ? '#f0f0f0' : '#fff'
              }}
            >
              <div><strong>{log.student_name || log.student}</strong></div>
              <div>Week {log.week_number}</div>
              <div>Submitted: {log.submitted_at ? new Date(log.submitted_at).toLocaleDateString() : '—'}</div>
            </div>
          ))}
        </div>
        {selected && (
          <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '4px' }}>
            <h3>{selected.student_name || selected.student} – Week {selected.week_number}</h3>
            <div style={{ marginBottom: '16px' }}>
              <p><strong>Activities:</strong> {selected.activities || '—'}</p>
              <p><strong>Skills:</strong> {selected.skills_learned || '—'}</p>
              <p><strong>Challenges:</strong> {selected.challenges || '—'}</p>
            </div>
            <div>
              <label><strong>Review Comment</strong></label>
              <textarea
                rows="4"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Write your review here..."
                style={{ width: '100%', marginBottom: '16px', padding: '8px' }}
              />
            </div>
            <button
              onClick={handleReview}
              disabled={submitting}
              style={{ background: '#1976d2', color: '#fff', border: 'none', padding: '10px 20px', cursor: 'pointer', marginRight: '10px' }}
            >
              {submitting ? 'Saving...' : 'Mark as Reviewed'}
            </button>
            <button
              onClick={() => { setSelected(null); setComment(''); setError(''); setSuccess(''); }}
              style={{ background: '#fff', border: '1px solid #ddd', padding: '10px 20px', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
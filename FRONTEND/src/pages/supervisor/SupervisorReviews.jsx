import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../Services/Api';

export default function SupervisorReviews() {
  const [logs, setLogs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await API.get('/supervisor/reviews/');
        setLogs(res.data.results || []);
      } catch {
        setError('Failed to load pending reviews.');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const handleReview = async () => {
    if (!selected) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await API.post(`/logs/${selected.id}/review/`, { comments: comment });
      setSuccess(`Log reviewed successfully.`);
      setLogs(logs.filter(l => l.id !== selected.id));
      setSelected(null);
      setComment('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to review log.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h1>Log Reviews</h1>
      {success && <div style={{ background: '#d0f0d0', padding: '10px', borderRadius: '4px', marginBottom: '16px' }}>{success}</div>}
      {error && <div style={{ background: '#ffe0e0', padding: '10px', borderRadius: '4px', marginBottom: '16px' }}>{error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: '24px' }}>
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '4px', padding: '20px' }}>
          <h3>Pending Reviews ({logs.length})</h3>
          {logs.length === 0 && <p>All logs reviewed. Great work!</p>}
          {logs.map(log => (
            <div key={log.id} onClick={() => setSelected(log)} style={{ padding: '14px', border: `1px solid ${selected?.id === log.id ? '#333' : '#ddd'}`, marginBottom: '10px', cursor: 'pointer', background: selected?.id === log.id ? '#f0f0f0' : '#fff' }}>
              <div style={{ fontWeight: 600 }}>{log.student_name || log.student}</div>
              <div>Week {log.week_number}</div>
              <div>Submitted: {log.submitted_at ? new Date(log.submitted_at).toLocaleDateString() : '—'}</div>
            </div>
          ))}
        </div>
        {selected && (
          <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '4px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div><h3>{selected.student_name || selected.student}</h3><p>Week {selected.week_number}</p></div>
              <button onClick={() => navigate(`/supervisor/logs/${selected.id}`)} style={{ background: '#fff', border: '1px solid #ddd', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>View Full Log →</button>
            </div>
            <div style={{ background: '#f9f9f9', padding: '16px', marginBottom: '20px', border: '1px solid #eee' }}>
              <p><strong>Activities</strong><br />{selected.activities || 'No activities.'}</p>
              {selected.skills_learned && <p><strong>Skills Learned</strong><br />{selected.skills_learned}</p>}
              {selected.challenges && <p><strong>Challenges</strong><br />{selected.challenges}</p>}
            </div>
            <div className="form-group">
              <label>Review Comment</label>
              <textarea rows={4} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write your review comment..." disabled={submitting} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
            </div>
            <button onClick={handleReview} disabled={submitting} style={{ background: '#333', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', marginRight: '10px' }}>{submitting ? 'Saving...' : 'Mark Reviewed'}</button>
            <button onClick={() => { setSelected(null); setComment(''); }} style={{ background: '#fff', border: '1px solid #ddd', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../Services/Api';

export default function SupervisorReviews() {
  const [logs, setLogs]       = useState([]);
  const [selected, setSelected] = useState(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  // Fetch pending logs on mount
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await API.get('/supervisor/reviews/');
        setLogs(res.data.results || []);
      } catch (err) {
        setError('Failed to load pending reviews.');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const handleSelect = (log) => {
    setSelected(log);
    setComment(log.supervisor_comment || '');
    setSuccess('');
    setError('');
  };

  const handleReview = async (newStatus) => {
    if (!selected) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await API.patch(`/logs/${selected.id}/`, {
        status: newStatus,
        supervisor_comment: comment,
      });
      setSuccess(`Log marked as "${newStatus}" successfully.`);
      // Remove from pending list
      setLogs((prev) => prev.filter((l) => l.id !== selected.id));
      setSelected(null);
      setComment('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update log.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">Log Reviews</h1>

      {success && (
        <div style={styles.successBanner}>{success}</div>
      )}
      {error && (
        <div style={styles.errorBanner}>{error}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 24 }}>
        {/* List */}
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: 16 }}>
            Pending Reviews ({logs.length})
          </h3>

          {loading && <p style={{ color: '#64748b' }}>Loading...</p>}

          {!loading && logs.length === 0 && (
            <p style={{ color: '#64748b' }}>All logs reviewed. Great work! ✅</p>
          )}

          {logs.map((log) => (
            <div
              key={log.id}
              onClick={() => handleSelect(log)}
              style={{
                padding: '14px',
                borderRadius: 8,
                border: `1.5px solid ${selected?.id === log.id ? '#1a56db' : '#e2e8f0'}`,
                marginBottom: 10,
                cursor: 'pointer',
                background: selected?.id === log.id ? '#e8effd' : '#fff',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ fontWeight: 600 }}>
                {log.student_name || log.student}
              </div>
              <div style={{ fontSize: 13, color: '#64748b' }}>
                Week {log.week_number}
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                Submitted: {log.submitted_at
                  ? new Date(log.submitted_at).toLocaleDateString()
                  : '—'}
              </div>
            </div>
          ))}
        </div>

        {/* Review panel */}
        {selected && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontWeight: 700, marginBottom: 4 }}>
                  {selected.student_name || selected.student}
                </h3>
                <p style={{ color: '#64748b' }}>Week {selected.week_number}</p>
              </div>
              {/* Open full detail page */}
              <button
                onClick={() => navigate(`/supervisor/logs/${selected.id}`)}
                style={styles.viewFullBtn}
              >
                View Full Log →
              </button>
            </div>

            {/* Log content preview */}
            <div style={styles.contentBox}>
              <p style={styles.contentLabel}>Activities</p>
              <p style={styles.contentText}>{selected.activities || 'No activities recorded.'}</p>

              {selected.skills_learned && (
                <>
                  <p style={{ ...styles.contentLabel, marginTop: 12 }}>Skills Learned</p>
                  <p style={styles.contentText}>{selected.skills_learned}</p>
                </>
              )}

              {selected.challenges && (
                <>
                  <p style={{ ...styles.contentLabel, marginTop: 12 }}>Challenges</p>
                  <p style={styles.contentText}>{selected.challenges}</p>
                </>
              )}
            </div>

            <div className="form-group">
              <label>Review Comment</label>
              <textarea
                className="form-control"
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Write your review comment..."
                disabled={submitting}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn btn-success"
                onClick={() => handleReview('reviewed')}
                disabled={submitting}
              >
                {submitting ? 'Saving...' : '✅ Mark Reviewed'}
              </button>
              <button
                className="btn btn-outline"
                onClick={() => { setSelected(null); setComment(''); }}
                disabled={submitting}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  successBanner: {
    background: '#f0fdf4', border: '1px solid #16a34a', color: '#15803d',
    borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 14,
  },
  errorBanner: {
    background: '#fef2f2', border: '1px solid #dc2626', color: '#dc2626',
    borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 14,
  },
  contentBox: {
    background: '#f8fafc', borderRadius: 8, padding: 16, marginBottom: 20,
    border: '1px solid #e2e8f0',
  },
  contentLabel: {
    fontSize: 11, fontWeight: 600, color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4,
  },
  contentText: {
    fontSize: 14, color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap',
  },
  viewFullBtn: {
    background: 'transparent', border: '1px solid #e2e8f0', borderRadius: 6,
    padding: '6px 12px', fontSize: 12, color: '#1a56db', cursor: 'pointer',
  },
};

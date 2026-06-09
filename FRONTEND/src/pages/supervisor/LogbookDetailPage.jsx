import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../../Services/Api";

export default function LogbookDetailPage() {
  const { logId } = useParams();
  const navigate = useNavigate();
  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    const fetchLog = async () => {
      try {
        const res = await API.get(`/logs/${logId}/`);
        setLog(res.data);
        setComment(res.data.supervisor_comment || "");
      } catch {
        setMsg({ type: 'error', text: 'Failed to load log.' });
      } finally {
        setLoading(false);
      }
    };
    fetchLog();
  }, [logId]);

  const handleStatus = async (newStatus) => {
    setSubmitting(true);
    setMsg({ type: '', text: '' });
    try {
      let res;
      if (newStatus === 'reviewed') {
        res = await API.post(`/logs/${logId}/review/`, { comments: comment });
      } else if (newStatus === 'approved') {
        res = await API.post(`/logs/${logId}/approve/`, {});
      } else {
        res = await API.patch(`/logs/${logId}/`, { status: newStatus });
      }
      setLog(res.data);
      setMsg({ type: 'success', text: `Log marked as ${newStatus}.` });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Failed to update.' });
    } finally {
      setSubmitting(false);
    }
  };

  const saveComment = async () => {
    setSubmitting(true);
    try {
      const res = await API.patch(`/logs/${logId}/`, { supervisor_comment: comment });
      setLog(res.data);
      setMsg({ type: 'success', text: 'Comment saved.' });
    } catch {
      setMsg({ type: 'error', text: 'Failed to save comment.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p>Loading...</p>;
  if (!log) return <p>Log not found.</p>;

  const canReview = log.status === 'submitted';
  const canApprove = log.status === 'reviewed';

  return (
    <div>
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', marginBottom: '20px' }}>← Back</button>
      <h1>Week {log.week_number} — Logbook Entry</h1>
      <p>Submitted by {log.student_name || log.student} on {log.submitted_at ? new Date(log.submitted_at).toLocaleDateString() : '—'}</p>
      <div style={{ marginBottom: '20px' }}>
        <h3>Activities</h3>
        <div style={{ background: '#f9f9f9', padding: '16px', border: '1px solid #eee' }}>{log.activities || 'No activities.'}</div>
        {log.skills_learned && <><h3>Skills Learned</h3><div style={{ background: '#f9f9f9', padding: '16px', border: '1px solid #eee' }}>{log.skills_learned}</div></>}
        {log.challenges && <><h3>Challenges</h3><div style={{ background: '#f9f9f9', padding: '16px', border: '1px solid #eee' }}>{log.challenges}</div></>}
      </div>
      <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '4px', padding: '20px', marginBottom: '20px' }}>
        <h3>Supervisor Comment</h3>
        <textarea rows={5} value={comment} onChange={(e) => setComment(e.target.value)} disabled={log.status === 'approved'} style={{ width: '100%', padding: '8px', marginBottom: '10px' }} />
        {log.status !== 'approved' && <button onClick={saveComment} disabled={submitting} style={{ background: '#333', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>Save Comment</button>}
      </div>
      {msg.text && <div style={{ background: msg.type === 'success' ? '#d0f0d0' : '#ffe0e0', padding: '10px', marginBottom: '20px' }}>{msg.text}</div>}
      {canReview && <button onClick={() => handleStatus('reviewed')} disabled={submitting} style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', marginRight: '10px' }}>Mark as Reviewed</button>}
      {canApprove && <button onClick={() => handleStatus('approved')} disabled={submitting} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer' }}>Approve Log</button>}
      {log.status === 'approved' && <div style={{ padding: '16px', background: '#d0f0d0', borderRadius: '4px' }}>✅ Log Approved</div>}
    </div>
  );
}
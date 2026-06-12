import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import API from '../../Services/Api';

export default function AcademicDashboard() {
  const { user } = useAuth();
  const [pendingLogs, setPendingLogs] = useState([]);
  const [approvedLogs, setApprovedLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await API.get('/logs/');
        let logs = res.data;
        if (!Array.isArray(logs)) logs = logs.results || [];

        // Filter logs where the placement's academic supervisor is the logged‑in user
        const userPlacements = logs.filter(log => 
          log.placement?.academic_supervisor === user?.id
        );

        const pending = userPlacements.filter(log => log.status === 'submitted');
        const approved = userPlacements.filter(log => log.status === 'approved');

        setPendingLogs(pending);
        setApprovedLogs(approved);
      } catch (err) {
        console.error('Failed to load logs:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) fetchData();
  }, [user]);

  if (loading) return <p>Loading dashboard...</p>;

  return (
    <div>
      <h1 className="page-title">Academic Supervisor Dashboard</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Pending Evaluations</h3>
          {pendingLogs.length === 0 ? (
            <p style={{ color: '#64748b' }}>No logs pending review.</p>
          ) : (
            <ul style={{ paddingLeft: 20 }}>
              {pendingLogs.map(log => (
                <li key={log.id}>
                  Week {log.week_number} – {log.student_name || log.student}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Completed Evaluations</h3>
          {approvedLogs.length === 0 ? (
            <p style={{ color: '#64748b' }}>No completed evaluations yet.</p>
          ) : (
            <ul style={{ paddingLeft: 20 }}>
              {approvedLogs.map(log => (
                <li key={log.id}>
                  Week {log.week_number} – {log.student_name || log.student}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
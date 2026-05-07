import { useEffect, useState } from 'react';
import API from '../../Services/Api';

export default function PlacementPage() {
  const [placement, setPlacement] = useState(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    API.get('/placements/my/')
      .then(res => setPlacement(res.data))
      .catch(() => setPlacement(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h1 className="page-title">My Internship Placement</h1>
      {!placement ? (
        <div className="card">
          <p style={{ color: '#64748b' }}>No active placement found. Contact your administrator.</p>
        </div>
      ) : (
        <div className="card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {[
              ['Company',        placement.company_name],
              ['Supervisor',     placement.supervisor_name],
              ['Start Date',     placement.start_date],
              ['End Date',       placement.end_date],
              ['Location',       placement.location],
              ['Status',         placement.status],
            ].map(([label, value]) => (
              <div key={label}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                <div style={{ fontWeight: 500 }}>{value || '—'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

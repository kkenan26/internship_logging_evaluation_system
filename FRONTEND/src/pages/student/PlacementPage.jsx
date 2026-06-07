import { useEffect, useState } from 'react';
import API from '../../Services/Api';

export default function PlacementPage() {
  const [placement, setPlacement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    company_name: '',
    company_address: '',
    start_date: '',
    end_date: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchPlacement();
  }, []);

  const fetchPlacement = async () => {
    try {
      setLoading(true);
      const res = await API.get('/placements/my-placement/');
      const data = res.data;
      const list = Array.isArray(data) ? data : data.results || [];
      setPlacement(list.length > 0 ? list[0] : null);
    } catch {
      setPlacement(null);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await API.post('/placements/my-placement/', form);
      setPlacement(res.data);
      setShowForm(false);
      setForm({
        company_name: '',
        company_address: '',
        start_date: '',
        end_date: '',
      });
      setSuccess('Placement request submitted. Waiting for approval.');
    } catch (err) {
      const data = err.response?.data;
      setError(
        typeof data === 'object'
          ? Object.values(data).flat().join(' ')
          : 'Failed to submit request.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'active':
        return { background: '#e6f7e6', color: '#2e7d32' };
      case 'pending':
        return { background: '#fff3e0', color: '#ed6c02' };
      case 'completed':
        return { background: '#e3f2fd', color: '#1565c0' };
      case 'cancelled':
        return { background: '#ffebee', color: '#c62828' };
      default:
        return { background: '#f5f5f5', color: '#616161' };
    }
  };

  if (loading) {
    return <p style={{ padding: '32px', color: '#666' }}>Loading placement...</p>;
  }

  const statusStyle = placement ? getStatusStyle(placement.status) : {};

  return (
    <div>
      <h1>My Internship Placement</h1>

      {success && (
        <div style={{ background: '#e8f5e9', color: '#2e7d32', padding: '10px', borderRadius: '4px', marginBottom: '16px' }}>
          {success}
        </div>
      )}

      {error && (
        <div style={{ background: '#ffebee', color: '#c62828', padding: '10px', borderRadius: '4px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {!placement && !showForm && (
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '40px', textAlign: 'center' }}>
          <h3>No Placement Yet</h3>
          <p style={{ color: '#666', marginBottom: '24px' }}>
            Submit a placement request to get started.
          </p>
          <button
            style={{ background: '#1976d2', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer' }}
            onClick={() => setShowForm(true)}
          >
            Submit Placement Request
          </button>
        </div>
      )}

      {showForm && (
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '24px' }}>
          <h3>New Placement Request</h3>
          <form onSubmit={handleSubmitRequest}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Company Name</label>
              <input
                type="text"
                name="company_name"
                value={form.company_name}
                onChange={handleChange}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                required
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Company Address</label>
              <textarea
                name="company_address"
                value={form.company_address}
                onChange={handleChange}
                rows={2}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                required
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Start Date</label>
              <input
                type="date"
                name="start_date"
                value={form.start_date}
                onChange={handleChange}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                required
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>End Date</label>
              <input
                type="date"
                name="end_date"
                value={form.end_date}
                onChange={handleChange}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                required
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="submit"
                disabled={submitting}
                style={{ background: '#1976d2', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer' }}
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setError(''); }}
                style={{ background: '#fff', color: '#333', border: '1px solid #ddd', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {placement && (
        <>
          <div style={{ padding: '12px 20px', borderRadius: '4px', marginBottom: '20px', ...statusStyle }}>
            <strong>Status: {placement.status}</strong>
            {placement.status === 'pending' && ' — Awaiting administrator approval'}
            {placement.status === 'active' && ' — Your placement has been approved'}
            {placement.status === 'cancelled' && ' — Contact your administrator'}
          </div>

          <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '24px', marginBottom: '20px' }}>
            <h3>Placement Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Company</div>
                <div>{placement.company_name || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Status</div>
                <div>{placement.status || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Start Date</div>
                <div>{placement.start_date || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>End Date</div>
                <div>{placement.end_date || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Workplace Supervisor</div>
                <div>{placement.workplace_supervisor_name || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Academic Supervisor</div>
                <div>{placement.academic_supervisor_name || '—'}</div>
              </div>
            </div>
            <div style={{ marginTop: '16px' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Company Address</div>
              <div>{placement.company_address || '—'}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
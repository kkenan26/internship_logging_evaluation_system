import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../services/Api';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    role: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const roles = [
    { value: 'student', label: 'Student' },
    { value: 'academic_supervisor', label: 'Academic Supervisor' },
    { value: 'workplace_supervisor', label: 'Workplace Supervisor' },
    { value: 'admin', label: 'Administrator' },
  ];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.username || !formData.email || !formData.role || !formData.password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      await API.post('/auth/register/', {
        username: formData.username,
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        role: formData.role,
        password: formData.password,
        password2: formData.confirmPassword,
      });
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      const data = err.response?.data;
      if (data) {
        const msg = Object.values(data).flat().join(' ');
        setError(msg || 'Registration failed. Please try again.');
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
      <div style={{ background: '#fff', borderRadius: '20px', padding: '40px', width: '100%', maxWidth: '480px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ width: '64px', height: '64px', background: '#1976d2', borderRadius: '16px', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '18px', fontWeight: 'bold' }}>IL</div>
          <h1 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '4px' }}>Create Account</h1>
          <p style={{ color: '#666', fontSize: '14px' }}>Join the Internship Logging System</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#666', marginBottom: '4px' }}>FIRST NAME</label>
              <input
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                placeholder="First name"
                style={{ width: '100%', padding: '11px 14px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#666', marginBottom: '4px' }}>LAST NAME</label>
              <input
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                placeholder="Last name"
                style={{ width: '100%', padding: '11px 14px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#666', marginBottom: '4px' }}>USERNAME <span style={{ color: '#c62828' }}>*</span></label>
            <input
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Choose a username"
              style={{ width: '100%', padding: '11px 14px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }}
              required
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#666', marginBottom: '4px' }}>EMAIL <span style={{ color: '#c62828' }}>*</span></label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your@email.com"
              style={{ width: '100%', padding: '11px 14px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }}
              required
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#666', marginBottom: '4px' }}>ROLE <span style={{ color: '#c62828' }}>*</span></label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              style={{ width: '100%', padding: '11px 14px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', background: '#fff' }}
              required
            >
              <option value="" disabled>Select your role</option>
              {roles.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#666', marginBottom: '4px' }}>PASSWORD <span style={{ color: '#c62828' }}>*</span></label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Min. 8 characters"
              style={{ width: '100%', padding: '11px 14px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }}
              required
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#666', marginBottom: '4px' }}>CONFIRM PASSWORD <span style={{ color: '#c62828' }}>*</span></label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Repeat your password"
              style={{ width: '100%', padding: '11px 14px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }}
              required
            />
          </div>

          {error && (
            <p style={{ color: '#c62828', fontSize: '13px', marginBottom: '16px' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', background: '#1976d2', color: '#fff', border: 'none', padding: '13px', borderRadius: '10px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>

          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#666' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#1976d2', textDecoration: 'none' }}>Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
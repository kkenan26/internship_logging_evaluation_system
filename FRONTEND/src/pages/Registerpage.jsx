import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../services/Api';

const ROLES = [
  { value: 'student', label: 'Student' },
  { value: 'academic_supervisor', label: 'Academic Supervisor' },
  { value: 'admin', label: 'Administrator' },
  { value: 'workplace_supervisor', label: 'Workplace Supervisor' },
];

const RegisterPage = () => {
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

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
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
        password2: formData.confirmPassword,  // ← fixed
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
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.logoWrap}>
          <div style={styles.logo}>ILES</div>
        </div>

        <h1 style={styles.title}>Create Account</h1>
        <p style={styles.subtitle}>Join the Internship Logging &amp; Evaluation System</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>FIRST NAME</label>
              <input
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                placeholder="First name"
                style={styles.input}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>LAST NAME</label>
              <input
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                placeholder="Last name"
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>USERNAME <span style={styles.required}>*</span></label>
            <input
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Choose a username"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>EMAIL <span style={styles.required}>*</span></label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your@email.com"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>ROLE <span style={styles.required}>*</span></label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              style={{ ...styles.input, color: formData.role ? '#1e293b' : '#94a3b8' }}
              required
            >
              <option value="" disabled>Select your role</option>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>PASSWORD <span style={styles.required}>*</span></label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Min. 8 characters"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>CONFIRM PASSWORD <span style={styles.required}>*</span></label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Repeat your password"
              style={styles.input}
              required
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p style={styles.loginLink}>
          Already have an account?{' '}
          <Link to="/login" style={styles.link}>Sign in</Link>
        </p>
      </div>
    </div>
  );
};

const styles = {
  wrapper: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a56db 0%, #0e9f6e 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 16px',
  },
  card: {
    background: '#fff',
    borderRadius: 20,
    padding: '40px 40px 32px',
    width: '100%',
    maxWidth: 480,
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
  },
  logoWrap: { display: 'flex', justifyContent: 'center', marginBottom: 16 },
  logo: {
    width: 64, height: 64,
    background: 'linear-gradient(135deg, #1a56db, #0e9f6e)',
    borderRadius: 16,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontWeight: 800, fontSize: 18, letterSpacing: 1,
  },
  title: { textAlign: 'center', fontSize: 22, fontWeight: 700, color: '#1e293b', margin: '0 0 4px' },
  subtitle: { textAlign: 'center', fontSize: 14, color: '#64748b', margin: '0 0 28px' },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  row: { display: 'flex', gap: 12 },
  field: { display: 'flex', flexDirection: 'column', gap: 6, flex: 1 },
  label: { fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: 0.5 },
  required: { color: '#ef4444' },
  input: {
    padding: '11px 14px',
    borderRadius: 8,
    border: '1.5px solid #e2e8f0',
    fontSize: 14,
    color: '#1e293b',
    background: '#f8fafc',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  error: { color: '#ef4444', fontSize: 13, margin: 0 },
  btn: {
    marginTop: 4,
    padding: '13px',
    background: '#1a56db',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    letterSpacing: 0.3,
  },
  loginLink: { textAlign: 'center', marginTop: 20, fontSize: 14, color: '#64748b' },
  link: { color: '#1a56db', fontWeight: 600, textDecoration: 'none' },
};

export default RegisterPage;
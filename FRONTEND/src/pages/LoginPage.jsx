import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from "../context/AuthContext";
import { Link } from 'react-router-dom';

const ROLE_REDIRECTS = {
  student:              '/student/dashboard',
  workplace_supervisor: '/supervisor/dashboard',
  academic_supervisor:  '/academic/dashboard',
  admin:                '/admin/dashboard',  // ✅ matches backend
};

export default function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const [form, setForm]     = useState({ username: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
    
      const user = await login(form.username, form.password);
      const from = location.state?.from?.pathname || ROLE_REDIRECTS[user.role] || '/';
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Logo / Title */}
        <div style={styles.header}>
          <div style={styles.logo}>ILES</div>
          <h1 style={styles.title}>Internship Logging &amp; Evaluation</h1>
          <p style={styles.subtitle}>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username or Email</label>
            <input
              className="form-control"
              name="username"
              value={form.username}
              onChange={handleChange}
              placeholder="Enter your username or email"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              className="form-control"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
            />
          </div>

          {error && <p className="error-text" style={{ marginBottom: 14 }}>{error}</p>}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
            disabled={loading}
          >

            {loading ? 'Signing in…' : 'Sign In'}
    </button>
    <p style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: '#64748b' }}>
      Don't have an account?{' '}
      <Link to="/register" style={{ color: '#1a56db', fontWeight: 600, textDecoration: 'none' }}>
        Create one
      </Link>
    </p>
  </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a56db 0%, #0e9f6e 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: '40px 36px',
    width: '100%',
    maxWidth: 420,
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
  },
  header: { textAlign: 'center', marginBottom: 32 },
  logo: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 56,
    borderRadius: 14,
    background: 'linear-gradient(135deg, #1a56db, #0e9f6e)',
    color: '#fff',
    fontSize: 18,
    fontWeight: 800,
    letterSpacing: 1,
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: 700, marginBottom: 6 },
  subtitle: { color: '#64748b', fontSize: 14 },
};



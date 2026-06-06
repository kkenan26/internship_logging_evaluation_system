import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  return (
    <div style={styles.container}>
      {/* Hero Section */}
      <section style={styles.hero}>
        <div style={styles.heroContent}>
          <h1 style={styles.title}>Internship Logging and Evaluation System</h1>
          <p style={styles.subtitle}>
            <strong>Track. Monitor. Evaluate. Grow.</strong>
          </p>
          <p style={styles.description}>
            A centralized platform designed to simplify internship management through digital activity logging, supervisor feedback, and performance evaluation.
          </p>
          <div style={styles.buttonGroup}>
            <Link to="/login" style={styles.primaryButton}>
              Get Started
            </Link>
            <Link to="/register" style={styles.secondaryButton}>
              Create Account
            </Link>
          </div>
        </div>
        <div style={styles.heroImage}>
          {/* Placeholder for illustration */}
          <div style={styles.placeholderImage}>
            <span style={styles.imageText}>ILES</span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section style={styles.features}>
        <h2 style={styles.sectionTitle}>Why Choose ILES?</h2>
        <div style={styles.featureGrid}>
          <div style={styles.featureCard}>
            <div style={styles.featureIcon}>📊</div>
            <h3 style={styles.featureTitle}>Activity Logging</h3>
            <p style={styles.featureDescription}>
              Track daily internship activities with detailed logs and progress monitoring.
            </p>
          </div>
          <div style={styles.featureCard}>
            <div style={styles.featureIcon}>👥</div>
            <h3 style={styles.featureTitle}>Supervisor Feedback</h3>
            <p style={styles.featureDescription}>
              Receive real-time feedback from workplace and academic supervisors.
            </p>
          </div>
          <div style={styles.featureCard}>
            <div style={styles.featureIcon}>📈</div>
            <h3 style={styles.featureTitle}>Performance Evaluation</h3>
            <p style={styles.featureDescription}>
              Comprehensive evaluation system with scoring and improvement tracking.
            </p>
          </div>
          <div style={styles.featureCard}>
            <div style={styles.featureIcon}>🔒</div>
            <h3 style={styles.featureTitle}>Secure & Centralized</h3>
            <p style={styles.featureDescription}>
              All data securely stored and accessible from anywhere with role-based access.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <p style={styles.footerText}>
          © 2026 Internship Logging and Evaluation System. Built for educational excellence.
        </p>
      </footer>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  hero: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '80px 5%',
    background: 'linear-gradient(135deg, #1a56db 0%, #0e9f6e 100%)',
    color: 'white',
    minHeight: '70vh',
  },
  heroContent: {
    flex: 1,
    maxWidth: '600px',
  },
  title: {
    fontSize: '3.5rem',
    fontWeight: '800',
    marginBottom: '1rem',
    lineHeight: '1.1',
  },
  subtitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    marginBottom: '1.5rem',
    opacity: 0.9,
  },
  description: {
    fontSize: '1.2rem',
    lineHeight: '1.6',
    marginBottom: '2rem',
    opacity: 0.8,
  },
  buttonGroup: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  primaryButton: {
    padding: '14px 28px',
    backgroundColor: 'white',
    color: '#1a56db',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '1rem',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
  secondaryButton: {
    padding: '14px 28px',
    backgroundColor: 'transparent',
    color: 'white',
    textDecoration: 'none',
    border: '2px solid white',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '1rem',
    transition: 'all 0.3s ease',
  },
  heroImage: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderImage: {
    width: '300px',
    height: '300px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '4rem',
    fontWeight: 'bold',
    backdropFilter: 'blur(10px)',
  },
  imageText: {
    color: 'white',
  },
  features: {
    padding: '80px 5%',
    backgroundColor: '#f8fafc',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: '2.5rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '3rem',
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '2rem',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  featureCard: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    transition: 'transform 0.3s ease',
  },
  featureIcon: {
    fontSize: '3rem',
    marginBottom: '1rem',
  },
  featureTitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '1rem',
  },
  featureDescription: {
    color: '#64748b',
    lineHeight: '1.6',
  },
  footer: {
    padding: '2rem 5%',
    backgroundColor: '#1e293b',
    color: 'white',
    textAlign: 'center',
  },
  footerText: {
    margin: 0,
    fontSize: '0.9rem',
    opacity: 0.8,
  },
};

// Add hover effects with CSS-in-JS (would be better with CSS modules)
styles.primaryButton[':hover'] = {
  transform: 'translateY(-2px)',
  boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
};
styles.secondaryButton[':hover'] = {
  backgroundColor: 'white',
  color: '#1a56db',
};
styles.featureCard[':hover'] = {
  transform: 'translateY(-4px)',
};

export default LandingPage;
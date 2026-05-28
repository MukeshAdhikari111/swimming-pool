import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, LogIn, ShieldCheck, UserRound } from 'lucide-react';
import api from '../api';
import { saveAuth } from '../auth';
import './Auth.css';

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await api.post('/auth/login', {
        identifier: form.username,
        password: form.password
      });
      saveAuth(response.data);
      navigate(location.state?.from || '/app');
    } catch (error) {
      setMessage(error.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page login-page">
      <aside className="login-side login-only">
        <div className="login-copy">
          <span className="login-kicker">Secure staff portal</span>
          <h1>Pool operations, tickets, and visitor records stay protected.</h1>
          <p>Use your authorized username to open the private swimming pool management system.</p>
          <div className="login-trust-grid">
            <div><strong>Private</strong><span>Protected management routes</span></div>
            <div><strong>Fast</strong><span>Visitor entry and PDF tickets</span></div>
            <div><strong>Live</strong><span>Capacity, tasks, and analytics</span></div>
          </div>
        </div>

        <form className="auth-panel" onSubmit={handleSubmit}>
          <Link className="login-brand" to="/">
            <img src="/brand/us-amusement-logo.svg" alt="US Amusement Park" />
            <span>US Amusement Park</span>
          </Link>

          <div className="auth-icon">
            <LogIn size={28} />
          </div>
          <h2>Management Login</h2>
          <p>Enter your authorized username and password to open the swimming pool management system.</p>

          <div>
            <label>Username</label>
            <div className="auth-input">
              <UserRound size={18} />
              <input className="input-field" name="username" value={form.username} onChange={handleChange} required placeholder="Enter username" autoComplete="username" />
            </div>
          </div>

          <div>
            <label>Password</label>
            <div className="auth-input">
              <Lock size={18} />
              <input className="input-field" type={showPassword ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange} required minLength={6} placeholder="Enter password" autoComplete="current-password" />
              <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <label className="remember-row">
            <input type="checkbox" />
            <span>Remember this device</span>
          </label>

          {message && <div className="auth-message">{message}</div>}

          <button className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? 'Checking access...' : 'Login to Dashboard'}
          </button>

          <div className="secure-note">
            <ShieldCheck size={16} />
            <span>Staff-only access for pool operations.</span>
          </div>

          <div className="auth-switch">
            <span>Authorized staff access only.</span>
          </div>
        </form>
      </aside>
    </div>
  );
};

export default Auth;

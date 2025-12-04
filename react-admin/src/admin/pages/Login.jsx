import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login gagal');
      }

      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('adminName', data.user.name);
      localStorage.setItem('userRole', data.user.role || 'ADMIN');

      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-box">
        {/* Judul dibuat persis seperti authentication.css */}
        <h1 className="login-title">Masuk ke <i>Nimonspedia</i> 🍌!</h1>
        <p style={{color: '#666', marginBottom: '1.5rem', marginTop: '-10px'}}>Administrator Portal</p>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleLogin} className="login-form">
          <div>
            <label className="login-label">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="login-input"
              placeholder="admin@nimonspedia.com"
            />
          </div>

          <div>
            <label className="login-label">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="login-input"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            className="login-btn"
            disabled={loading}
          >
            {loading ? 'Memuat...' : 'Masuk'}
          </button>
        </form>

        {/* Link Kembali ke Web Utama (Buyer) */}
        <p className="login-link">
          Bukan Admin? <a href="/authentication/login.php">Kembali ke Halaman Pembeli</a>
        </p>
      </div>
    </div>
  );
}

import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

function FeatureDisabled() {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-redirect ke PHP disabled page dengan reason dari URL jika ada
    const urlParams = new URLSearchParams(window.location.search);
    const reason = urlParams.get('reason') || 'Fitur lelang sedang dinonaktifkan';
    window.location.href = `/disabled.php?reason=${encodeURIComponent(reason)}`;
  }, []);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      backgroundColor: '#f5f5f5'
    }}>
      <div style={{
        textAlign: 'center',
        padding: '40px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        maxWidth: '500px'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🚫</div>
        <h1 style={{ fontSize: '24px', marginBottom: '16px', color: '#333' }}>
          Fitur Lelang Tidak Tersedia
        </h1>
        <p style={{ fontSize: '16px', color: '#666', marginBottom: '24px' }}>
          Fitur lelang sedang dinonaktifkan. Silakan hubungi administrator untuk informasi lebih lanjut.
        </p>
        <button
          onClick={() => {
            window.location.href = '/index.php';
          }}
          style={{
            padding: '12px 24px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#0056b3'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#007bff'}
        >
          Kembali ke Beranda
        </button>
      </div>
    </div>
  );
}

export default FeatureDisabled;

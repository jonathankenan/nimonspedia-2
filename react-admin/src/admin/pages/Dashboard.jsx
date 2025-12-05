import { useEffect, useState } from 'react';
import Layout from '../../Layout';

const Dashboard = () => {
  // --- STATE DASHBOARD ---
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('ALL'); 
  const [loadingUsers, setLoadingUsers] = useState(true);

  // State Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10; // Bisa diubah mau tampilkan berapa

  // --- STATE GLOBAL FLAGS ---
  const [globalFeatures, setGlobalFeatures] = useState({
    checkout_enabled: '1', chat_enabled: '1', auction_enabled: '1'
  });
  const [processingGlobal, setProcessingGlobal] = useState(null);
  const [globalReason, setGlobalReason] = useState('');
  const [editingGlobalFeature, setEditingGlobalFeature] = useState(null);

  // --- STATE MODAL USER FLAGS ---
  const [selectedUser, setSelectedUser] = useState(null);
  const [loadingFlags, setLoadingFlags] = useState(false);
  const [savingFlags, setSavingFlags] = useState(false);
  const [formFlags, setFormFlags] = useState({});
  const [formReasons, setFormReasons] = useState({});

  const token = localStorage.getItem('adminToken');

  // --- INITIAL FETCH ---
  useEffect(() => {
    fetchGlobalFeatures();
  }, []);

  //Fetch Users dipanggil setiap kali page, search, atau filter berubah
  useEffect(() => {
    // Gunakan timeout (debounce) agar tidak request server tiap ketik 1 huruf
    const timer = setTimeout(() => {
      fetchUsers();
    }, 500);

    return () => clearTimeout(timer);
  }, [currentPage, search, filterRole]);

  const fetchUsers = () => {
    setLoadingUsers(true);
    
    // Bangun URL dengan Query Params
    const queryParams = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
        search: search,
        role: filterRole
    });

    fetch(`/api/admin/users?${queryParams}`, { 
        headers: { 'Authorization': `Bearer ${token}` } 
    })
      .then(res => res.json())
      .then(response => {
        // Menangani format response baru dari server
        if (response.data) {
            setUsers(response.data);
            setTotalPages(response.pagination.totalPages);
        } else {
            setUsers([]); // Fallback jika error/kosong
        }
        setLoadingUsers(false); 
      })
      .catch(err => {
          console.error(err);
          setLoadingUsers(false);
      });
  };

  // Reset page ke 1 jika filter/search berubah
  const handleFilterChange = (newRole) => {
      setFilterRole(newRole);
      setCurrentPage(1);
  };
  
  const handleSearchChange = (e) => {
      setSearch(e.target.value);
      setCurrentPage(1); // Balik ke halaman 1 saat mencari baru
  };

  const fetchGlobalFeatures = () => {
    fetch('/api/admin/features', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setGlobalFeatures({
        checkout_enabled: data.checkout_enabled ?? '1',
        chat_enabled: data.chat_enabled ?? '1',
        auction_enabled: data.auction_enabled ?? '1'
      }))
      .catch(err => console.error(err));
  };

  const handleOpenUserModal = (user) => {
    setSelectedUser(user);
    setLoadingFlags(true);
    setSavingFlags(false);
    setFormFlags({});
    setFormReasons({});
    fetch(`/api/admin/users/${user.user_id}/flags`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        const initialFlags = {
          checkout_enabled: data.checkout_enabled?.is_enabled ?? true,
          chat_enabled: data.chat_enabled?.is_enabled ?? true,
          auction_enabled: data.auction_enabled?.is_enabled ?? true,
        };
        const initialReasons = {
          checkout_enabled: data.checkout_enabled?.reason || '',
          chat_enabled: data.chat_enabled?.reason || '',
          auction_enabled: data.auction_enabled?.reason || '',
        };
        setFormFlags(initialFlags);
        setFormReasons(initialReasons);
        setLoadingFlags(false);
      });
  };

  const handleCheckboxChange = (feature) => {
    setFormFlags(prev => ({ ...prev, [feature]: !prev[feature] }));
  };

  const handleReasonChange = (feature, value) => {
    setFormReasons(prev => ({ ...prev, [feature]: value }));
  };

  const handleSaveUserFlags = async () => {
    for (const [feature, isEnabled] of Object.entries(formFlags)) {
      if (!isEnabled) {
        const reason = formReasons[feature] || '';
        if (reason.length < 10) {
          alert(`Gagal: Alasan mematikan fitur "${feature.replace('_', ' ')}" wajib diisi minimal 10 karakter.`);
          return;
        }
      }
    }
    setSavingFlags(true);
    const promises = Object.keys(formFlags).map(feature => {
      const isEnabled = formFlags[feature];
      const reason = formReasons[feature];
      return fetch(`/api/admin/users/${selectedUser.user_id}/flags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ feature_name: feature, is_enabled: isEnabled, reason: isEnabled ? null : reason })
      });
    });
    try {
      await Promise.all(promises);
      alert('Berhasil: Pengaturan akses user telah diperbarui.');
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      console.error(error);
      alert('Terjadi kesalahan saat menyimpan data.');
    } finally {
      setSavingFlags(false);
    }
  };

  const handleToggleGlobal = (featureName) => {
    const isCurrentlyEnabled = globalFeatures[featureName] === '1';
    if (isCurrentlyEnabled) {
      setEditingGlobalFeature(featureName);
      setGlobalReason('');
    } else {
      executeGlobalChange(featureName, true);
    }
  };

  const executeGlobalChange = (featureName, isEnabled) => {
    if (!isEnabled && globalReason.length < 20) return alert("Alasan maintenance wajib diisi minimal 20 karakter!");
    setProcessingGlobal(featureName);
    fetch(`/api/admin/features/${featureName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ enabled: isEnabled, reason: isEnabled ? null : globalReason })
    }).then(res => res.json()).then(data => {
      setGlobalFeatures(prev => ({ ...prev, [featureName]: data.enabled ? '1' : '0' }));
      setProcessingGlobal(null);
      setEditingGlobalFeature(null);
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(new Date(dateString));
  };

  return (
    <Layout>
      <h1>Admin Dashboard</h1>
      
      {/* GLOBAL SETTINGS */}
      <div className="card" style={{ borderLeft: '5px solid #0A75BD' }}>
        <h2 style={{ marginTop: 0 }}>🌐 Global Feature Flags (Maintenance Mode)</h2>
        <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Matikan fitur di sini akan berdampak pada <b>seluruh pengguna</b>.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          {[
            { id: 'checkout_enabled', label: '🛒 Sistem Checkout' },
            { id: 'auction_enabled', label: '🔨 Sistem Lelang' },
            { id: 'chat_enabled', label: '💬 Fitur Chat' }
          ].map(feat => {
            const isEnabled = globalFeatures[feat.id] === '1';
            const isEditing = editingGlobalFeature === feat.id;
            return (
              <div key={feat.id} style={{ 
                padding: '1rem', borderRadius: '8px', 
                background: isEnabled ? '#f0fdf4' : '#fef2f2',
                border: '1px solid ' + (isEnabled ? '#bbf7d0' : '#fecaca')
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{feat.label}</strong>
                  <button 
                    className={`btn btn-sm ${isEnabled ? 'btn-danger' : 'btn-primary'}`}
                    onClick={() => handleToggleGlobal(feat.id)}
                    disabled={!!processingGlobal}
                  >
                    {processingGlobal === feat.id ? 'Loading...' : (isEnabled ? 'Matikan Global' : 'Nyalakan')}
                  </button>
                </div>
                {isEditing && (
                  <div style={{ marginTop: '10px' }}>
                    <textarea 
                      placeholder="Alasan maintenance (Wajib, Min. 20 huruf)..." 
                      value={globalReason} onChange={e => setGlobalReason(e.target.value)} rows="2"
                    />
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button className="btn btn-sm btn-outline" onClick={() => setEditingGlobalFeature(null)}>Batal</button>
                      <button className="btn btn-sm btn-danger" onClick={() => executeGlobalChange(feat.id, false)}>Konfirmasi</button>
                    </div>
                  </div>
                )}
                {!isEnabled && !isEditing && <small style={{ color: '#991b1b', display: 'block', marginTop: '5px' }}>⚠️ Status: MAINTENANCE</small>}
              </div>
            );
          })}
        </div>
      </div>

      {/* USER MANAGEMENT */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>👥 User Management</h2>
          <button className="btn btn-outline btn-sm" onClick={fetchUsers}>🔄 Refresh</button>
        </div>

        {/* FILTER CONTROL */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div className="btn-group" style={{ display: 'flex', gap: '5px' }}>
            <button className={`btn btn-sm ${filterRole === 'ALL' ? 'btn-primary' : 'btn-outline'}`} onClick={() => handleFilterChange('ALL')}>Semua</button>
            <button className={`btn btn-sm ${filterRole === 'BUYER' ? 'btn-primary' : 'btn-outline'}`} onClick={() => handleFilterChange('BUYER')}>Buyer</button>
            <button className={`btn btn-sm ${filterRole === 'SELLER' ? 'btn-primary' : 'btn-outline'}`} onClick={() => handleFilterChange('SELLER')}>Seller</button>
          </div>
          <input 
            type="text" 
            placeholder="🔍 Cari user berdasarkan Nama atau Email..." 
            value={search}
            onChange={handleSearchChange}
            style={{ flex: 1, minWidth: '200px', margin: 0 }} 
          />
        </div>

        {/* TABLE */}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Nama Lengkap</th><th>Email</th><th>Role</th><th>Saldo</th><th>Tanggal Daftar</th><th style={{ textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loadingUsers ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>Memuat data users...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>Tidak ada user ditemukan.</td></tr>
              ) : (
                users.map(user => (
                  <tr key={user.user_id}>
                    <td>#{user.user_id}</td>
                    <td><b>{user.name}</b></td>
                    <td>{user.email}</td>
                    <td><span className={`badge badge-${user.role.toLowerCase()}`}>{user.role}</span></td>
                    <td>Rp {user.balance ? parseInt(user.balance).toLocaleString() : '0'}</td>
                    <td style={{ fontSize: '0.85rem', color: '#555' }}>{formatDate(user.created_at)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="btn btn-outline btn-sm" onClick={() => handleOpenUserModal(user)}>⚙️ Kelola Flags</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION CONTROLS */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '20px' }}>
            <button 
                className="btn btn-outline btn-sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            >
                &laquo; Sebelumnya
            </button>
            
            <span style={{ fontSize: '0.9rem', color: '#555' }}>
                Halaman <b>{currentPage}</b> dari <b>{totalPages}</b>
            </span>

            <button 
                className="btn btn-outline btn-sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            >
                Selanjutnya &raquo;
            </button>
        </div>

      </div>

      {/* MODAL USER FLAGS (TETAP SAMA) */}
      {selectedUser && (
        <div className="modal-overlay">
          <div className="modal-content">
             {/* Isi modal disamakan dengan kode sebelumnya */}
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Kelola Akses User</h3>
              <button onClick={() => setSelectedUser(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            
            <div style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #eee' }}>
              <div>User: <b>{selectedUser.name}</b></div>
              <small style={{ color: '#666' }}>{selectedUser.email}</small>
            </div>

            {loadingFlags ? <p>Memuat data akses...</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {['checkout_enabled', 'chat_enabled', 'auction_enabled'].map(ft => {
                  const isChecked = formFlags[ft] === true;
                  const label = ft.replace('_', ' ').toUpperCase();
                  return (
                    <div key={ft} style={{ padding: '12px', border: '1px solid ' + (isChecked ? '#e5e7eb' : '#fecaca'), borderRadius: '8px', background: isChecked ? 'white' : '#fef2f2' }}>
                      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '10px' }}>
                        <input type="checkbox" checked={isChecked} onChange={() => handleCheckboxChange(ft)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                        <span style={{ fontWeight: 600, color: isChecked ? '#333' : '#b91c1c' }}>{label} {isChecked ? '(Aktif)' : '(Non-Aktif)'}</span>
                      </label>
                      {!isChecked && (
                        <div style={{ marginTop: '10px', paddingLeft: '28px' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#b91c1c' }}>Alasan wajib diisi (Min. 10 karakter):</label>
                          <textarea value={formReasons[ft] || ''} onChange={(e) => handleReasonChange(ft, e.target.value)} placeholder="Contoh: User melakukan spam chat..." rows="2" style={{ width: '100%', marginTop: '5px', borderColor: '#fca5a5' }} />
                        </div>
                      )}
                    </div>
                  );
                })}
                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button className="btn btn-outline" onClick={() => setSelectedUser(null)}>Batal</button>
                  <button className="btn btn-primary" onClick={handleSaveUserFlags} disabled={savingFlags}>{savingFlags ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Dashboard;
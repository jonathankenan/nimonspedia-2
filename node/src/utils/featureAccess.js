const dbPool = require('../config/db');

const checkAccess = async (userId, featureName) => {
  try {
    // Ambil aturan User (Specific) ATAU Global (NULL)
    const [rows] = await dbPool.query(
      `SELECT is_enabled, reason FROM user_feature_access 
       WHERE (user_id = ? OR user_id IS NULL) AND feature_name = ?`,
      [userId, featureName]
    );

    // Loop semua hasil. Jika ada SATU saja yang 0 (Mati), tolak akses.
    for (const row of rows) {
      if (row.is_enabled === 0) {
        return { 
          allowed: false, 
          reason: row.reason || 'Fitur sedang dinonaktifkan (Maintenance).' 
        };
      }
    }

    // Default Izinkan
    return { allowed: true };

  } catch (error) {
    console.error('Feature Flag Check Error:', error);
    // Safety first: Jika error database, lebih baik tolak akses daripada bocor
    return { allowed: false, reason: 'Terjadi kesalahan sistem saat mengecek fitur.' };
  }
};

module.exports = checkAccess;
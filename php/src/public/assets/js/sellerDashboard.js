// Format currency to Rupiah
function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

// Load dashboard statistics
async function loadStoreStats() {
    try {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', '/seller/api/store-stats.php', true);
        xhr.setRequestHeader('Accept', 'application/json');

        xhr.onload = function() {
            try {
                if (xhr.status !== 200) {
                    throw new Error(`HTTP error! status: ${xhr.status}`);
                }
                
                const data = JSON.parse(xhr.responseText);

                if (!data.success) {
                    throw new Error(data.message || 'Failed to load store statistics');
                }

                // Update stats
                document.getElementById('total-products').textContent = data.data.totalProducts ?? 0;
                document.getElementById('low-stock').textContent = data.data.lowStockProducts ?? 0;
                document.getElementById('pending-orders').textContent = data.data.pendingOrders ?? 0;
                document.getElementById('total-revenue').textContent = formatCurrency(data.data.totalRevenue ?? 0);
            } catch (error) {
                console.error('Error loading store stats:', error);
                const errorMessage = 'Error loading data';
                document.querySelectorAll('.stat-value').forEach(elem => {
                    elem.textContent = errorMessage;
                });
            }
        };

        xhr.onerror = function() {
            console.error('Error loading store stats: Network error');
            const errorMessage = 'Error loading data';
            document.querySelectorAll('.stat-value').forEach(elem => {
                elem.textContent = errorMessage;
            });
        };

        xhr.send();
    } catch (error) {
        console.error('Error loading store stats:', error);
        const errorMessage = 'Error loading data';
        document.querySelectorAll('.stat-value').forEach(elem => {
            elem.textContent = errorMessage;
        });
    }
}

// Toast notification function
function showToast(message, duration = 3000) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.display = 'block';
    toast.style.opacity = '1';
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 500);
    }, duration);
}

// Initialize event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Setup logo preview
    document.getElementById('storeLogo').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById('storeLogoPreview').src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    // Handle store edit form submission
    document.getElementById('editStoreForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Basic form validation
        const storeNameInput = document.getElementById('storeName');
        const storeDescription = document.getElementById('storeDescription').value.trim();
        const saveButton = this.querySelector('button[type="submit"]');
        
        if (!storeNameInput.value.trim()) {
            alert('Nama toko tidak boleh kosong');
            return;
        }

        // Disable submit button and show loading state
        saveButton.disabled = true;
        saveButton.textContent = 'Menyimpan...';

        try {
            // Create FormData object to handle file upload
            const formData = new FormData(this);
            
            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/seller/api/update-store.php', true);
            xhr.setRequestHeader('Accept', 'application/json');

            xhr.onload = function() {
                try {
                    const result = JSON.parse(xhr.responseText);
                    
                    if (result.success) {
                        // Update display with fade effect if elements exist
                        const displayName = document.getElementById('displayStoreName');
                        const displayDesc = document.getElementById('displayStoreDescription');
                        
                        if (displayName && displayDesc) {
                            displayName.style.opacity = '0';
                            displayDesc.style.opacity = '0';
                            
                            setTimeout(() => {
                                displayName.textContent = storeNameInput.value.trim();
                                displayDesc.textContent = storeDescription || 'Belum ada deskripsi';
                                displayName.style.opacity = '1';
                                displayDesc.style.opacity = '1';
                            }, 300);
                        }
                        
                        // Update preview if image was part of the update
                        if (result.data && result.data.store_logo_path) {
                            document.getElementById('storeLogoPreview').src = result.data.store_logo_path;
                        }
                        
                        showToast('Informasi toko berhasil diperbarui!');
                    } else {
                        throw new Error(result.message || 'Gagal memperbarui informasi toko');
                    }
                } catch (error) {
                    console.error('Error updating store:', error);
                    alert('Terjadi kesalahan: ' + error.message);
                } finally {
                    // Re-enable submit button and restore text
                    saveButton.disabled = false;
                    saveButton.textContent = 'Simpan Perubahan';
                }
            };

            xhr.onerror = function() {
                console.error('Error updating store: Network error');
                alert('Terjadi kesalahan jaringan');
                // Re-enable submit button and restore text
                saveButton.disabled = false;
                saveButton.textContent = 'Simpan Perubahan';
            };

            xhr.send(formData);
        } catch (error) {
            console.error('Error updating store:', error);
            alert('Terjadi kesalahan: ' + error.message);
            // Re-enable submit button and restore text
            saveButton.disabled = false;
            saveButton.textContent = 'Simpan Perubahan';
        }
    });

    // Load initial stats
    loadStoreStats();
    // Refresh stats every minute
    setInterval(loadStoreStats, 60000);
});
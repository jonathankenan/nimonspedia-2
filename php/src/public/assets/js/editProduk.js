document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('editProductForm');
    const submitButton = document.getElementById('submitButton');
    const productImage = document.getElementById('productImage');
    const imagePreview = document.getElementById('imagePreview');
    const toast = document.getElementById('toast');
    const modal = document.getElementById('confirmationModal');
    const confirmSaveBtn = document.getElementById('confirmSave');
    const cancelSaveBtn = document.getElementById('cancelSave');
    const progressBar = document.querySelector('.upload-progress');
    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');

    let formData = null;

    // Character counter untuk input text
    [
        { id: 'productName', maxLength: 200 },
        { id: 'productDescription', maxLength: 1000 }
    ].forEach(({ id, maxLength }) => {
        const element = document.getElementById(id);
        if (!element) return;
        
        const counter = element.parentElement.querySelector('.char-counter');
        if (!counter) return;

        // Set initial count
        counter.textContent = `${element.value.length}/${maxLength}`;

        element.addEventListener('input', function() {
            counter.textContent = `${this.value.length}/${maxLength}`;
        });
    });

    // Preview image when new file is selected
    productImage.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validasi ukuran file (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            showToast('Ukuran file terlalu besar (max 2MB)', 'error');
            this.value = '';
            return;
        }

        // Validasi tipe file
        const validTypes = ['image/jpg', 'image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            showToast('Format file tidak didukung (JPG, JPEG, PNG, WEBP only)', 'error');
            this.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            imagePreview.src = e.target.result;
        }
        reader.readAsDataURL(file);
    });

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        const formData = new FormData(this);
        submitChanges(formData);
    });

    // Submit form data
    function submitChanges(formData) {
        const submitButton = document.getElementById('submitButton');
        const progressBar = document.querySelector('.upload-progress');
        const progressFill = progressBar ? progressBar.querySelector('.progress-fill') : null;
        const progressText = progressBar ? progressBar.querySelector('.progress-text') : null;

        if (submitButton) {
            submitButton.disabled = true;
        }
        if (progressBar) {
            progressBar.style.display = 'block';
        }

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/seller/api/update-product.php', true);
        
        // Add request headers
        xhr.setRequestHeader('Accept', 'application/json');
        
        console.log('Sending request to:', xhr.responseURL);

        xhr.upload.onprogress = function(e) {
            if (e.lengthComputable && progressFill) {
                const percentComplete = Math.round((e.loaded * 100) / e.total);
                progressFill.style.width = percentComplete + '%';
            }
        };

        xhr.onload = function() {
            console.log('Response Status:', xhr.status);
            console.log('Response Headers:', xhr.getAllResponseHeaders());
            console.log('Response Type:', xhr.responseType);
            console.log('Content-Type:', xhr.getResponseHeader('Content-Type'));
            console.log('Raw Response:', xhr.responseText);
            
            try {
                // Check if the response is HTML (indicates a PHP error)
                if (xhr.responseText.trim().startsWith('<!DOCTYPE html>') || 
                    xhr.responseText.trim().startsWith('<br') ||
                    xhr.responseText.trim().startsWith('<html')) {
                    console.error('Received HTML response instead of JSON');
                    showToast('Terjadi kesalahan server', 'error');
                    if (submitButton) submitButton.disabled = false;
                    return;
                }
                
                const response = JSON.parse(xhr.responseText);
                if (xhr.status === 200) {
                    showToast('Produk berhasil diperbarui', 'success');
                    setTimeout(() => {
                        window.location.href = '/seller/kelola_produk.php';
                    }, 2000);
                } else {
                    throw new Error(response.message || 'Terjadi kesalahan');
                }
            } catch (error) {
                console.error('Error:', error);
                showToast(error.message || 'Terjadi kesalahan server', 'error');
                if (submitButton) submitButton.disabled = false;
            }
            if (progressBar) progressBar.style.display = 'none';
        };

        xhr.onerror = function() {
            showToast('Terjadi kesalahan jaringan', 'error');
            if (submitButton) submitButton.disabled = false;
            if (progressBar) progressBar.style.display = 'none';
        };

        xhr.send(formData);
    }

    function validateForm() {
        const name = document.getElementById('productName').value;
        const description = document.getElementById('productDescription').value;
        const price = document.getElementById('productPrice').value;
        const stock = document.getElementById('productStock').value;
        const categories = document.getElementById('categories');

        if (name.length < 1 || name.length > 200) {
            showToast('Nama produk harus antara 1-200 karakter', 'error');
            return false;
        }

        if (description.length < 1 || description.length > 1000) {
            showToast('Deskripsi harus antara 1-1000 karakter', 'error');
            return false;
        }

        if (parseInt(price) < 1000) {
            showToast('Harga minimal Rp 1.000', 'error');
            return false;
        }

        if (parseInt(stock) < 0) {
            showToast('Stok tidak boleh negatif', 'error');
            return false;
        }

        if (categories.selectedOptions.length === 0) {
            showToast('Pilih minimal 1 kategori', 'error');
            return false;
        }

        return true;
    }

    function showToast(message, type = 'success') {
        toast.textContent = message;
        toast.style.display = 'block';
        toast.style.backgroundColor = type === 'success' ? '#4CAF50' : '#f44336';

        setTimeout(() => {
            toast.style.display = 'none';
        }, 3000);
    }
});
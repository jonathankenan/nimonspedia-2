document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('addProductForm');
    const submitButton = document.getElementById('submitButton');
    const productImage = document.getElementById('productImage');
    const imagePreview = document.getElementById('imagePreview');
    const changeImageBtn = document.getElementById('changeImage');
    const toast = document.getElementById('toast');
    const progressBar = document.querySelector('.upload-progress');
    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');

    // Character counter untuk input text
    [
        { id: 'productName', maxLength: 200 },
        { id: 'productDescription', maxLength: 1000 }
    ].forEach(({ id, maxLength }) => {
        const element = document.getElementById(id);
        if (!element) {
            console.error(`Element with id '${id}' not found`);
            return;
        }
        const counter = element.parentElement.querySelector('.char-counter');
        if (!counter) {
            console.error(`Counter not found for element '${id}'`);
            return;
        }

        element.addEventListener('input', function() {
            const remaining = maxLength - this.value.length;
            counter.textContent = `${this.value.length}/${maxLength}`;
        });
    });

    // Preview image
    productImage.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validasi ukuran file (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            showToast('Ukuran file terlalu besar (max 2MB)', 'error');
            this.value = '';
            return;
        }
        
        // Convert file type to lowercase for case-insensitive comparison
        const fileType = file.type.toLowerCase();
        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        
        // Check file extension as backup
        const extension = file.name.split('.').pop().toLowerCase();
        const validExtensions = ['jpg', 'jpeg', 'png', 'webp'];
        
        if (!validTypes.includes(fileType) && !validExtensions.includes(extension)) {
            showToast('Format file tidak didukung (JPG, JPEG, PNG, WEBP only)', 'error');
            this.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block'; // Show preview image
            if (imagePreview.parentElement) {
                imagePreview.parentElement.style.display = '';
            }
            if (changeImageBtn) {
                changeImageBtn.style.display = 'inline-block';
            }
        }
        reader.readAsDataURL(file);
    });

    // Handle form submission
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        submitButton.disabled = true;
        progressBar.style.display = 'block';

        const formData = new FormData(this);
        
        // Convert categories from select multiple to array
        const categories = Array.from(document.getElementById('categories').selectedOptions)
            .map(option => option.value);
        formData.delete('categories[]');
        categories.forEach(cat => formData.append('categories[]', cat));

        try {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/api/products/create.php', true);
            
            xhr.upload.onprogress = (progressEvent) => {
                const percentComplete = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                progressFill.style.width = percentComplete + '%';
                progressText.textContent = `Mengupload... ${percentComplete}%`;
            };
            
            xhr.onload = function() {
                console.log('=== Response Debug ===');
                console.log('Status:', xhr.status);
                console.log('Status Text:', xhr.statusText);
                console.log('Response Headers:', xhr.getAllResponseHeaders());
                console.log('Raw Response:', xhr.responseText);
                console.log('====================');

                try {
                    const response = JSON.parse(xhr.responseText);
                    if (xhr.status === 201) {
                        showToast('Produk berhasil ditambahkan');
                        setTimeout(() => {
                            window.location.href = '/seller/kelola_produk.php';
                        }, 2000);
                    } else {
                        console.error('Server responded with error:', response);
                        showToast(response.message || 'Terjadi kesalahan', 'error');
                        submitButton.disabled = false;
                        progressBar.style.display = 'none';
                    }
                } catch (error) {
                    console.error('=== Error Debug ===');
                    console.error('Parse Error:', error);
                    console.error('Raw Response:', xhr.responseText);
                    console.error('Status:', xhr.status);
                    console.error('===================');
                    showToast('Terjadi kesalahan server. Cek console untuk detail (F12 -> Console)', 'error');
                    submitButton.disabled = false;
                    progressBar.style.display = 'none';
                }
            };
            
            xhr.onerror = function() {
                showToast('Terjadi kesalahan jaringan', 'error');
                submitButton.disabled = false;
                progressBar.style.display = 'none';
            };
            
            xhr.send(formData);
        } catch (error) {
            showToast(error.message, 'error');
            submitButton.disabled = false;
            progressBar.style.display = 'none';
        }
    });

    function validateForm() {
        const name = document.getElementById('productName').value;
        const description = document.getElementById('productDescription').value;
        const price = document.getElementById('price').value;
        const stock = document.getElementById('stock').value;
        const categories = document.getElementById('categories');
        const image = document.getElementById('productImage').files[0];

        if (name.length < 1 || name.length > 200) {
            showToast('Nama produk harus antara 1-200 karakter', 'error');
            return false;
        }

        if (description.length < 1 || description.length > 1000) {
            showToast('Deskripsi harus antara 1-1000 karakter', 'error');
            return false;
        }

        if (price < 1000) {
            showToast('Harga minimal Rp 1.000', 'error');
            return false;
        }

        if (stock < 0) {
            showToast('Stok tidak boleh negatif', 'error');
            return false;
        }

        if (categories.selectedOptions.length === 0) {
            showToast('Pilih minimal 1 kategori', 'error');
            return false;
        }

        if (!image) {
            showToast('Upload foto produk', 'error');
            return false;
        }

        return true;
    }

    function showToast(message, type = 'success') {
        toast.textContent = message;
        toast.className = 'toast show';
        if (type === 'error') {
            toast.classList.add('error');
        }

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
});
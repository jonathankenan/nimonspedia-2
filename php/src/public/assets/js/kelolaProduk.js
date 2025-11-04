document.addEventListener('DOMContentLoaded', function() {
    const deleteModal = document.getElementById('deleteModal');
    const confirmDeleteBtn = document.getElementById('confirmDelete');
    const cancelDeleteBtn = document.getElementById('cancelDelete');
    const toast = document.getElementById('toast');
    
    let productToDelete = null;

    // Show delete confirmation modal
    window.confirmDelete = function(productId) {
        productToDelete = productId;
        // PERBAIKAN: Gunakan classList.add()
        deleteModal.classList.add('show');
    }

    // Handle delete confirmation
    confirmDeleteBtn.addEventListener('click', function() {
        if (!productToDelete) return;
        
        deleteProduct(productToDelete);
        // PERBAIKAN: Gunakan classList.remove()
        deleteModal.classList.remove('show');
    });

    // Handle delete cancellation
    cancelDeleteBtn.addEventListener('click', function() {
        // PERBAIKAN: Gunakan classList.remove()
        deleteModal.classList.remove('show');
        productToDelete = null;
    });

    // Delete product function
    function deleteProduct(productId) {
        const xhr = new XMLHttpRequest();
        xhr.open('DELETE', `/api/products/delete.php?id=${productId}`, true);
        xhr.setRequestHeader('Accept', 'application/json');

        xhr.onload = function() {
            try {
                const contentType = xhr.getResponseHeader('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error(xhr.responseText || 'Server returned non-JSON response');
                }
                
                const data = JSON.parse(xhr.responseText);
                
                if (data.success) {
                    showToast('Produk berhasil dihapus');
                    // Remove the product card from DOM
                    const productCard = document.querySelector(`[data-product-id="${productId}"]`);
                    if (productCard) {
                        productCard.remove();
                    }
                    // If no products left, show empty state
                    const productList = document.querySelector('.product-list');
                    if (!productList.children.length) {
                        location.reload();
                    }
                } else {
                    throw new Error(data.message || 'Failed to delete product');
                }
            } catch (error) {
                console.error('Delete error:', error);
                let errorMessage = error.message;
                // Clean up error message if it contains HTML
                if (errorMessage.includes('<br />') || errorMessage.includes('<b>')) {
                    errorMessage = 'Server error occurred. Please try again.';
                }
                showToast(errorMessage || 'Failed to delete product', 'error');
            }
        };

        xhr.onerror = function() {
            console.error('Delete error: Network error');
            showToast('Failed to delete product', 'error');
        };

        xhr.send();
    }

    // Show toast message
    function showToast(message, type = 'success') {
        toast.textContent = message;
        // PERBAIKAN: Gunakan classList untuk toast juga
        toast.className = 'toast show'; 
        if (type === 'error') {
            toast.classList.add('error');
        }

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
});
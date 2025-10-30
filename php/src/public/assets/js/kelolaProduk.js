document.addEventListener('DOMContentLoaded', function() {
    const deleteModal = document.getElementById('deleteModal');
    const confirmDeleteBtn = document.getElementById('confirmDelete');
    const cancelDeleteBtn = document.getElementById('cancelDelete');
    const toast = document.getElementById('toast');
    
    let productToDelete = null;

    // Show delete confirmation modal
    window.confirmDelete = function(productId) {
        productToDelete = productId;
        deleteModal.style.display = 'flex';
    }

    // Handle delete confirmation
    confirmDeleteBtn.addEventListener('click', function() {
        if (!productToDelete) return;
        
        deleteProduct(productToDelete);
        deleteModal.style.display = 'none';
    });

    // Handle delete cancellation
    cancelDeleteBtn.addEventListener('click', function() {
        deleteModal.style.display = 'none';
        productToDelete = null;
    });

    // Delete product function
    function deleteProduct(productId) {
        fetch(`/api/products/delete.php?id=${productId}`, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json'
            }
        })
        .then(async response => {
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                // Try to get the error text if possible
                const text = await response.text();
                throw new Error(text || 'Server returned non-JSON response');
            }
            return response.json();
        })
        .then(data => {
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
        })
        .catch(error => {
            console.error('Delete error:', error);
            let errorMessage = error.message;
            // Clean up error message if it contains HTML
            if (errorMessage.includes('<br />') || errorMessage.includes('<b>')) {
                errorMessage = 'Server error occurred. Please try again.';
            }
            showToast(errorMessage || 'Failed to delete product', 'error');
        });
    }

    // Show toast message
    function showToast(message, type = 'success') {
        toast.textContent = message;
        toast.style.display = 'block';
        toast.style.backgroundColor = type === 'success' ? '#4CAF50' : '#f44336';

        setTimeout(() => {
            toast.style.display = 'none';
        }, 3000);
    }
});
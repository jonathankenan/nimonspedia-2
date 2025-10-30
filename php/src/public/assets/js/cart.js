document.addEventListener('DOMContentLoaded', () => {
    const confirmModal = document.getElementById('confirm-delete-modal');
    const confirmBtn = document.getElementById('confirm-delete-btn');
    const cancelBtn = document.getElementById('cancel-delete-btn');
    const loadingOverlay = document.getElementById('loading-overlay');
    let itemToDelete = null;

    function showLoading() {
        loadingOverlay.classList.add('show');
    }

    function hideLoading() {
        loadingOverlay.classList.remove('show');
    }

    function updateSummary() {
        const stores = {};
        let grandTotal = 0;
        let totalItems = 0;
        document.querySelectorAll('.store-group').forEach(storeEl => {
            let storeTotal = 0;
            const storeId = storeEl.dataset.storeId;
            const storeName = storeEl.querySelector('h2').textContent;
            storeEl.querySelectorAll('.cart-item').forEach(itemEl => {
                const price = parseFloat(itemEl.querySelector('.product-price').textContent.replace(/[^0-9]/g, ''));
                const quantity = parseInt(itemEl.querySelector('.quantity-input').value);
                totalItems += quantity;
                const subtotal = price * quantity;
                itemEl.querySelector('.subtotal-value').textContent = subtotal.toLocaleString('id-ID');
                storeTotal += subtotal;
            });
            if (storeEl.querySelectorAll('.cart-item').length > 0) {
                 stores[storeId] = { name: storeName, total: storeTotal };
            } else {
                storeEl.remove();
            }
            grandTotal += storeTotal;
        });
        const summaryDetails = document.getElementById('summary-details');
        if(summaryDetails) {
            summaryDetails.innerHTML = '';
            for (const storeId in stores) {
                const store = stores[storeId];
                const storeDiv = document.createElement('div');
                storeDiv.className = 'summary-per-store';
                storeDiv.innerHTML = `<p>${store.name}</p><p>Rp ${store.total.toLocaleString('id-ID')}</p>`;
                summaryDetails.appendChild(storeDiv);
            }
        }
        const totalItemsEl = document.getElementById('summary-total-items');
        if(totalItemsEl) totalItemsEl.textContent = totalItems;
        const grandTotalEl = document.getElementById('grand-total-value');
        if(grandTotalEl) grandTotalEl.textContent = `Rp ${grandTotal.toLocaleString('id-ID')}`;
        if (Object.keys(stores).length === 0 && document.querySelector('.cart-items')) {
            document.querySelector('.cart-layout').innerHTML = `
                <div class="empty-state">
                    <p>Keranjang Anda sekarang kosong.</p>
                    <a href="/buyer/dashboard.php" class="btn">Mulai Belanja</a>
                </div>`;
        }
    }

    async function handleQuantityChange(cartItemId, newQuantity) {
        const quantity = parseInt(newQuantity);
        if (quantity < 1) {
            const itemEl = document.querySelector(`.cart-item[data-item-id='${cartItemId}']`);
            if (itemEl) openModal(itemEl);
            return;
        }
        showLoading();
        try {
            // PERBARUI URL FETCH
            const response = await fetch('/buyer/cart.php?action=update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cart_item_id: cartItemId, quantity: quantity })
            });
            const result = await response.json();
            if (result.success) {
                updateSummary();
            } else {
                alert(result.message || 'Gagal memperbarui jumlah barang.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Terjadi kesalahan koneksi.');
        } finally {
            hideLoading();
        }
    }

    async function executeDelete() {
        if (!itemToDelete) return;
        showLoading();
        try {
            // PERBARUI URL FETCH
            const response = await fetch('/buyer/cart.php?action=remove', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cart_item_id: itemToDelete.dataset.itemId })
            });
            const result = await response.json();
            if (result.success) {
                itemToDelete.remove();
                const badge = document.querySelector('.cart .badge');
                if(badge) badge.textContent = result.new_cart_count;
                updateSummary();
            } else {
                alert(result.message || 'Gagal menghapus barang.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Terjadi kesalahan koneksi.');
        } finally {
            closeModal(true);
            hideLoading();
        }
    }
    
    function openModal(itemElement) {
        itemToDelete = itemElement;
        confirmModal.classList.add('show');
    }

    function closeModal(isDeleted = false) {
        if (!isDeleted && itemToDelete) {
            const quantityInput = itemToDelete.querySelector('.quantity-input');
            if (parseInt(quantityInput.value) < 1) {
                quantityInput.value = 1;
            }
        }
        itemToDelete = null;
        confirmModal.classList.remove('show');
    }

    cancelBtn.addEventListener('click', () => closeModal(false));
    confirmBtn.addEventListener('click', executeDelete);
    
    let debounceTimeout;
    function debounce(func, delay) {
        return function(...args) {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => func.apply(this, args), delay);
        };
    }

    document.querySelectorAll('.cart-item').forEach(itemEl => {
        const quantityInput = itemEl.querySelector('.quantity-input');
        const debouncedUpdate = debounce(handleQuantityChange, 500);

        itemEl.querySelector('.plus').addEventListener('click', () => {
            quantityInput.stepUp();
            debouncedUpdate(itemEl.dataset.itemId, quantityInput.value);
        });
        
        itemEl.querySelector('.minus').addEventListener('click', () => {
            quantityInput.stepDown();
            handleQuantityChange(itemEl.dataset.itemId, quantityInput.value);
        });

        quantityInput.addEventListener('change', () => {
            if (parseInt(quantityInput.value) < 0 || isNaN(parseInt(quantityInput.value))) {
                quantityInput.value = 0;
            }
            handleQuantityChange(itemEl.dataset.itemId, quantityInput.value);
        });

        itemEl.querySelector('.delete-btn').addEventListener('click', () => {
            openModal(itemEl);
        });
    });

    updateSummary();
});
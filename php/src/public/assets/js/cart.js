document.addEventListener('DOMContentLoaded', () => {

    function updateSummary() {
        const stores = {};
        let grandTotal = 0;

        document.querySelectorAll('.store-group').forEach(storeEl => {
            let storeTotal = 0;
            const storeId = storeEl.dataset.storeId;
            const storeName = storeEl.querySelector('h2').textContent;

            storeEl.querySelectorAll('.cart-item').forEach(itemEl => {
                const price = parseFloat(itemEl.querySelector('.product-price').textContent.replace(/[^0-9]/g, ''));
                const quantity = parseInt(itemEl.querySelector('.quantity-input').value);
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
        summaryDetails.innerHTML = '';
        for (const storeId in stores) {
            const store = stores[storeId];
            const storeDiv = document.createElement('div');
            storeDiv.className = 'summary-per-store';
            storeDiv.innerHTML = `<p>${store.name}</p><p>Rp ${store.total.toLocaleString('id-ID')}</p>`;
            summaryDetails.appendChild(storeDiv);
        }

        document.getElementById('grand-total-value').textContent = `Rp ${grandTotal.toLocaleString('id-ID')}`;

        if (Object.keys(stores).length === 0 && document.querySelector('.cart-items')) {
            document.querySelector('.cart-layout').innerHTML = `
                <div class="empty-state">
                    <p>Keranjang Anda sekarang kosong.</p>
                    <a href="/buyer/dashboard.php" class="btn">Mulai Belanja</a>
                </div>`;
        }
    }

    async function handleQuantityChange(cartItemId, newQuantity) {
        try {
            const response = await fetch('/buyer/update_cart_item.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cart_item_id: cartItemId, quantity: newQuantity })
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
        }
    }

    async function handleDeleteItem(cartItemEl) {
        if (confirm('Anda yakin ingin menghapus item ini dari keranjang?')) {
            const cartItemId = cartItemEl.dataset.itemId;
            try {
                const response = await fetch('/buyer/remove_from_cart.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cart_item_id: cartItemId })
                });
                const result = await response.json();
                if (result.success) {
                    cartItemEl.remove();
                    // Update badge di navbar
                    const badge = document.querySelector('.cart .badge');
                    if(badge) badge.textContent = result.new_cart_count;
                    
                    updateSummary();
                } else {
                    alert(result.message || 'Gagal menghapus barang.');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Terjadi kesalahan koneksi.');
            }
        }
    }

    // Debounce function to prevent excessive AJAX calls
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
            if (quantityInput.value > 1) {
                quantityInput.stepDown();
                debouncedUpdate(itemEl.dataset.itemId, quantityInput.value);
            }
        });
        quantityInput.addEventListener('change', () => {
            debouncedUpdate(itemEl.dataset.itemId, quantityInput.value);
        });

        itemEl.querySelector('.delete-btn').addEventListener('click', () => {
            handleDeleteItem(itemEl);
        });
    });

    updateSummary();
});
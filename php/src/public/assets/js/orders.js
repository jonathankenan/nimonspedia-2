document.addEventListener('DOMContentLoaded', () => {
    const receptionModal = document.getElementById('confirm-reception-modal');
    const confirmBtn = document.getElementById('confirm-reception-btn');
    const cancelBtn = document.getElementById('cancel-reception-btn');
    const closeModalBtn = document.getElementById('close-reception-modal');

    let orderToConfirm = null;
    let confirmButtonElement = null;

    // Fungsi untuk membuka modal
    function openReceptionModal(orderId, button) {
        orderToConfirm = orderId;
        confirmButtonElement = button;
        if (receptionModal) {
            receptionModal.style.display = 'block';
        }
    }
    // Fungsi untuk menutup modal
    function closeReceptionModal() {
        if (receptionModal) {
            receptionModal.style.display = 'none';
        }
        orderToConfirm = null;
        confirmButtonElement = null; 
    }

    if(cancelBtn) {
        cancelBtn.addEventListener('click', closeReceptionModal);
    }
    if(closeModalBtn) {
        closeModalBtn.addEventListener('click', closeReceptionModal);
    }
    window.addEventListener('click', (event) => {
        if (event.target == receptionModal) {
            closeReceptionModal();
        }
    });

    // Toggle detail order
    document.querySelectorAll('.order-card .btn-detail').forEach(button => {
        button.addEventListener('click', () => {
            const card = button.closest('.order-card');
            const details = card.querySelector('.order-details');
            
            if (details.style.display === 'block') {
                details.style.display = 'none';
                button.textContent = 'Lihat Detail';
            } else {
                details.style.display = 'block';
                button.textContent = 'Sembunyikan Detail';
            }
        });
    });

    // Tombol konfirmasi penerimaan
    document.querySelectorAll('.btn-confirm-received').forEach(button => {
        button.addEventListener('click', (e) => {
            const orderId = button.dataset.orderId;
            openReceptionModal(orderId, button);
        });
    });

    // Tangani konfirmasi penerimaan
    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            
            const currentOrderId = orderToConfirm; 
            if (!currentOrderId) return; 

            const button = confirmButtonElement; 

            closeReceptionModal();

            if (button) {
                button.disabled = true;
                button.textContent = 'Memproses...';
            }

            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/buyer/api/confirm_order.php', true);
            xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
            xhr.setRequestHeader('Accept', 'application/json');

            xhr.onload = function() {
                try {
                    const response = JSON.parse(xhr.responseText);

                    if (xhr.status === 200 && response.success) {

                        const card = button.closest('.order-card');
                        const statusBadge = card.querySelector('.status-badge');
                        
                        if (statusBadge) {
                            statusBadge.textContent = 'Received';
                            statusBadge.className = 'status-badge status-received';
                        }
                        
                        if (button) {
                            button.closest('.order-confirmation-action').remove(); 
                        }
                        
                        const details = card.querySelector('.order-details');
                        if (details.style.display !== 'block') {
                            details.style.display = 'block';
                            const detailButton = card.querySelector('.btn-detail');
                            if(detailButton) detailButton.textContent = 'Sembunyikan Detail';
                        }

                    } else {
                        alert('Gagal: ' + response.message);
                        if (button) {
                            button.disabled = false;
                            button.textContent = 'Konfirmasi Terima Barang';
                        }
                    }
                } catch (e) {
                    alert('Terjadi kesalahan saat memproses respons server.');
                    if (button) {
                        button.disabled = false;
                        button.textContent = 'Konfirmasi Terima Barang';
                    }
                }
            };

            xhr.onerror = function() {
                alert('Terjadi kesalahan jaringan. Coba lagi.');
                if (button) {
                    button.disabled = false;
                    button.textContent = 'Konfirmasi Terima Barang';
                }
            };

            xhr.send(JSON.stringify({ order_id: currentOrderId }));
        });
    }
});
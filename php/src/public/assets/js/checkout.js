document.addEventListener('DOMContentLoaded', () => {
    // Logika untuk link Top-up
    const topupLink = document.getElementById('topup-link');
    if (topupLink) {
        topupLink.addEventListener('click', (e) => {
            e.preventDefault();
            const balanceModal = document.getElementById('topup-modal');
            if (balanceModal) {
                balanceModal.style.display = 'block';
            }
        });
    }

    // Konfirmasi Checkout
    const checkoutForm = document.getElementById('checkout-form');
    const payButton = document.getElementById('pay-button');
    const confirmModal = document.getElementById('confirm-checkout-modal');
    const cancelBtn = document.getElementById('cancel-checkout-btn');
    const confirmBtn = document.getElementById('confirm-checkout-btn');

    // Pastikan semua elemen ada sebelum menambahkan event listener
    if (checkoutForm && payButton && confirmModal) {
        
        // Ganti event listener dari form ke tombol "Bayar Sekarang"
        payButton.addEventListener('click', (e) => {
            e.preventDefault();
            confirmModal.classList.add('show');
        });

        // Jika batal diklik, sembunyikan modal
        cancelBtn.addEventListener('click', () => {
            confirmModal.classList.remove('show');
        });
        // Jika ya diklik, submit form secara manual
        confirmBtn.addEventListener('click', () => {
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Memproses...';
            checkoutForm.submit();
        });
    }
});
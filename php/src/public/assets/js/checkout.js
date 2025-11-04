document.addEventListener('DOMContentLoaded', () => {
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

    const checkoutForm = document.getElementById('checkout-form');
    const payButton = document.getElementById('pay-button');
    const confirmModal = document.getElementById('confirm-checkout-modal');
    const cancelBtn = document.getElementById('cancel-checkout-btn');
    const confirmBtn = document.getElementById('confirm-checkout-btn');

    if (checkoutForm && payButton && confirmModal) {
        
        payButton.addEventListener('click', (e) => {
            e.preventDefault();
            confirmModal.classList.add('show');
        });

        cancelBtn.addEventListener('click', () => {
            confirmModal.classList.remove('show');
        });
        confirmBtn.addEventListener('click', () => {
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Memproses...';
            checkoutForm.submit();
        });
    }
});
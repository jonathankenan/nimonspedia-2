document.addEventListener('DOMContentLoaded', () => {
    const topupLink = document.getElementById('topup-link');
    if (topupLink) {
        topupLink.addEventListener('click', (e) => {
            e.preventDefault();
            // Panggil modal top-up dari navbar.js
            const balanceModal = document.getElementById('topup-modal');
            if (balanceModal) {
                balanceModal.style.display = 'block';
            }
        });
    }
});
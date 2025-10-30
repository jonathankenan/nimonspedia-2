document.addEventListener('DOMContentLoaded', () => {
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
});
document.addEventListener('DOMContentLoaded', () => {
    const filterBtn = document.getElementById('filter-btn');
    if (!filterBtn) return;

    filterBtn.addEventListener('click', () => {
        const params = new URLSearchParams(window.location.search);

        const category = document.getElementById('category')?.value || '';
        const minPrice = document.getElementById('min_price')?.value || '';
        const maxPrice = document.getElementById('max_price')?.value || '';

        params.set('category', category);
        params.set('min_price', minPrice);
        params.set('max_price', maxPrice);
        params.set('page', 1); // reset page

        window.location.search = params.toString();
    });
});

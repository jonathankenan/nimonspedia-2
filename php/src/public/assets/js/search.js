document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search');
    if (!searchInput) return;

    let timeout;
    searchInput.addEventListener('input', function() {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            const params = new URLSearchParams(window.location.search);
            params.set('search', this.value);
            params.set('page', 1); // reset page
            window.location.search = params.toString();
        }, 500); // debounce 500ms
    });
});

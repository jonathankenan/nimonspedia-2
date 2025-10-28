document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('search');
  const filterBtn = document.getElementById('filter-btn');

  if (searchInput) {
    let t;
    searchInput.addEventListener('input', function() {
      clearTimeout(t);
      t = setTimeout(() => {
        const params = new URLSearchParams(window.location.search);
        params.set('search', this.value);
        params.set('page', 1);
        window.location.search = params.toString();
      }, 500);
    });
  }

  if (filterBtn) {
    filterBtn.addEventListener('click', () => {
      const params = new URLSearchParams(window.location.search);
      const min = document.getElementById('min_price')?.value || '';
      const max = document.getElementById('max_price')?.value || '';
      params.set('min_price', min);
      params.set('max_price', max);
      params.set('page', 1);
      window.location.search = params.toString();
    });
  }
});



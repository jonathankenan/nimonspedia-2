document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById('store_logo_input');
    const preview = document.getElementById('store_logo_preview');

    if (!input || !preview) return;

    input.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            preview.src = URL.createObjectURL(file);
            preview.style.display = 'block';
        }
    });
});

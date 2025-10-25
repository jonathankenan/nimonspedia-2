document.addEventListener('DOMContentLoaded', () => {
    const passwordInput = document.getElementById('password');
    const confirmInput = document.getElementById('confirmPassword'); 
    const togglePassword = document.getElementById('togglePassword');
    
    const form = document.getElementById('registerForm');
    const submitBtn = document.getElementById('submitBtn');

    togglePassword.addEventListener('click', () => {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        confirmInput.type = type; 
        togglePassword.textContent = type === 'password' ? '👁️' : '🔒'; 
    });

    form.addEventListener('submit', () => {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Memproses...';
    });
});
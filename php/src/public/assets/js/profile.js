document.addEventListener("DOMContentLoaded", () => {
    const profileMsgInput = document.getElementById('profile-msg');
    const passwordMsgInput = document.getElementById('password-msg');
    const popup = document.getElementById('message-popup');
    const popupText = document.getElementById('popup-text');
    const popupClose = document.getElementById('popup-close');

    if (popup && popupText && popupClose && profileMsgInput && passwordMsgInput) {
        const profileMsg = profileMsgInput.value;
        const passwordMsg = passwordMsgInput.value;

        function showPopup(msg) {
            if (!msg || msg.trim() === "") return;
            popupText.textContent = msg;
            popup.classList.add('show');
        }

        popupClose.addEventListener('click', () => {
            popup.classList.remove('show');
        });

        popup.addEventListener("click", (e) => {
            if (e.target === popup) {
                popup.classList.remove('show');
            }
        });

        if (profileMsg) showPopup(profileMsg);
        else if (passwordMsg) showPopup(passwordMsg);
    }

    const passwordInputs = document.querySelectorAll('#password-form input[type="password"]');
    
    passwordInputs.forEach(input => {
        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'toggle-password';
        toggleBtn.textContent = 'Show';

        if (input.parentNode.classList.contains('password-wrapper')) {
            input.parentNode.appendChild(toggleBtn);
        }

        toggleBtn.addEventListener('click', () => {
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            toggleBtn.textContent = isPassword ? 'Hide' : 'Show';
        });
    });
});
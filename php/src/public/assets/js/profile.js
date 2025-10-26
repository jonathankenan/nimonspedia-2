const profileMsg = document.getElementById('profile-msg').value;
const passwordMsg = document.getElementById('password-msg').value;

const popup = document.getElementById('message-popup');
const popupText = document.getElementById('popup-text');
const popupClose = document.getElementById('popup-close');

function showPopup(msg) {
    if (!msg) return;
    popupText.textContent = msg;
    popup.style.display = 'block';
}

popupClose.addEventListener('click', () => {
    popup.style.display = 'none';
});

if (profileMsg) showPopup(profileMsg);
else if (passwordMsg) showPopup(passwordMsg);

document.querySelectorAll('#password-form input[type="password"]').forEach(input => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Show';
    input.after(btn);

    btn.addEventListener('click', () => {
        input.type = input.type === 'password' ? 'text' : 'password';
        btn.textContent = input.type === 'password' ? 'Show' : 'Hide';
    });
});

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

    // Push Notification Settings
    initPushNotifications();
});

// Push Notification Management
function initPushNotifications() {
    const userId = getUserIdFromSession();
    if (!userId) return;

    const statusEl = document.getElementById('subscription-status');
    const toggleBtn = document.getElementById('toggle-subscription');
    const categoriesDiv = document.getElementById('notification-categories');
    const unsupportedDiv = document.getElementById('notification-unsupported');
    const saveBtn = document.getElementById('save-preferences');
    const messageDiv = document.getElementById('preferences-message');

    // Check browser support
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        statusEl.textContent = 'Not Supported';
        unsupportedDiv.style.display = 'block';
        return;
    }

    let subscription = null;

    // Check current subscription status
    checkSubscriptionStatus();

    toggleBtn.addEventListener('click', async () => {
        if (subscription) {
            await unsubscribe();
        } else {
            await subscribe();
        }
    });

    saveBtn.addEventListener('click', savePreferences);

    async function checkSubscriptionStatus() {
        try {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration) {
                subscription = await registration.pushManager.getSubscription();
            }

            if (subscription) {
                statusEl.textContent = 'Subscribed ✓';
                statusEl.style.color = '#28a745';
                toggleBtn.textContent = 'Unsubscribe';
                toggleBtn.style.display = 'inline-block';
                categoriesDiv.style.display = 'block';
                await loadPreferences();
            } else {
                statusEl.textContent = 'Not Subscribed';
                statusEl.style.color = '#dc3545';
                toggleBtn.textContent = 'Subscribe';
                toggleBtn.style.display = 'inline-block';
            }
        } catch (error) {
            console.error('Failed to check subscription:', error);
            statusEl.textContent = 'Error';
        }
    }

    async function subscribe() {
        try {
            console.log('[Push] Starting subscription process...');
            console.log('[Push] User ID:', userId);

            // Register service worker
            console.log('[Push] Registering service worker...');
            const registration = await navigator.serviceWorker.register('/sw.js');
            await navigator.serviceWorker.ready;
            console.log('[Push] Service worker registered');

            // Get VAPID public key
            console.log('[Push] Fetching VAPID key...');
            const response = await fetch('http://localhost:8080/api/push/vapid-public-key');
            const data = await response.json();
            const vapidPublicKey = data.publicKey;
            console.log('[Push] VAPID key received:', vapidPublicKey.substring(0, 20) + '...');

            // Subscribe
            console.log('[Push] Subscribing to push...');
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
            });
            console.log('[Push] Subscription created:', subscription.endpoint.substring(0, 50) + '...');

            // Send to server
            console.log('[Push] Sending subscription to server...');
            const subscribeResponse = await fetch('http://localhost:8080/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userId,
                    subscription: subscription.toJSON()
                })
            });

            const subscribeData = await subscribeResponse.json();
            console.log('[Push] Server response:', subscribeData);

            if (!subscribeData.ok) {
                throw new Error(subscribeData.message || 'Failed to save subscription');
            }

            await checkSubscriptionStatus();
            showMessage('Berhasil subscribe ke push notifications!', 'success');
            console.log('[Push] ✅ Subscription complete!');
        } catch (error) {
            console.error('[Push] ❌ Subscribe failed:', error);
            showMessage('Gagal subscribe: ' + error.message, 'error');
        }
    }

    async function unsubscribe() {
        try {
            await subscription.unsubscribe();

            await fetch('http://localhost:8080/api/push/unsubscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userId,
                    endpoint: subscription.endpoint
                })
            });

            subscription = null;
            await checkSubscriptionStatus();
            categoriesDiv.style.display = 'none';
            showMessage('Berhasil unsubscribe dari push notifications', 'success');
        } catch (error) {
            console.error('Unsubscribe failed:', error);
            showMessage('Gagal unsubscribe: ' + error.message, 'error');
        }
    }

    async function loadPreferences() {
        try {
            const response = await fetch(`http://localhost:8080/api/push/preferences/${userId}`);
            const data = await response.json();

            if (data.ok) {
                document.getElementById('chat_enabled').checked = data.preferences.chat_enabled;
                document.getElementById('auction_enabled').checked = data.preferences.auction_enabled;
                document.getElementById('order_enabled').checked = data.preferences.order_enabled;
            }
        } catch (error) {
            console.error('Failed to load preferences:', error);
        }
    }

    async function savePreferences() {
        try {
            const preferences = {
                chat_enabled: document.getElementById('chat_enabled').checked,
                auction_enabled: document.getElementById('auction_enabled').checked,
                order_enabled: document.getElementById('order_enabled').checked
            };

            const response = await fetch(`http://localhost:8080/api/push/preferences/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(preferences)
            });

            const data = await response.json();

            if (data.ok) {
                showMessage('Preferensi berhasil disimpan!', 'success');
            } else {
                showMessage('Gagal menyimpan preferensi', 'error');
            }
        } catch (error) {
            console.error('Failed to save preferences:', error);
            showMessage('Gagal menyimpan preferensi: ' + error.message, 'error');
        }
    }

    function showMessage(msg, type) {
        messageDiv.textContent = msg;
        messageDiv.style.display = 'block';
        messageDiv.style.padding = '10px';
        messageDiv.style.borderRadius = '5px';
        messageDiv.style.backgroundColor = type === 'success' ? '#d4edda' : '#f8d7da';
        messageDiv.style.color = type === 'success' ? '#155724' : '#721c24';

        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
    }

    function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }
}

function getUserIdFromSession() {
    // Try localStorage first
    const userId = localStorage.getItem('user_id');
    if (userId) {
        console.log('[Push] User ID from localStorage:', userId);
        return parseInt(userId);
    }

    // Fallback: extract from page context if available
    const userIdMeta = document.querySelector('meta[name="user-id"]');
    if (userIdMeta) {
        console.log('[Push] User ID from meta tag:', userIdMeta.content);
        return parseInt(userIdMeta.content);
    }

    console.error('[Push] ❌ User ID not found!');
    return null;
}
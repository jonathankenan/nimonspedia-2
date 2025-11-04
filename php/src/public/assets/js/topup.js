document.addEventListener('DOMContentLoaded', () => {
    const balanceLink = document.getElementById('balance-link');
    const modal = document.getElementById('topup-modal');
    const closeBtn = modal?.querySelector('.close');
    const form = document.getElementById('topup-form');
    const msg = document.getElementById('topup-msg');

    if (balanceLink && modal) {
        balanceLink.addEventListener('click', e => {
            e.preventDefault();
            modal.style.display = 'block';
            msg.textContent = '';
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    window.addEventListener('click', e => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    if (form) {
        form.addEventListener('submit', e => {
            e.preventDefault();
            const amount = parseInt(document.getElementById('topup-amount').value);
            if (amount < 1000) {
                msg.textContent = 'Minimal top up Rp 1.000';
                return;
            }

            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/buyer/topup.php', true);
            xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');

            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        try {
                            const data = JSON.parse(xhr.responseText);
                            if (data.success) {
                                balanceLink.textContent = `Balance: Rp ${data.new_balance.toLocaleString('id-ID')}`;
                                modal.style.display = 'none';
                            } else {
                                msg.textContent = data.message || 'Terjadi kesalahan';
                            }
                        } catch (err) {
                            console.error(err);
                            msg.textContent = 'Respons server tidak valid';
                        }
                    } else {
                        msg.textContent = 'Terjadi kesalahan jaringan';
                    }
                }
            };

            xhr.onerror = function() {
                msg.textContent = 'Terjadi kesalahan jaringan';
            };

            xhr.send(JSON.stringify({ amount }));
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const balanceLink = document.getElementById('balance-link');
    const modal = document.getElementById('topup-modal');
    const closeBtn = modal?.querySelector('.close');
    const form = document.getElementById('topup-form');
    const msg = document.getElementById('topup-msg');

    if(balanceLink && modal){
        balanceLink.addEventListener('click', e => {
            e.preventDefault();
            modal.style.display = 'block';
            msg.textContent = '';
        });
    }

    if(closeBtn){
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    window.addEventListener('click', e => {
        if(e.target === modal){
            modal.style.display = 'none';
        }
    });

    if(form){
        form.addEventListener('submit', e => {
            e.preventDefault();
            const amount = parseInt(document.getElementById('topup-amount').value);
            if(amount < 1000){
                msg.textContent = 'Minimal top up Rp 1.000';
                return;
            }

            fetch('/buyer/topup.php', {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({amount})
            })
            .then(res => res.json())
            .then(data => {
                if(data.success){
                    balanceLink.textContent = `Balance: Rp ${data.new_balance.toLocaleString('id-ID')}`;
                    modal.style.display = 'none';
                } else {
                    msg.textContent = data.message || 'Terjadi kesalahan';
                }
            })
            .catch(err => {
                msg.textContent = 'Terjadi kesalahan jaringan';
                console.error(err);
            });
        });
    }
});

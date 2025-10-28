document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('.product-detail');
  if (!root) return;
  const productId = Number(root.dataset.productId);
  const maxStock = Number(root.dataset.maxStock || 0);

  const minus = document.getElementById('qty-minus');
  const plus = document.getElementById('qty-plus');
  const input = document.getElementById('qty-input');
  const btnAdd = document.getElementById('btn-add');
  const toast = document.getElementById('toast');

  const showToast = (msg) => {
    if (!toast) return;
    toast.textContent = msg;
    toast.hidden = false;
    setTimeout(() => { toast.hidden = true; }, 2000);
  };

  function clampQty(val) {
    const n = Math.max(1, Math.min(maxStock || 1, Number(val) || 1));
    return n;
  }

  if (minus && input) {
    minus.addEventListener('click', () => {
      input.value = String(Math.max(1, Number(input.value || 1) - 1));
    });
  }
  if (plus && input) {
    plus.addEventListener('click', () => {
      input.value = String(Math.min(maxStock || 1, Number(input.value || 1) + 1));
    });
  }
  if (input) {
    input.addEventListener('change', () => {
      input.value = String(clampQty(input.value));
    });
  }

  if (btnAdd) {
    btnAdd.addEventListener('click', async () => {
      const qty = clampQty(input ? input.value : 1);
      if (!productId || !qty) return;
      btnAdd.disabled = true;
      try {
        const res = await fetch('/buyer/add_to_cart.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          body: new URLSearchParams({ product_id: String(productId), quantity: String(qty) }).toString()
        });
        const isJson = (res.headers.get('content-type') || '').includes('application/json');
        if (isJson) {
          const data = await res.json();
          if (data && data.ok) {
            const badge = document.querySelector('.cart .badge');
            if (badge) { badge.textContent = String(data.cartCount || ''); }
            showToast('Berhasil ditambahkan ke keranjang');
          } else {
            showToast(data && data.message ? data.message : 'Gagal menambahkan');
          }
        } else {
          showToast('Berhasil ditambahkan ke keranjang');
        }
      } catch (e) {
        showToast('Terjadi kesalahan');
      } finally {
        btnAdd.disabled = false;
      }
    });
  }
});



// Handle chat seller button
function handleChatSeller() {
  const chatBtn = document.querySelector('.btn-chat-seller');
  if (chatBtn) {
    chatBtn.addEventListener('click', async () => {
      const storeId = chatBtn.dataset.storeId;
      const productId = chatBtn.dataset.productId;
      
      if (!storeId || !productId) {
        console.error('Missing store or product ID');
        return;
      }

      // Store in sessionStorage for React to read
      sessionStorage.setItem('autoOpenChat', JSON.stringify({
        storeId: storeId,
        productId: productId
      }));

      // Redirect to admin chat page
      window.location.href = `/admin/chat`;
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Initialize chat seller button
  handleChatSeller();
  
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
    btnAdd.addEventListener('click', () => {
      const qty = clampQty(input ? input.value : 1);
      if (!productId || !qty) return;

      btnAdd.disabled = true;

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/buyer/add_to_cart.php', true);
      xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
      xhr.setRequestHeader('Accept', 'application/json');

      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) { 
          btnAdd.disabled = false;
          if (xhr.status === 200) {
            let data;
            const contentType = xhr.getResponseHeader('Content-Type') || '';
            if (contentType.includes('application/json')) {
              try {
                data = JSON.parse(xhr.responseText);
              } catch (e) {
                showToast('Gagal memproses response server');
                return;
              }
            }

            if (data && data.ok) {
              const badge = document.querySelector('.cart .badge');
              if (badge) badge.textContent = String(data.cartCount || '');
              showToast('Berhasil ditambahkan ke keranjang');
            } else if (data && data.message) {
              showToast(data.message);
            } else {
              showToast('Berhasil ditambahkan ke keranjang');
            }

          } else {
            showToast('Terjadi kesalahan');
          }
        }
      };

      const params = `product_id=${encodeURIComponent(productId)}&quantity=${encodeURIComponent(qty)}`;
      xhr.send(params);
    });
  }
});



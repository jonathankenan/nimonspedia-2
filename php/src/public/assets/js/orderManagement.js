let currentPage = 1;
let currentStatus = '';
let currentSearch = '';

document.addEventListener('DOMContentLoaded', () => {
    // Initial load
    loadOrders();

    // Status tab clicks
    document.querySelectorAll('.status-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelector('.status-tab.active').classList.remove('active');
            tab.classList.add('active');
            currentStatus = tab.dataset.status;
            currentPage = 1;
            loadOrders();
        });
    });

    // Search input
    let searchTimeout;
    document.getElementById('search').addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentSearch = e.target.value;
            currentPage = 1;
            loadOrders();
        }, 300);
    });

    // Modal close buttons
    document.querySelectorAll('.modal .close').forEach(close => {
        close.addEventListener('click', () => {
            close.closest('.modal').style.display = 'none';
        });
    });

    // Click outside modal to close
    window.addEventListener('click', (e) => {
        document.querySelectorAll('.modal').forEach(modal => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });

    // Reject form submission
    document.getElementById('rejectForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const orderId = document.getElementById('rejectOrderId').value;
        const reason = document.getElementById('rejectReason').value;
        updateOrderStatus(orderId, 'rejected', { reject_reason: reason });
    });

    // Delivery form submission
    document.getElementById('deliveryForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const orderId = document.getElementById('deliveryOrderId').value;
        const time = document.getElementById('deliveryTime').value;
        updateOrderStatus(orderId, 'on_delivery', { delivery_time: time });
    });
});

function loadOrders() {
    const url = new URL('/seller/api/orders.php', window.location.origin);
    url.searchParams.set('store_id', storeId);
    url.searchParams.set('page', currentPage);
    if (currentStatus) url.searchParams.set('status', currentStatus);
    if (currentSearch) url.searchParams.set('search', currentSearch);

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                let errorMsg = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
                throw new Error(errorMsg);
            }
            displayOrders(data.orders);
            displayPagination(data.total_pages);
        })
        .catch(error => {
            console.error('Error loading orders:', error.message || error);
            alert('Failed to load orders: ' + (error.message || error));
        });
}

function displayOrders(orders) {
    const ordersList = document.getElementById('orders-list');

    ordersList.innerHTML = orders.map(order => `
        <div class="order-item">
            <div class="order-header">
                <span class="order-id">Order #${order.order_id}</span>
                <span class="order-date">${new Date(order.created_at).toLocaleString()}</span>
            </div>
            <div class="order-details">
                <div>Buyer: ${order.buyer_name}</div>
                <div class="order-products">${order.product_list}</div>
                <div class="order-total">Total: Rp ${parseFloat(order.total_price).toLocaleString()}</div>
            </div>
            <div class="order-actions">
                <button class="btn btn-primary" onclick="viewOrderDetails(${order.order_id})">
                    View Details
                </button>
                ${getActionButtons(order)}
            </div>
        </div>
    `).join('');
}

function getActionButtons(order) {
    switch(order.status) {
        case 'waiting_approval':
            return `
                <button class="btn btn-success" onclick="updateOrderStatus(${order.order_id}, 'approved')">
                    Approve
                </button>
                <button class="btn btn-danger" onclick="showRejectModal(${order.order_id})">
                    Reject
                </button>
            `;
        case 'approved':
            return `
                <button class="btn btn-primary" onclick="showDeliveryModal(${order.order_id})">
                    Set Delivery Time
                </button>
            `;
        default:
            return '';
    }
}

function displayPagination(totalPages) {
    const pagination = document.getElementById('pagination');
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let html = '';
    // Previous button
    if (currentPage > 1) {
        html += `<a href="#" class="page-btn" onclick="changePage(${currentPage - 1}); return false;">&laquo; Previous</a>`;
    }

    // Range logic
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, currentPage + 2);

    if (start > 1) {
        html += `<a href="#" class="page-btn" onclick="changePage(1); return false;">1</a>`;
        if (start > 2) {
            html += `<span class="page-btn">...</span>`;
        }
    }

    for (let i = start; i <= end; i++) {
        html += `<a href="#" class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i}); return false;">${i}</a>`;
    }

    if (end < totalPages) {
        if (end < totalPages - 1) {
            html += `<span class="page-btn">...</span>`;
        }
        html += `<a href="#" class="page-btn" onclick="changePage(${totalPages}); return false;">${totalPages}</a>`;
    }

    // Next button
    if (currentPage < totalPages) {
        html += `<a href="#" class="page-btn" onclick="changePage(${currentPage + 1}); return false;">Next &raquo;</a>`;
    }

    pagination.innerHTML = html;
}

function changePage(page) {
    currentPage = page;
    loadOrders();
}

function viewOrderDetails(orderId) {
    const url = new URL('/seller/api/orders.php', window.location.origin);
    url.searchParams.set('store_id', storeId);
    url.searchParams.set('order_id', orderId);

    fetch(url)
        .then(response => response.json())
        .then(order => {
            if (order.error) {
                throw new Error(order.error);
            }

            const modalBody = document.getElementById('orderModalBody');
            modalBody.innerHTML = `
                <div class="order-detail-info">
                    <p><strong>Order ID:</strong> #${order.order_id}</p>
                    <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleString()}</p>
                    <p><strong>Status:</strong> ${order.status}</p>
                    <p><strong>Buyer:</strong> ${order.buyer_name}</p>
                    <p><strong>Email:</strong> ${order.buyer_email}</p>
                    ${order.delivery_time ? `<p><strong>Delivery Time:</strong> ${new Date(order.delivery_time).toLocaleString()}</p>` : ''}
                    ${order.reject_reason ? `<p><strong>Reject Reason:</strong> ${order.reject_reason}</p>` : ''}
                </div>
                <h3>Items:</h3>
                <table style="width: 100%; margin-top: 10px;">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Quantity</th>
                            <th>Price</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${order.items.map(item => `
                            <tr>
                                <td>${item.product_name}</td>
                                <td>${item.quantity}</td>
                                <td>Rp ${parseFloat(item.price).toLocaleString()}</td>
                                <td>Rp ${parseFloat(item.subtotal).toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="3"><strong>Total:</strong></td>
                            <td><strong>Rp ${parseFloat(order.total_price).toLocaleString()}</strong></td>
                        </tr>
                    </tfoot>
                </table>
            `;

            document.getElementById('orderModal').style.display = 'block';
        })
        .catch(error => {
            console.error('Error loading order details:', error);
            alert('Failed to load order details. Please try again.');
        });
}

function showRejectModal(orderId) {
    document.getElementById('rejectOrderId').value = orderId;
    document.getElementById('rejectReason').value = '';
    document.getElementById('rejectModal').style.display = 'block';
}

function showDeliveryModal(orderId) {
    document.getElementById('deliveryOrderId').value = orderId;
    document.getElementById('deliveryTime').value = '';
    document.getElementById('deliveryModal').style.display = 'block';
}

function updateOrderStatus(orderId, status, data = {}) {
    const formData = new FormData();
    formData.append('order_id', orderId);
    formData.append('store_id', storeId);
    formData.append('status', status);
    
    for (const [key, value] of Object.entries(data)) {
        formData.append(key, value);
    }

    fetch('/seller/api/orders.php', {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }
            // Close all modals
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
            // Reload orders
            loadOrders();
        })
        .catch(error => {
            console.error('Error updating order status:', error);
            alert('Failed to update order status. Please try again.');
        });
}
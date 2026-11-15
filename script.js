let products = [];
let cart = JSON.parse(localStorage.getItem('shopmaster_cart')) || [];
let activeProduct = null;

document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    updateCartUI();

    document.getElementById('modalAddToCartBtn').addEventListener('click', () => {
        if (!activeProduct) return;
        const qty = parseInt(document.getElementById('modalQuantity').value) || 1;
        addToCart(activeProduct, qty);
        bootstrap.Modal.getInstance(document.getElementById('productModal')).hide();
    });

    document.getElementById('checkoutForm').addEventListener('submit', (e) => {
        e.preventDefault();
        processCheckout();
    });
});

async function fetchProducts() {
    try {
        const response = await fetch('https://fakestoreapi.com/products');
        products = await response.json();
        renderProducts(products);
    } catch (error) {
        console.error('Error al consumir la API:', error);
        document.getElementById('productsContainer').innerHTML = `
            <div class="col-12 text-center text-danger">
                <p>No se pudieron cargar los productos. Verifique su conexión.</p>
            </div>`;
    }
}

function renderProducts(items) {
    const container = document.getElementById('productsContainer');
    container.innerHTML = '';

    items.forEach(item => {
        const col = document.createElement('div');
        col.className = 'col-md-3 col-sm-6';
        col.innerHTML = `
            <div class="card h-100 rounded-3 shadow-sm">
                <div class="product-img-container">
                    <img src="${item.image}" alt="${item.title}">
                </div>
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title fs-6 text-truncate fw-bold mb-2">${item.title}</h5>
                    <p class="text-success fw-bold fs-5 mb-3">$${item.price.toFixed(2)}</p>
                    <button class="btn btn-outline-primary mt-auto w-100 btn-sm fw-semibold" onclick="openProductModal(${item.id})">🔍 Ver más</button>
                </div>
            </div>
        `;
        container.appendChild(col);
    });
}

function openProductModal(id) {
    activeProduct = products.find(p => p.id === id);
    if (!activeProduct) return;

    document.getElementById('modalTitle').textContent = activeProduct.title;
    document.getElementById('modalImage').src = activeProduct.image;
    document.getElementById('modalCategory').textContent = `Categoría: ${activeProduct.category}`;
    document.getElementById('modalDescription').textContent = activeProduct.description;
    document.getElementById('modalPrice').textContent = `$${activeProduct.price.toFixed(2)}`;
    document.getElementById('modalQuantity').value = 1;

    const modal = new bootstrap.Modal(document.getElementById('productModal'));
    modal.show();
}

function addToCart(product, quantity) {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
        existing.quantity += quantity;
    } else {
        cart.push({ ...product, quantity });
    }
    saveAndSyncCart();
}

function updateCartQuantity(id, change) {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    item.quantity += change;
    if (item.quantity <= 0) {
        cart = cart.filter(i => i.id !== id);
    }
    saveAndSyncCart();
}

function removeFromCart(id) {
    cart = cart.filter(i => i.id !== id);
    saveAndSyncCart();
}

function saveAndSyncCart() {
    localStorage.setItem('shopmaster_cart', JSON.stringify(cart));
    updateCartUI();
}

function updateCartUI() {
    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cartCount').textContent = totalCount;

    const list = document.getElementById('cartItemsList');
    if (cart.length === 0) {
        list.innerHTML = `<p class="text-muted text-center py-3">Tu carrito está vacío.</p>`;
        document.getElementById('cartTotalPrice').textContent = '$0.00';
        return;
    }

    list.innerHTML = '';
    let total = 0;

    cart.forEach(item => {
        const subtotal = item.price * item.quantity;
        total += subtotal;

        const div = document.createElement('div');
        div.className = 'd-flex justify-content-between align-items-center border-bottom py-2';
        div.innerHTML = `
            <div style="max-width: 50%;">
                <h6 class="mb-0 small fw-bold text-truncate">${item.title}</h6>
                <small class="text-muted">$${item.price.toFixed(2)} x ${item.quantity}</small>
            </div>
            <div class="d-flex align-items-center gap-2">
                <span class="fw-bold text-success small">$${subtotal.toFixed(2)}</span>
                <button class="btn btn-sm btn-outline-secondary py-0 px-1" onclick="updateCartQuantity(${item.id}, -1)">➖</button>
                <button class="btn btn-sm btn-outline-secondary py-0 px-1" onclick="updateCartQuantity(${item.id}, 1)">➕</button>
                <button class="btn btn-sm text-danger py-0 px-1" onclick="removeFromCart(${item.id})"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        list.appendChild(div);
    });

    document.getElementById('cartTotalPrice').textContent = `$${total.toFixed(2)}`;
}

function processCheckout() {
    if (cart.length === 0) {
        alert('El carrito está vacío.');
        return;
    }

    const clientName = document.getElementById('clientName').value;
    generateReceiptPDF(clientName);

    // Limpiar carrito tras compra exitosa
    cart = [];
    saveAndSyncCart();
    bootstrap.Modal.getInstance(document.getElementById('cartModal')).hide();
    document.getElementById('checkoutForm').reset();
    alert('✅ ¡Compra procesada con éxito! Su ticket térmico ha sido descargado.');
}

function generateReceiptPDF(clientName) {
    const { jsPDF } = window.jspdf;
    // Configuración para formato recibo térmico de 80mm de ancho (aprox 80mm x 150mm)
    const doc = new jsPDF({ unit: 'mm', format: [80, 160] });

    doc.setFont('courier', 'normal');
    doc.setFontSize(10);

    let y = 10;
    doc.text('================================', 5, y);
    y += 5;
    doc.text('         SHOPMASTER E-COMMERCE   ', 5, y);
    y += 5;
    doc.text('      RECIBO DE VENTA TÉRMICO    ', 5, y);
    y += 5;
    doc.text('================================', 5, y);
    y += 6;

    doc.text(`Fecha: ${new Date().toLocaleString()}`, 5, y);
    y += 5;
    doc.text(`Cliente: ${clientName}`, 5, y);
    y += 5;
    doc.text('--------------------------------', 5, y);
    y += 6;

    let totalGeneral = 0;

    cart.forEach(item => {
        const subtotal = item.price * item.quantity;
        totalGeneral += subtotal;

        doc.text(`${item.title.substring(0, 25)}`, 5, y);
        y += 4;
        doc.text(`${item.quantity} x $${item.price.toFixed(2)} = $${subtotal.toFixed(2)}`, 5, y);
        y += 5;
    });

    doc.text('--------------------------------', 5, y);
    y += 6;
    doc.setFont('courier', 'bold');
    doc.text(`TOTAL A PAGAR: $${totalGeneral.toFixed(2)}`, 5, y);
    y += 6;
    doc.setFont('courier', 'normal');
    doc.text('================================', 5, y);
    y += 5;
    doc.text('     ¡GRACIAS POR SU COMPRA!     ', 5, y);
    y += 5;
    doc.text('================================', 5, y);

    doc.save(`ticket_compra_${Date.now()}.pdf`);
}
// index.js - loads product list and injects into #product-grid
window.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('product-grid');
  try {
    const res = await fetch('/api/products?per_page=100', { credentials: 'same-origin' });
    const data = await res.json();
    const products = data.products || [];
    grid.innerHTML = '';
    if (!products.length) { grid.innerHTML = '<p>No products found.</p>'; return; }
    products.forEach(p => {
      const card = document.createElement('div');
      card.className = 'product-card animate__animated animate__fadeInUp';
      const imageUrl = (p.images && p.images.length) ? p.images[0].url : 'https://via.placeholder.com/600x800?text=No+Image';

      card.innerHTML = `
        <div class="product-image-container">
          <img src="${imageUrl}" class="card-img-top" alt="${p.name}">
          <div class="product-overlay">
            <a href="/product/${p.product_sku}" class="btn btn-light rounded-pill px-4 fw-bold shadow-sm">View Details</a>
          </div>
          ${p.stock_quantity <= 5 ? '<span class="position-absolute top-0 start-0 m-3 badge bg-danger rounded-pill">Low Stock</span>' : ''}
        </div>
        <div class="p-4">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h3 class="h5 fw-bold mb-0 text-truncate-2" style="flex: 1;">
              <a href="/product/${p.product_sku}" class="text-dark text-decoration-none hover-primary">${p.name}</a>
            </h3>
          </div>
          <div class="d-flex align-items-center mb-3">
            <div class="text-warning me-2 small">
              <i class="bi bi-star-fill"></i>
              <i class="bi bi-star-fill"></i>
              <i class="bi bi-star-fill"></i>
              <i class="bi bi-star-fill"></i>
              <i class="bi bi-star-half"></i>
            </div>
            <span class="text-muted small">(4.5)</span>
          </div>
          <div class="d-flex justify-content-between align-items-center">
            <span class="h4 fw-bold text-primary mb-0">€${(p.base_price_cents/100).toFixed(2)}</span>
            <a href="/product/${p.product_sku}" class="btn btn-primary btn-sm rounded-circle" style="width: 32px; height: 32px; padding: 0; display: flex; align-items: center; justify-content: center;">
              <i class="bi bi-plus-lg"></i>
            </a>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    grid.innerHTML = '<p>Could not load products.</p>';
  }
});

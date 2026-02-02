// static/js/product.js
// New gallery: vertical thumb rail, swatch thumbnails, size buttons, dynamic price update.
// Outline for selected thumb/swatch: rgb(17, 24, 39) solid 3px

(() => {
  const SKU = window.PRODUCT_SKU;
  if (!SKU) return;

  // helpers
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const formatPrice = cents => `$${(cents/100).toFixed(2)}`;

  function getIconUrl(url) {
    if (!url || !url.startsWith('/static/')) return url;
    const dotIndex = url.lastIndexOf('.');
    if (dotIndex === -1) return url + '_icon';
    return url.substring(0, dotIndex) + '_icon' + url.substring(dotIndex);
  }

  // DOM
  const thumbRail = $('#thumb-rail');
  const mainImage = $('#main-image');
  const productName = $('#product-name');
  const productPrice = $('#product-price');
  const productDescription = $('#product-description');
  const swatchGrid = $('#swatch-grid');
  const sizeButtons = $('#size-buttons');
  const qtyInput = $('#qty-input');
  const addToCartBtn = $('#add-to-cart');
  const variantMessage = $('#variant-message');
  const prevBtn = $('#prev-image');
  const nextBtn = $('#next-image');

  // New helper for product cards
  function createProductCard(p) {
    const col = document.createElement('div');
    col.className = 'col';
    const firstImg = (p.images && p.images[0]) ? getIconUrl(p.images[0].url) : 'https://via.placeholder.com/300';
    col.innerHTML = `
      <a href="/product/${encodeURIComponent(p.product_sku)}" class="product-card-sm">
        <div class="img-wrap">
          <img src="${firstImg}" alt="${p.name}" loading="lazy">
        </div>
        <div class="card-title">${p.name}</div>
        <div class="card-price">${formatPrice(p.base_price_cents || 0)}</div>
      </a>
    `;
    return col;
  }

  async function fetchAndRenderProductList(skus, listId, sectionId) {
    console.log(`Fetching product list for ${sectionId}`, skus);
    if (!skus || !skus.length) {
      console.log(`No SKUs for ${sectionId}`);
      $(sectionId).classList.add('d-none');
      return;
    }
    const listContainer = $(listId);
    listContainer.innerHTML = '';

    try {
      // Use batch endpoint for efficiency
      const queryParams = skus.filter(s => !!s).map(s => `sku=${encodeURIComponent(s)}`).join('&');
      const res = await fetch(`/api/products/batch?${queryParams}`);
      if (res.ok) {
        const products = await res.json();
        if (products && products.length > 0) {
          products.forEach(p => {
            listContainer.appendChild(createProductCard(p));
          });
          $(sectionId).classList.remove('d-none');
          return;
        }
      }
    } catch (e) {
      console.error(`Error fetching batch SKUs:`, e);
    }

    $(sectionId).classList.add('d-none');
  }

  function renderTags(p) {
    const container = $('#product-tags');
    if (!container) return;
    container.innerHTML = '';
    const tags = [p.tag1, p.tag2, p.tag3].filter(t => t && t.trim());
    const colors = ['bg-primary', 'bg-info', 'bg-dark'];
    tags.forEach((tag, i) => {
        const badge = document.createElement('span');
        badge.className = `badge tag-badge ${colors[i % colors.length]}`;
        badge.textContent = tag;
        container.appendChild(badge);
    });
  }

  // state
  let product = null;
  let selectedVariant = null;
  let selectedColor = null;
  let selectedSize = null;
  let currentGallery = []; // array of {url, alt_text, display_order}

  // set focused outline style class
  const SELECTED_OUTLINE_STYLE = 'selected-outline';

  // create thumb DOM element
  function createThumb(imgObj, index) {
    const wrapper = document.createElement('div');
    wrapper.className = 'thumb-item';
    wrapper.tabIndex = 0;
    const img = document.createElement('img');
    img.src = getIconUrl(imgObj.url);
    img.alt = imgObj.alt_text || product.name || 'product';
    img.loading = 'lazy';
    wrapper.appendChild(img);

    wrapper.addEventListener('click', () => {
      setActiveImage(index);
    });
    wrapper.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveImage(index); }
    });

    return wrapper;
  }

  function setActiveImage(index) {
    const g = currentGallery;
    const img = g[index] || g[0];
    if (!img) return;
    mainImage.src = img.url;
    mainImage.alt = img.alt_text || product.name || '';
    // mark selected thumb
    $$('.thumb-item', thumbRail).forEach((t, i) => {
      if (i === index) t.classList.add(SELECTED_OUTLINE_STYLE); else t.classList.remove(SELECTED_OUTLINE_STYLE);
    });
  }

  // Render vertical thumb rail from images array
  function renderThumbRail(images) {
    thumbRail.innerHTML = '';
    if (!images || images.length === 0) {
      thumbRail.style.display = 'none';
      if (prevBtn) prevBtn.style.display = 'none';
      if (nextBtn) nextBtn.style.display = 'none';
      return;
    }
    thumbRail.style.display = '';

    if (prevBtn) prevBtn.style.display = images.length > 1 ? '' : 'none';
    if (nextBtn) nextBtn.style.display = images.length > 1 ? '' : 'none';
    images.forEach((img, idx) => {
      const t = createThumb(img, idx);
      thumbRail.appendChild(t);
    });
    setActiveImage(0);
  }

  function renderSwatches(variants) {
    swatchGrid.innerHTML = '';
    // Group variants by color_name; first variant of color used for swatch image
    const colorMap = new Map();
    (variants || []).forEach(v => {
      const color = (v.color_name || 'Default').trim();
      if (!colorMap.has(color)) colorMap.set(color, []);
      colorMap.get(color).push(v);
    });

    // create swatch node for each color
    let idx = 0;
    for (const [color, arr] of colorMap.entries()) {
      // pick variant that has images or first in array
      const firstVariant = arr.find(x => x.images && x.images.length) || arr[0];
      const swatchImg = firstVariant && firstVariant.images && firstVariant.images[0] ? getIconUrl(firstVariant.images[0].url) : getIconUrl((product.images && product.images[0] && product.images[0].url) || '');
      const swatch = document.createElement('button');
      swatch.className = 'swatch';
      swatch.type = 'button';
      swatch.dataset.color = color;
      swatch.title = color;
      swatch.innerHTML = `<img src="${swatchImg}" alt="${color}" loading="lazy"><div class="swatch-label">${color}</div>`;
      swatch.addEventListener('click', () => {
        selectColor(color);
      });
      swatchGrid.appendChild(swatch);
      idx++;
    }
    // If only one color, optionally hide label - that's up to styling.
  }

  function renderSizes(variants_for_color) {
    sizeButtons.innerHTML = '';
    const sizes = []; // unique
    (variants_for_color || []).forEach(v => {
      const s = v.size || 'One Size';
      if (!sizes.includes(s)) sizes.push(s);
    });

    sizes.forEach(sz => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'size-btn';
      btn.textContent = sz;
      btn.dataset.size = sz;
      btn.addEventListener('click', () => {
        selectSize(sz);
      });
      sizeButtons.appendChild(btn);
    });
  }

  function selectColor(color) {
    selectedColor = color;
    // mark active swatch
    $$('.swatch', swatchGrid).forEach(s => s.classList.toggle(SELECTED_OUTLINE_STYLE, s.dataset.color === color));
    // pick available variants with this color
    const variants_for_color = product.variants.filter(v => (v.color_name || '').trim() === color);
    renderSizes(variants_for_color);
    // auto-select first available size
    const firstAvailable = variants_for_color.find(v => v.stock_quantity > 0) || variants_for_color[0];
    selectedSize = firstAvailable ? firstAvailable.size : null;
    // highlight size button
    $$('.size-btn', sizeButtons).forEach(b => b.classList.toggle('active', b.dataset.size === selectedSize));
    // choose a variant
    updateSelectedVariantBy(color, selectedSize);
  }

  function selectSize(size) {
    selectedSize = size;
    $$('.size-btn', sizeButtons).forEach(b => b.classList.toggle('active', b.dataset.size === size));
    updateSelectedVariantBy(selectedColor, selectedSize);
  }

  function updateSelectedVariantBy(color, size) {
    const variant = product.variants.find(v =>
      ((v.color_name || '').trim() === (color || '').trim()) &&
      ((v.size || '').trim() === (size || '').trim())
    );
    if (!variant) {
      variantMessage.textContent = 'This combination is not available.';
      selectedVariant = null;
      productPrice.textContent = formatPrice(product.base_price_cents || 0);
      // use product images
      currentGallery = (product.images || []).slice();
      renderThumbRail(currentGallery);
      return;
    }
    selectedVariant = variant;
    variantMessage.textContent = variant.stock_quantity > 0 ? '' : 'Out of stock';

    // compute final price
    const finalPrice = (product.base_price_cents || 0) + (variant.price_modifier_cents || 0);
    productPrice.textContent = formatPrice(finalPrice);

    // update gallery: prefer variant.images then product.images
    currentGallery = (variant.images && variant.images.length) ? variant.images.slice() : (product.images || []).slice();
    renderThumbRail(currentGallery);
    // select first variant image
    setActiveImage(0);
  }

  async function addToCart() {
    if (!selectedVariant) return alert('Please select a variant (color + size).');
    const qty = Math.max(1, parseInt(qtyInput.value, 10) || 1);
    const payload = { sku: selectedVariant.sku, quantity: qty };
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'same-origin'
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to add to cart');
      } else {
        // success: maybe show a mini-toast or redirect to cart
        addToCartBtn.textContent = 'Added ✓';
        setTimeout(()=> addToCartBtn.textContent = 'Add to cart', 1500);
      }
    } catch (err) {
      console.error(err);
      alert('Network error when adding to cart');
    }
  }

  // fetch product and init
  async function init() {
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(SKU)}`, { credentials: 'same-origin' });
      if (!res.ok) throw new Error('Product not found');
      product = await res.json();

      productName.textContent = product.name;
      productDescription.textContent = product.short_description || product.description || '';
      productPrice.textContent = formatPrice(product.base_price_cents || 0);

      // Render tags
      renderTags(product);

      // Product Details
      if (product.product_details && product.product_details.trim()) {
        const detailContainer = $('#product-details-container');
        if (detailContainer) {
            detailContainer.textContent = product.product_details;
            $('#product-details-section').classList.remove('d-none');
        }
      }

      // Full Description
      if (product.description && product.description.trim()) {
        const fullDescContainer = $('#product-full-description');
        if (fullDescContainer) {
            fullDescContainer.textContent = product.description;
            $('#product-full-description-section').classList.remove('d-none');
        }
      }

      // Related & Proposed Products
      fetchAndRenderProductList(product.related_products, '#related-products-list', '#related-products-section');
      fetchAndRenderProductList(product.proposed_products, '#proposed-products-list', '#proposed-products-section');

      // ensure images arrays exist
      product.images = product.images || [];
      (product.variants || []).forEach(v => v.images = v.images || []);

      // initial gallery: product images
      currentGallery = (product.images && product.images.length) ? product.images.slice() : [];
      renderThumbRail(currentGallery);

      // render swatches and sizes
      renderSwatches(product.variants || []);

      // auto-select first color & size if available
      const firstVariant = (product.variants && product.variants.length) ? product.variants[0] : null;
      if (firstVariant) {
        selectColor(firstVariant.color_name || '');
        selectSize(firstVariant.size || '');
      }

      addToCartBtn.addEventListener('click', addToCart);

      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          if (!currentGallery || currentGallery.length < 2) return;
          const thumbs = $$('.thumb-item', thumbRail);
          const activeIndex = thumbs.findIndex(t => t.classList.contains(SELECTED_OUTLINE_STYLE));
          const newIndex = (activeIndex - 1 + currentGallery.length) % currentGallery.length;
          setActiveImage(newIndex);
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          if (!currentGallery || currentGallery.length < 2) return;
          const thumbs = $$('.thumb-item', thumbRail);
          const activeIndex = thumbs.findIndex(t => t.classList.contains(SELECTED_OUTLINE_STYLE));
          const newIndex = (activeIndex + 1) % currentGallery.length;
          setActiveImage(newIndex);
        });
      }

      // keyboard accessibility: left/right arrows cycle thumbs
      document.addEventListener('keydown', (e) => {
        if (!currentGallery || currentGallery.length < 1) return;
        const thumbs = $$('.thumb-item', thumbRail);
        const activeIndex = thumbs.findIndex(t => t.classList.contains(SELECTED_OUTLINE_STYLE));
        if (e.key === 'ArrowLeft') {
          const idx = Math.max(0, (activeIndex > 0 ? activeIndex - 1 : 0));
          setActiveImage(idx);
        } else if (e.key === 'ArrowRight') {
          const idx = Math.min(currentGallery.length - 1, (activeIndex < 0 ? 0 : activeIndex + 1));
          setActiveImage(idx);
        }
      });

      // Zoom feature
      const mainImageWrap = $('.main-image-wrap');
      if (mainImageWrap && mainImage) {
        mainImageWrap.addEventListener('mousemove', (e) => {
          const rect = mainImageWrap.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 100;

          mainImage.style.transformOrigin = `${x}% ${y}%`;
          mainImage.style.transform = 'scale(2.5)';
        });

        mainImageWrap.addEventListener('mouseenter', () => {
          mainImageWrap.classList.add('zoomed');
        });

        mainImageWrap.addEventListener('mouseleave', () => {
          mainImageWrap.classList.remove('zoomed');
          mainImage.style.transform = 'scale(1)';
          mainImage.style.transformOrigin = 'center center';
        });
      }

    } catch (err) {
      console.error(err);
      productName.textContent = 'Product not found';
      productDescription.textContent = '';
    }
  }

  // CSS class names injection for selected outline (if not in stylesheet)
  

  init();
})();

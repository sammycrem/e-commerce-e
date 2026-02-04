// static/js/admin_crud.js
// Admin Product CRUD using SKU as identifier
// Fixed: prefill variant images when editing a product

(function () {
  'use strict';

  function el(tag, attrs = {}, ...children) {
    const e = document.createElement(tag);
    for (const k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    children.forEach(c => {
      if (typeof c === 'string') e.appendChild(document.createTextNode(c));
      else if (c instanceof Node) e.appendChild(c);
    });
    return e;
  }

  function $(sel, root = document) { return root.querySelector(sel); }
  function $all(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

  const PREDEFINED_COLORS = [
    { name: 'White', modifier: 0.0 },
    { name: 'Red', modifier: 0.20 },
    { name: 'Black', modifier: 0.10 }
  ];

  document.addEventListener('DOMContentLoaded', () => {
    const imagesContainer = $('#product-images');
    const variantsContainer = $('#variants');
    const feedback = $('#admin-feedback');
    const productList = $('#product-list');
    const newBtn = $('#btn-new-product');
    const saveBtn = $('#save-product');
    const delBtn = $('#delete-product');

    if (!imagesContainer || !variantsContainer) return;

    function showFeedback(msg, type = 'info') {
      feedback.style.display = 'block';
      feedback.className = `feedback ${type === 'error' ? 'error' : 'success'}`;
      feedback.textContent = msg;
    }

    function parsePriceToCents(str) {
      const cleaned = (str || '').replace(',', '.').replace(/[^0-9.]/g, '');
      const val = parseFloat(cleaned);
      return isNaN(val) ? 0 : Math.round(val * 100);
    }

    async function triggerUpload(targetInput) {
      const fileInput = el('input', { type: 'file', accept: 'image/*' });
      fileInput.onchange = async () => {
        if (!fileInput.files.length) return;
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);

        try {
          showFeedback('Uploading...');
          const res = await fetch('/api/admin/upload-image', {
            method: 'POST',
            body: formData
          });
          const data = await res.json();
          if (res.ok) {
            targetInput.value = data.url;
            showFeedback('Upload successful', 'success');
          } else {
            showFeedback(data.error || 'Upload failed', 'error');
          }
        } catch (err) {
          showFeedback('Upload error', 'error');
          console.error(err);
        }
      };
      fileInput.click();
    }

    function getIconUrl(url) {
      if (!url || !url.includes('/static/')) return url;
      const dotIdx = url.lastIndexOf('.');
      const base = dotIdx !== -1 ? url.substring(0, dotIdx) : url;
      if (base.endsWith('_icon')) return url;
      return base + '_icon.webp';
    }

    // Add product image row
    function addProductImageRow(url = '', alt = '', order = 0) {
      const urlInput = el('input', { type: 'text', class: 'form-input img-url', placeholder: 'Image URL', value: url });
      const previewImg = el('img', {
        src: getIconUrl(url) || 'https://via.placeholder.com/50',
        style: 'width:50px; height:50px; object-fit:cover; border-radius:4px; border:1px solid #eee;'
      });

      urlInput.addEventListener('input', () => {
        previewImg.src = getIconUrl(urlInput.value) || 'https://via.placeholder.com/50';
      });

      const row = el('div', { class: 'image-row', 'data-role': 'product-image' },
        previewImg,
        urlInput,
        el('input', { type: 'text', class: 'form-input img-alt', placeholder: 'Alt text', value: alt }),
        el('input', { type: 'number', class: 'form-input img-order', placeholder: 'Order', value: order }),
        el('button', { class: 'btn btn-secondary btn-upload', type: 'button' }, 'Upload'),
        el('button', { class: 'btn btn-danger', type: 'button' }, 'Remove')
      );
      row.querySelector('.btn-upload').addEventListener('click', () => {
        triggerUpload(urlInput).then(() => {
          previewImg.src = getIconUrl(urlInput.value);
        });
      });
      row.querySelector('.btn-danger').addEventListener('click', () => row.remove());
      imagesContainer.appendChild(row);
    }

    // Add variant row — now supports prefill.images
    function addVariantRow(prefill = {}) {
      const wrapper = el('div', { class: 'variant-fields', style: 'border:1px solid #eee; padding:10px; border-radius:6px; margin-bottom:8px;' });

      const sku = el('input', { type: 'text', class: 'form-input variant-sku', placeholder: 'Variant SKU', value: prefill.sku || '' });

      const colorListId = 'colors-' + Math.random().toString(36).substr(2, 9);
      const colorDatalist = el('datalist', { id: colorListId });
      PREDEFINED_COLORS.forEach(c => colorDatalist.appendChild(el('option', { value: c.name })));

      const color = el('input', { type: 'text', class: 'form-input variant-color', placeholder: 'Color (e.g. Red)', value: prefill.color_name || '', list: colorListId });
      const size = el('input', { type: 'text', class: 'form-input variant-size', placeholder: 'Size (e.g. M)', value: prefill.size || '' });
      const stock = el('input', { type: 'number', class: 'form-input variant-stock', placeholder: 'Stock', value: prefill.stock_quantity || 0 });
      const priceMod = el('input', { type: 'text', class: 'form-input variant-price-mod', placeholder: 'Price modifier (e.g. 1.50)', value: prefill.price_modifier_cents ? (prefill.price_modifier_cents / 100).toFixed(2) : '0.00' });

      const finalPriceDisplay = el('div', { class: 'mt-1 small fw-bold text-primary variant-final-price' }, 'Final Price: 0.00 €');

      function updateFinalPrice() {
        const base = parsePriceToCents($('#base_price').value);
        const mod = parsePriceToCents(priceMod.value);
        finalPriceDisplay.textContent = `Final Price: ${((base + mod) / 100).toFixed(2)} €`;
      }

      priceMod.addEventListener('input', updateFinalPrice);
      color.addEventListener('change', () => {
        const selected = PREDEFINED_COLORS.find(c => c.name.toLowerCase() === color.value.toLowerCase());
        if (selected) {
          const base = parsePriceToCents($('#base_price').value);
          const modCents = Math.round(base * selected.modifier);
          priceMod.value = (modCents / 100).toFixed(2);
          updateFinalPrice();
        }
      });

      updateFinalPrice();

      // container for variant image rows
      const vImgs = el('div', { class: 'variant-images' });

      // function to add one variant-image row (used for both prefill and "Add image" button)
      function addVariantImageRow(url = '', alt = '', order = 0) {
        const vUrlInput = el('input', { type: 'text', class: 'form-input img-url', placeholder: 'Image URL', value: url });
        const vPreviewImg = el('img', {
          src: getIconUrl(url) || 'https://via.placeholder.com/40',
          style: 'width:40px; height:40px; object-fit:cover; border-radius:4px; border:1px solid #eee;'
        });

        vUrlInput.addEventListener('input', () => {
          vPreviewImg.src = getIconUrl(vUrlInput.value) || 'https://via.placeholder.com/40';
        });

        const r = el('div', { class: 'variant-image-row', 'data-role': 'variant-image' },
          vPreviewImg,
          vUrlInput,
          el('input', { type: 'text', class: 'form-input img-alt', placeholder: 'Alt text', value: alt }),
          el('input', { type: 'number', class: 'form-input img-order', placeholder: 'Order', value: order }),
          el('button', { class: 'btn btn-secondary btn-upload', type: 'button' }, 'Upload'),
          el('button', { class: 'btn btn-danger', type: 'button' }, 'Remove')
        );
        r.querySelector('.btn-upload').addEventListener('click', () => {
          triggerUpload(vUrlInput).then(() => {
            vPreviewImg.src = getIconUrl(vUrlInput.value);
          });
        });
        r.querySelector('.btn-danger').addEventListener('click', () => r.remove());
        vImgs.appendChild(r);
      }

      // If prefill contains images, render them
      if (Array.isArray(prefill.images) && prefill.images.length) {
        prefill.images.forEach(img => {
          const url = img.url || '';
          const alt = img.alt_text || img.alt || '';
          const order = img.display_order != null ? img.display_order : (img.order != null ? img.order : 0);
          addVariantImageRow(url, alt, order);
        });
      }

      // "Add variant image" button
      const addImg = el('button', { class: 'btn btn-outline-primary', type: 'button', style: 'margin-right: 8px;' }, 'Add Variant Image');
      addImg.addEventListener('click', () => addVariantImageRow());

      const duplicateBtn = el('button', { class: 'btn btn-outline-primary', type: 'button', style: 'margin-right: 8px;' }, 'Duplicate');
      duplicateBtn.addEventListener('click', () => {
        const currentPrefill = {
          sku: sku.value + '-duplicate',
          color_name: color.value,
          size: size.value,
          stock_quantity: parseInt(stock.value || '0'),
          price_modifier_cents: parsePriceToCents(priceMod.value),
          images: []
        };
        $all('[data-role="variant-image"]', wrapper).forEach(imgRow => {
          currentPrefill.images.push({
            url: imgRow.querySelector('.img-url').value,
            alt_text: imgRow.querySelector('.img-alt').value,
            display_order: parseInt(imgRow.querySelector('.img-order').value || '0')
          });
        });
        addVariantRow(currentPrefill);
      });

      const removeBtn = el('button', { class: 'btn btn-danger', type: 'button' }, 'Remove Variant');
      removeBtn.addEventListener('click', () => wrapper.remove());

      // assemble wrapper
      wrapper.appendChild(el('label', {}, 'Variant SKU')); wrapper.appendChild(sku);
      wrapper.appendChild(el('label', {}, 'Color')); wrapper.appendChild(color);
      wrapper.appendChild(el('label', {}, 'Size')); wrapper.appendChild(size);
      wrapper.appendChild(el('label', {}, 'Stock quantity')); wrapper.appendChild(stock);
      wrapper.appendChild(el('label', {}, 'Price modifier (€)')); wrapper.appendChild(priceMod);
      wrapper.appendChild(finalPriceDisplay);
      wrapper.appendChild(colorDatalist);
      wrapper.appendChild(vImgs);
      wrapper.appendChild(addImg);
      wrapper.appendChild(duplicateBtn);
      wrapper.appendChild(removeBtn);

      variantsContainer.appendChild(wrapper);
    }

    $('#add-product-image').addEventListener('click', () => addProductImageRow());
    $('#add-variant').addEventListener('click', () => addVariantRow());

    addProductImageRow();
    addVariantRow();

    $('#base_price').addEventListener('input', () => {
      $all('.variant-fields').forEach(v => {
        const pm = v.querySelector('.variant-price-mod');
        const display = v.querySelector('.variant-final-price');
        const base = parsePriceToCents($('#base_price').value);
        const mod = parsePriceToCents(pm.value);
        display.textContent = `Final Price: ${((base + mod) / 100).toFixed(2)} €`;
      });
    });

    // Load products list
    async function loadProducts() {
      const res = await fetch('/api/products');
      const data = await res.json();
      productList.innerHTML = '';
      // support both { products: [...] } and direct array
      const list = Array.isArray(data) ? data : (data.products || []);
      list.forEach(p => {
        const item = el('div', { class: 'product-list-item', style: 'padding:6px; border-bottom:1px solid #eee; cursor:pointer;' }, `${p.name} (${p.product_sku})`);
        item.addEventListener('click', () => loadProduct(p.product_sku)); // use SKU!
        productList.appendChild(item);
      });
    }

    // Load single product by SKU
    async function loadProduct(sku) {
      const res = await fetch(`/api/products/${encodeURIComponent(sku)}`);
      if (!res.ok) return showFeedback(`Failed to load product ${sku}`, 'error');
      const p = await res.json();
      $('#product_sku').value = p.product_sku;
      $('#name').value = p.name;
      const catSelect = $('#category');
      if (catSelect) {
        catSelect.dataset.pendingValue = p.category;
        catSelect.value = p.category;
      }
      $('#base_price').value = (p.base_price_cents / 100).toFixed(2);
      $('#description').value = p.description || '';
      $('#short_description').value = p.short_description || '';
      $('#product_details').value = p.product_details || '';
      $('#related_products').value = (p.related_products || []).join(', ');
      $('#proposed_products').value = (p.proposed_products || []).join(', ');
      $('#tag1').value = p.tag1 || '';
      $('#tag2').value = p.tag2 || '';
      $('#tag3').value = p.tag3 || '';
      $('#weight_grams').value = p.weight_grams || 0;
      $('#length').value = p.dimensions_json?.length || 0;
      $('#width').value = p.dimensions_json?.width || 0;
      $('#height').value = p.dimensions_json?.height || 0;
      imagesContainer.innerHTML = '';
      (p.images || []).forEach(img => addProductImageRow(img.url, img.alt_text || img.alt || '', img.display_order || img.order || 0));
      variantsContainer.innerHTML = '';
      (p.variants || []).forEach(v => addVariantRow(v));
      saveBtn.dataset.editSku = p.product_sku; // store SKU
      showFeedback(`Loaded product ${p.name}`);
    }

    // Save product (POST or PUT)
    saveBtn.addEventListener('click', async () => {
      const payload = {
        product_sku: $('#product_sku').value.trim(),
        name: $('#name').value.trim(),
        category: $('#category').value.trim(),
        description: $('#description').value.trim(),
        short_description: $('#short_description').value.trim(),
        product_details: $('#product_details').value.trim(),
        related_products: $('#related_products').value.split(',').map(s => s.trim()).filter(s => s),
        proposed_products: $('#proposed_products').value.split(',').map(s => s.trim()).filter(s => s),
        tag1: $('#tag1').value.trim(),
        tag2: $('#tag2').value.trim(),
        tag3: $('#tag3').value.trim(),
        weight_grams: parseInt($('#weight_grams').value || '0'),
        dimensions_json: {
          length: parseInt($('#length').value || '0'),
          width: parseInt($('#width').value || '0'),
          height: parseInt($('#height').value || '0')
        },
        base_price_cents: parsePriceToCents($('#base_price').value),
        images: [],
        variants: []
      };

      $all('[data-role="product-image"]').forEach(row => {
        const url = row.querySelector('.img-url').value.trim();
        if (!url) return;
        payload.images.push({
          url,
          alt_text: row.querySelector('.img-alt').value.trim(),
          display_order: parseInt(row.querySelector('.img-order').value || '0')
        });
      });

      $all('.variant-fields').forEach(v => {
        const sku = v.querySelector('.variant-sku').value.trim();
        if (!sku) return;
        const variant = {
          sku,
          color_name: v.querySelector('.variant-color').value.trim(),
          size: v.querySelector('.variant-size').value.trim(),
          stock_quantity: parseInt(v.querySelector('.variant-stock').value || '0'),
          price_modifier_cents: parsePriceToCents(v.querySelector('.variant-price-mod').value),
          images: []
        };
        $all('[data-role="variant-image"]', v).forEach(imgRow => {
          const url = imgRow.querySelector('.img-url').value.trim();
          if (!url) return;
          variant.images.push({
            url,
            alt_text: imgRow.querySelector('.img-alt').value.trim(),
            display_order: parseInt(imgRow.querySelector('.img-order').value || '0')
          });
        });
        payload.variants.push(variant);
      });

      const editSku = saveBtn.dataset.editSku;
      const method = editSku ? 'PUT' : 'POST';
      const url = editSku ? `/api/products/${encodeURIComponent(editSku)}` : '/api/products';

      try {
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await res.json();
        if (res.ok) {
          showFeedback(`Product ${data.name} saved.`, 'success');
          loadProducts();
        } else {
          showFeedback(data.error || 'Save failed', 'error');
        }
      } catch (err) {
        showFeedback('Network error', 'error');
        console.error(err);
      }
    });

    // Delete product
    delBtn.addEventListener('click', async () => {
      const sku = saveBtn.dataset.editSku;
      if (!sku) return showFeedback('No product selected', 'error');
      if (!confirm('Delete this product?')) return;
      const res = await fetch(`/api/products/${encodeURIComponent(sku)}`, { method: 'DELETE' });
      if (res.ok) {
        showFeedback('Deleted', 'success');
        loadProducts();
        // reset editor
        ['product_sku', 'name', 'category', 'base_price', 'description', 'short_description', 'product_details', 'related_products', 'proposed_products', 'tag1', 'tag2', 'tag3', 'weight_grams', 'length', 'width', 'height'].forEach(id => $(`#${id}`).value = '');
        imagesContainer.innerHTML = '';
        variantsContainer.innerHTML = '';
        saveBtn.dataset.editSku = '';
      } else showFeedback('Delete failed', 'error');
    });

    // New product button
    if (newBtn) newBtn.addEventListener('click', () => {
      ['product_sku', 'name', 'category', 'base_price', 'description', 'short_description', 'product_details', 'related_products', 'proposed_products', 'tag1', 'tag2', 'tag3', 'weight_grams', 'length', 'width', 'height'].forEach(id => $(`#${id}`).value = '');
      imagesContainer.innerHTML = '';
      variantsContainer.innerHTML = '';
      addProductImageRow();
      addVariantRow();
      saveBtn.dataset.editSku = '';
      showFeedback('New product');
    });

    // --- Category Dropdown Logic ---
    async function loadCategoryDropdown() {
      const categorySelect = $('#category');
      if (!categorySelect) return;

      const res = await fetch('/api/admin/categories');
      if (res.ok) {
        const categories = await res.json();
        updateCategorySelect(categories);
      }
    }

    function updateCategorySelect(categories) {
      const categorySelect = $('#category');
      if (!categorySelect) return;

      const desiredVal = categorySelect.dataset.pendingValue || categorySelect.value;
      categorySelect.innerHTML = '<option value="">Select Category</option>';
      categories.forEach(cat => {
        const opt = el('option', { value: cat.name }, cat.name);
        if (cat.name === desiredVal) opt.selected = true;
        categorySelect.appendChild(opt);
      });
    }

    // Expose for admin_categories.js
    window.refreshProductCategories = updateCategorySelect;

    // Initial load
    loadProducts();
    loadCategoryDropdown();
  });
})();

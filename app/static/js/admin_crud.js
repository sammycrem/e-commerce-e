// static/js/admin_crud.js
// Admin Product CRUD using SKU as identifier
// Updated to support new attributes: short_description, product_details, related_products, proposed_products, tag1, tag2, tag3

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
      if (feedback) {
          feedback.classList.remove('d-none');
          feedback.className = `alert alert-${type === 'error' ? 'danger' : 'success'} alert-dismissible fade show mb-0`;
          feedback.textContent = msg;
          setTimeout(() => feedback.classList.add('d-none'), 3000);
      } else {
          alert(msg);
      }
    }

    function parsePriceToCents(str) {
      const cleaned = (str || '').toString().replace(',', '.').replace(/[^0-9.]/g, '');
      const val = parseFloat(cleaned);
      return isNaN(val) ? 0 : Math.round(val * 100);
    }

    // Add product image row
    function addProductImageRow(url = '', alt = '', order = 0) {
      const col = el('div', { class: 'col-md-6 mb-2', 'data-role': 'product-image' },
        el('div', { class: 'card p-2 bg-light' },
            el('input', { type: 'text', class: 'form-control form-control-sm mb-1 img-url', placeholder: 'Image URL', value: url }),
            el('input', { type: 'text', class: 'form-control form-control-sm mb-1 img-alt', placeholder: 'Alt text', value: alt }),
            el('div', { class: 'd-flex gap-2' },
                el('input', { type: 'number', class: 'form-control form-control-sm img-order', placeholder: 'Order', value: order }),
                el('button', { class: 'btn btn-sm btn-outline-danger', type: 'button' }, 'Remove')
            )
        )
      );
      col.querySelector('button').addEventListener('click', () => col.remove());
      imagesContainer.appendChild(col);
    }

    // Add variant row
    function addVariantRow(prefill = {}) {
      const id = 'v-' + Math.random().toString(36).substr(2, 9);
      const accordionItem = el('div', { class: 'accordion-item' },
        el('h2', { class: 'accordion-header' },
            el('button', { class: 'accordion-button collapsed', type: 'button', 'data-bs-toggle': 'collapse', 'data-bs-target': '#' + id },
                prefill.sku ? `Variant: ${prefill.sku}` : 'New Variant'
            )
        ),
        el('div', { id: id, class: 'accordion-collapse collapse', 'data-bs-parent': '#variants' },
            el('div', { class: 'accordion-body variant-fields' },
                el('div', { class: 'row g-2 mb-3' },
                    el('div', { class: 'col-md-6' },
                        el('label', { class: 'small fw-bold' }, 'Variant SKU'),
                        el('input', { type: 'text', class: 'form-control form-control-sm variant-sku', value: prefill.sku || '' })
                    ),
                    el('div', { class: 'col-md-3' },
                        el('label', { class: 'small fw-bold' }, 'Color'),
                        el('input', { type: 'text', class: 'form-control form-control-sm variant-color', value: prefill.color_name || '' })
                    ),
                    el('div', { class: 'col-md-3' },
                        el('label', { class: 'small fw-bold' }, 'Size'),
                        el('input', { type: 'text', class: 'form-control form-control-sm variant-size', value: prefill.size || '' })
                    )
                ),
                el('div', { class: 'row g-2 mb-3' },
                    el('div', { class: 'col-md-6' },
                        el('label', { class: 'small fw-bold' }, 'Stock'),
                        el('input', { type: 'number', class: 'form-control form-control-sm variant-stock', value: prefill.stock_quantity || 0 })
                    ),
                    el('div', { class: 'col-md-6' },
                        el('label', { class: 'small fw-bold' }, 'Price Modifier (€)'),
                        el('input', { type: 'text', class: 'form-control form-control-sm variant-price-mod', value: prefill.price_modifier_cents ? (prefill.price_modifier_cents / 100).toFixed(2) : '0.00' })
                    )
                ),
                el('div', { class: 'mb-3' },
                    el('label', { class: 'small fw-bold mb-1' }, 'Variant Images'),
                    el('div', { class: 'variant-images row g-2' })
                ),
                el('div', { class: 'd-flex gap-2' },
                    el('button', { class: 'btn btn-sm btn-outline-secondary add-variant-image', type: 'button' }, 'Add Variant Image'),
                    el('button', { class: 'btn btn-sm btn-outline-danger ms-auto remove-variant', type: 'button' }, 'Remove Variant')
                )
            )
        )
      );

      const vImgs = $('.variant-images', accordionItem);
      function addVariantImageRow(url = '', alt = '', order = 0) {
          const vcol = el('div', { class: 'col-12', 'data-role': 'variant-image' },
              el('div', { class: 'd-flex gap-2' },
                  el('input', { type: 'text', class: 'form-control form-control-sm img-url', placeholder: 'URL', value: url }),
                  el('input', { type: 'text', class: 'form-control form-control-sm img-alt', placeholder: 'Alt', value: alt }),
                  el('input', { type: 'number', class: 'form-control form-control-sm img-order', style: 'width:60px', value: order }),
                  el('button', { class: 'btn btn-sm btn-outline-danger', type: 'button', html: '&times;' })
              )
          );
          vcol.querySelector('button').addEventListener('click', () => vcol.remove());
          vImgs.appendChild(vcol);
      }

      if (Array.isArray(prefill.images)) {
          prefill.images.forEach(img => addVariantImageRow(img.url, img.alt_text || '', img.display_order || 0));
      }

      $('.add-variant-image', accordionItem).addEventListener('click', () => addVariantImageRow());
      $('.remove-variant', accordionItem).addEventListener('click', () => accordionItem.remove());

      variantsContainer.appendChild(accordionItem);
    }

    $('#add-product-image').addEventListener('click', () => addProductImageRow());
    $('#add-variant').addEventListener('click', () => addVariantRow());

    // Load products list
    async function loadProducts() {
      const res = await fetch('/api/admin/products');
      if (!res.ok) return;
      const data = await res.json();
      const products = data.products || [];
      productList.innerHTML = '';
      products.forEach(p => {
        const item = el('button', { class: 'list-group-item list-group-item-action' }, `${p.name} (${p.product_sku})`);
        item.addEventListener('click', () => loadProduct(p.product_sku));
        productList.appendChild(item);
      });
    }

    // Load single product by SKU
    async function loadProduct(sku) {
      const res = await fetch(`/api/admin/products/${encodeURIComponent(sku)}`);
      if (!res.ok) return showFeedback(`Failed to load product ${sku}`, 'error');
      const p = await res.json();
      $('#product_sku').value = p.product_sku;
      $('#name').value = p.name;
      $('#category').value = p.category || '';
      $('#base_price').value = (p.base_price_cents / 100).toFixed(2);
      $('#short_description').value = p.short_description || '';
      $('#description').value = p.description || '';
      $('#product_details').value = p.product_details || '';
      $('#tag1').value = p.tag1 || '';
      $('#tag2').value = p.tag2 || '';
      $('#tag3').value = p.tag3 || '';
      $('#related_products').value = Array.isArray(p.related_products) ? p.related_products.join(', ') : '';
      $('#proposed_products').value = Array.isArray(p.proposed_products) ? p.proposed_products.join(', ') : '';

      imagesContainer.innerHTML = '';
      (p.images || []).forEach(img => addProductImageRow(img.url, img.alt_text || '', img.display_order || 0));

      variantsContainer.innerHTML = '';
      (p.variants || []).forEach(v => addVariantRow(v));

      saveBtn.dataset.editSku = p.product_sku;
      $('#editor-title').textContent = 'Edit Product: ' + p.name;
      showFeedback(`Loaded product ${p.name}`);
    }

    // Save product (POST or PUT)
    saveBtn.addEventListener('click', async () => {
      const payload = {
        product_sku: $('#product_sku').value.trim(),
        name: $('#name').value.trim(),
        category: $('#category').value.trim(),
        short_description: $('#short_description').value.trim(),
        description: $('#description').value.trim(),
        product_details: $('#product_details').value.trim(),
        tag1: $('#tag1').value.trim(),
        tag2: $('#tag2').value.trim(),
        tag3: $('#tag3').value.trim(),
        related_products: $('#related_products').value.split(',').map(s => s.trim()).filter(Boolean),
        proposed_products: $('#proposed_products').value.split(',').map(s => s.trim()).filter(Boolean),
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
      const url = editSku ? `/api/admin/products/${encodeURIComponent(editSku)}` : '/api/admin/products';

      try {
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await res.json();
        if (res.ok) {
          showFeedback(`Product saved.`, 'success');
          loadProducts();
          saveBtn.dataset.editSku = data.product_sku;
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
      const res = await fetch(`/api/admin/products/${encodeURIComponent(sku)}`, { method: 'DELETE' });
      if (res.ok) {
        showFeedback('Deleted', 'success');
        loadProducts();
        resetEditor();
      } else showFeedback('Delete failed', 'error');
    });

    function resetEditor() {
      ['product_sku', 'name', 'category', 'base_price', 'short_description', 'description', 'product_details', 'tag1', 'tag2', 'tag3', 'related_products', 'proposed_products'].forEach(id => {
          const target = $(`#${id}`);
          if (target) target.value = '';
      });
      imagesContainer.innerHTML = '';
      variantsContainer.innerHTML = '';
      saveBtn.dataset.editSku = '';
      $('#editor-title').textContent = 'Create New Product';
      addProductImageRow();
      addVariantRow();
    }

    newBtn.addEventListener('click', resetEditor);

    // Initial load
    loadProducts();
  });
})();

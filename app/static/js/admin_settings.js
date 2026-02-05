document.addEventListener('DOMContentLoaded', () => {
  const activeCurrencySelect = document.getElementById('active-currency-select');
  const saveSettingsBtn = document.getElementById('save-settings');
  const newCurrencySymbol = document.getElementById('new-currency-symbol');
  const addCurrencyBtn = document.getElementById('add-currency');
  const currenciesList = document.getElementById('currencies-list');

  async function loadSettings() {
    try {
      const res = await fetch('/api/admin/settings');
      const settings = await res.json();

      const currenciesRes = await fetch('/api/admin/currencies');
      const currencies = await currenciesRes.json();

      // Populate select
      activeCurrencySelect.innerHTML = '';
      currencies.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.symbol;
        opt.textContent = c.symbol;
        if (settings.currency === c.symbol) opt.selected = true;
        activeCurrencySelect.appendChild(opt);
      });

      // Populate list
      currenciesList.innerHTML = '';
      currencies.forEach(c => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.textContent = c.symbol;

        const delBtn = document.createElement('button');
        delBtn.className = 'btn btn-sm btn-outline-danger';
        delBtn.innerHTML = '<i class="fas fa-trash"></i>';
        delBtn.onclick = () => deleteCurrency(c.id);

        // Don't allow deleting active currency
        if (settings.currency === c.symbol) {
          delBtn.disabled = true;
          li.innerHTML += ' <span class="badge bg-primary ms-2">Active</span>';
        }

        li.appendChild(delBtn);
        currenciesList.appendChild(li);
      });
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }

  saveSettingsBtn.onclick = async () => {
    const currency = activeCurrencySelect.value;
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency })
      });
      if (res.ok) {
        alert('Settings saved! Please refresh to see changes across the dashboard.');
        window.location.reload();
      } else {
        const data = await res.json();
        alert('Error: ' + data.error);
      }
    } catch (err) {
      alert('Failed to save settings');
    }
  };

  addCurrencyBtn.onclick = async () => {
    const symbol = newCurrencySymbol.value.trim();
    if (!symbol) return;
    try {
      const res = await fetch('/api/admin/currencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol })
      });
      if (res.ok) {
        newCurrencySymbol.value = '';
        loadSettings();
      } else {
        const data = await res.json();
        alert('Error: ' + data.error);
      }
    } catch (err) {
      alert('Failed to add currency');
    }
  };

  async function deleteCurrency(id) {
    if (!confirm('Are you sure?')) return;
    try {
      const res = await fetch(`/api/admin/currencies/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        loadSettings();
      } else {
        const data = await res.json();
        alert('Error: ' + data.error);
      }
    } catch (err) {
      alert('Failed to delete currency');
    }
  }

  // Initial load
  loadSettings();
});

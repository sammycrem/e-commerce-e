
import pytest
import io
import json
import csv
from app.models import Product, Variant, ProductImage
from app.app import ADMIN_EMAIL

@pytest.fixture
def auth_client(client, app):
    """Authenticated client using the actual ADMIN_EMAIL from config."""
    # Try to login via POST which is more reliable with various session backends
    from app.app import ADMIN_PASSWORD
    client.post('/login', data={'email': ADMIN_EMAIL, 'password': ADMIN_PASSWORD}, follow_redirects=True)
    return client

def test_export_products_json(auth_client):
    """Test exporting products as JSON."""
    res = auth_client.get('/api/admin/products/export?format=json')
    if res.status_code == 302:
        print(f"Redirected to: {res.location}")
    assert res.status_code == 200
    assert res.headers['Content-Disposition'].startswith('attachment')
    assert res.headers['Content-Type'] == 'application/json'

    data = json.loads(res.data)
    assert isinstance(data, list)
    # Check if TEST-SHIRT from conftest/setup_database exists
    # Note: conftest seeds 'TEST-SHIRT'
    found = any(p['product_sku'] == 'TEST-SHIRT' for p in data)
    assert found

def test_export_products_csv(auth_client):
    """Test exporting products as CSV."""
    res = auth_client.get('/api/admin/products/export?format=csv')
    if res.status_code == 302:
        print(f"Redirected to: {res.location}")
    assert res.status_code == 200
    assert res.headers['Content-Type'] == 'text/csv; charset=utf-8'

    content = res.data.decode('utf-8')
    reader = csv.DictReader(io.StringIO(content))
    rows = list(reader)
    assert len(rows) > 0
    found = any(row['product_sku'] == 'TEST-SHIRT' for row in rows)
    assert found
    # Check if variants/images columns exist and are JSON strings
    assert 'variants_json' in rows[0]
    assert 'images_json' in rows[0]

def test_import_products_override(auth_client, app):
    """Test importing products with override mode."""
    # Create a payload
    new_products = [
        {
            "product_sku": "NEW-PROD-1",
            "name": "New Product 1",
            "base_price_cents": 1000,
            "variants": [],
            "images": []
        }
    ]
    file_content = json.dumps(new_products)

    data = {
        'file': (io.BytesIO(file_content.encode('utf-8')), 'products.json'),
        'mode': 'override'
    }

    res = auth_client.post('/api/admin/products/import', data=data, content_type='multipart/form-data')
    if res.status_code == 302:
        print(f"Redirected to: {res.location}")
    if res.status_code == 302:
        print(f"Redirected to: {res.location}")
    if res.status_code == 302:
        print(f"Redirected to: {res.location}")
    if res.status_code == 302:
        print(f"Redirected to: {res.location}")
    assert res.status_code == 200

    with app.app_context():
        # Should have deleted TEST-SHIRT and added NEW-PROD-1
        assert Product.query.count() == 1
        assert Product.query.filter_by(product_sku='NEW-PROD-1').first() is not None
        assert Product.query.filter_by(product_sku='TEST-SHIRT').first() is None

def test_import_products_skip(auth_client, app):
    """Test importing products with skip mode."""
    # TEST-SHIRT already exists. Try to import it again + a new one.
    import_data = [
        {
            "product_sku": "TEST-SHIRT",
            "name": "Modified Name (Should Skip)",
            "base_price_cents": 9999,
            "variants": []
        },
        {
            "product_sku": "NEW-PROD-SKIP",
            "name": "New Product Skip",
            "base_price_cents": 2000,
            "variants": []
        }
    ]
    file_content = json.dumps(import_data)
    data = {
        'file': (io.BytesIO(file_content.encode('utf-8')), 'products.json'),
        'mode': 'skip'
    }

    res = auth_client.post('/api/admin/products/import', data=data, content_type='multipart/form-data')
    assert res.status_code == 200

    with app.app_context():
        # TEST-SHIRT should remain unchanged
        p = Product.query.filter_by(product_sku='TEST-SHIRT').first()
        assert p.name == 'Test T-Shirt' # Original name

        # NEW-PROD-SKIP should be added
        assert Product.query.filter_by(product_sku='NEW-PROD-SKIP').first() is not None

def test_import_products_update(auth_client, app):
    """Test importing products with update mode."""
    # TEST-SHIRT exists. Update it + add new one.
    import_data = [
        {
            "product_sku": "TEST-SHIRT",
            "name": "Updated Name",
            "base_price_cents": 5000,
            "variants": [
                 {
                    "sku": "TEST-SHIRT-BLK-M", # Existing variant
                    "stock_quantity": 500
                 },
                 {
                     "sku": "TEST-SHIRT-RED-S", # New variant
                     "stock_quantity": 10
                 }
            ]
        },
        {
            "product_sku": "NEW-PROD-UPDATE",
            "name": "New Product Update",
            "base_price_cents": 3000,
            "variants": []
        }
    ]
    file_content = json.dumps(import_data)
    data = {
        'file': (io.BytesIO(file_content.encode('utf-8')), 'products.json'),
        'mode': 'update'
    }

    res = auth_client.post('/api/admin/products/import', data=data, content_type='multipart/form-data')
    assert res.status_code == 200

    with app.app_context():
        # TEST-SHIRT should be updated
        p = Product.query.filter_by(product_sku='TEST-SHIRT').first()
        assert p.name == "Updated Name"
        assert p.base_price_cents == 5000
        # Check variants
        assert len(p.variants) == 2
        v1 = next(v for v in p.variants if v.sku == 'TEST-SHIRT-BLK-M')
        assert v1.stock_quantity == 500

        # NEW-PROD-UPDATE should be added
        assert Product.query.filter_by(product_sku='NEW-PROD-UPDATE').first() is not None

def test_import_csv(auth_client, app):
    """Test importing products from CSV."""
    # Create CSV content
    # Headers: product_sku, name, base_price_cents, variants_json
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['product_sku', 'name', 'base_price_cents', 'variants_json'])

    variants = [{"sku": "CSV-VAR-1", "stock_quantity": 5}]
    writer.writerow(['CSV-PROD-1', 'CSV Product', '1500', json.dumps(variants)])

    file_content = output.getvalue()
    data = {
        'file': (io.BytesIO(file_content.encode('utf-8')), 'products.csv'),
        'mode': 'update'
    }

    res = auth_client.post('/api/admin/products/import', data=data, content_type='multipart/form-data')
    assert res.status_code == 200

    with app.app_context():
        p = Product.query.filter_by(product_sku='CSV-PROD-1').first()
        assert p is not None
        assert p.name == 'CSV Product'
        assert len(p.variants) == 1
        assert p.variants[0].sku == 'CSV-VAR-1'

import pytest
from app.app import create_app, db
from app.models import Product, User, GlobalSetting
from werkzeug.security import generate_password_hash
import io
import json
import csv
import os

@pytest.fixture
def app():
    test_config = {
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        "CACHE_TYPE": "NullCache",
        "WTF_CSRF_ENABLED": False,
        "APP_ADMIN_USER": "admin",
        "APP_SECRET_KEY": "test",
        "APP_SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:", # redundant but safe
        "APP_SESSION_TYPE": "filesystem",
        "APP_SESSION_PERMANENT": "False",
        "APP_PERMANENT_SESSION_LIFETIME": "3600",
        "APP_ADMIN_EMAIL": "admin@example.com",
        "APP_ADMIN_PASSWORD": "admin"
    }
    app = create_app(test_config)

    # Ensure ENCRYPTION_KEY is set for test
    if not os.environ.get('ENCRYPTION_KEY'):
        os.environ['ENCRYPTION_KEY'] = 'testkey123456789012345678901234567890=' # dummy key 32 chars+

    with app.app_context():
        db.create_all()
        # Create Admin User
        admin = User(
            username='admin',
            email='admin@example.com',
            user_id='admin_id_1',
            password=generate_password_hash('admin'),
            encrypted_password='encrypted_dummy'
        )
        db.session.add(admin)

        # Create Initial Product
        p1 = Product(product_sku='TEST-001', name='Original Product', base_price_cents=1000)
        db.session.add(p1)
        db.session.commit()

    yield app

    with app.app_context():
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def auth_client(client):
    client.post('/login', data={'email': 'admin@example.com', 'password': 'admin'})
    return client

def test_export_json(auth_client):
    res = auth_client.get('/api/admin/products/export?format=json')
    assert res.status_code == 200
    data = res.json
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]['product_sku'] == 'TEST-001'

def test_export_csv(auth_client):
    res = auth_client.get('/api/admin/products/export?format=csv')
    assert res.status_code == 200
    assert res.headers['Content-Type'].startswith('text/csv')
    content = res.data.decode('utf-8')
    assert 'product_sku' in content
    assert 'TEST-001' in content

def test_import_override(auth_client, app):
    # Prepare import data (JSON)
    new_products = [
        {
            "product_sku": "NEW-001",
            "name": "New Product",
            "base_price_cents": 2000,
            "variants": []
        }
    ]
    json_file = io.BytesIO(json.dumps(new_products).encode('utf-8'))

    data = {
        'file': (json_file, 'import.json'),
        'mode': 'override'
    }

    res = auth_client.post('/api/admin/products/import', data=data, content_type='multipart/form-data')
    assert res.status_code == 200

    # Verify DB
    with app.app_context():
        assert Product.query.count() == 1
        p = Product.query.first()
        assert p.product_sku == 'NEW-001' # Original should be gone

def test_import_skip(auth_client, app):
    # Prepare data: 1 existing (modified), 1 new
    import_data = [
        {
            "product_sku": "TEST-001", # Existing
            "name": "Modified Name (Should Skip)",
            "base_price_cents": 9999
        },
        {
            "product_sku": "NEW-002",
            "name": "New Product 2",
            "base_price_cents": 3000
        }
    ]
    json_file = io.BytesIO(json.dumps(import_data).encode('utf-8'))

    data = {
        'file': (json_file, 'import.json'),
        'mode': 'skip'
    }

    res = auth_client.post('/api/admin/products/import', data=data, content_type='multipart/form-data')
    assert res.status_code == 200

    with app.app_context():
        assert Product.query.count() == 2
        p1 = Product.query.filter_by(product_sku='TEST-001').first()
        assert p1.name == 'Original Product' # Should NOT change
        p2 = Product.query.filter_by(product_sku='NEW-002').first()
        assert p2.name == 'New Product 2'

def test_import_update(auth_client, app):
    # Prepare data: 1 existing (modified), 1 new
    import_data = [
        {
            "product_sku": "TEST-001", # Existing
            "name": "Updated Name",
            "base_price_cents": 5000
        },
        {
            "product_sku": "NEW-003",
            "name": "New Product 3",
            "base_price_cents": 4000
        }
    ]
    json_file = io.BytesIO(json.dumps(import_data).encode('utf-8'))

    data = {
        'file': (json_file, 'import.json'),
        'mode': 'update'
    }

    res = auth_client.post('/api/admin/products/import', data=data, content_type='multipart/form-data')
    assert res.status_code == 200

    with app.app_context():
        assert Product.query.count() == 2
        p1 = Product.query.filter_by(product_sku='TEST-001').first()
        assert p1.name == 'Updated Name' # Should change
        p2 = Product.query.filter_by(product_sku='NEW-003').first()
        assert p2.name == 'New Product 3'

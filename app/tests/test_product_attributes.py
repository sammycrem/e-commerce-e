
import pytest
import json
from app.app import app as flask_app
from app.extensions import db
from app.models import Product

@pytest.fixture
def client():
    flask_app.config['TESTING'] = True
    flask_app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    with flask_app.test_client() as client:
        with flask_app.app_context():
            db.create_all()
            yield client
            db.drop_all()

def test_product_attributes_persistence(client):
    # 1. Create a product with new attributes
    product_data = {
        "product_sku": "TEST-SKU-1",
        "name": "Test Product",
        "base_price_cents": 1000,
        "short_description": "Short description text",
        "product_details": "Product details text",
        "related_products": ["SKU-A", "SKU-B"],
        "proposed_products": ["SKU-C"],
        "tag1": "Tag One",
        "tag2": "Tag Two",
        "tag3": "Tag Three",
        "variants": [
            {
                "sku": "TEST-SKU-1-VAR",
                "color_name": "Red",
                "size": "M",
                "stock_quantity": 10,
                "price_modifier_cents": 0
            }
        ]
    }

    response = client.post('/api/products',
                           data=json.dumps(product_data),
                           content_type='application/json')
    assert response.status_code == 201

    # 2. Retrieve the product and verify attributes
    response = client.get('/api/products/TEST-SKU-1')
    assert response.status_code == 200
    data = json.loads(response.data)

    assert data['short_description'] == "Short description text"
    assert data['product_details'] == "Product details text"
    assert data['related_products'] == ["SKU-A", "SKU-B"]
    assert data['proposed_products'] == ["SKU-C"]
    assert data['tag1'] == "Tag One"
    assert data['tag2'] == "Tag Two"
    assert data['tag3'] == "Tag Three"

def test_batch_api(client):
    # Create two products
    p1 = {
        "product_sku": "P1", "name": "N1", "base_price_cents": 100,
        "variants": [{"sku": "P1-V", "color_name": "C1", "size": "S"}]
    }
    p2 = {
        "product_sku": "P2", "name": "N2", "base_price_cents": 200,
        "variants": [{"sku": "P2-V", "color_name": "C2", "size": "M"}]
    }
    client.post('/api/products', data=json.dumps(p1), content_type='application/json')
    client.post('/api/products', data=json.dumps(p2), content_type='application/json')

    # Request batch
    response = client.get('/api/products/batch?sku=P1&sku=P2')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert len(data) == 2
    skus = [p['product_sku'] for p in data]
    assert "P1" in skus
    assert "P2" in skus

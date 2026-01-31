import pytest
from app.models import Product, Variant

def test_product_new_attributes(client):
    # Test creating a product with new attributes via API
    payload = {
        "product_sku": "TEST-ATTR-1",
        "name": "Test Attribute Product",
        "category": "Test",
        "base_price_cents": 2500,
        "description": "Long description",
        "short_description": "Short description",
        "product_details": "Product details text",
        "related_products": ["P-1", "P-2"],
        "proposed_products": ["P-3"],
        "tag1": "Tag1",
        "tag2": "Tag2",
        "tag3": "Tag3",
        "images": [],
        "variants": [
            {
                "sku": "TEST-ATTR-1-V1",
                "color_name": "Red",
                "size": "M",
                "stock_quantity": 10,
                "price_modifier_cents": 500,
                "images": []
            }
        ]
    }

    response = client.post('/api/products', json=payload)
    assert response.status_code == 201
    data = response.get_json()
    assert data['short_description'] == "Short description"
    assert data['related_products'] == ["P-1", "P-2"]

    # Test getting the product
    response = client.get('/api/products/TEST-ATTR-1')
    assert response.status_code == 200
    data = response.get_json()
    assert data['tag1'] == "Tag1"
    assert data['variants'][0]['final_price_cents'] == 3000

def test_variant_price_modifier(client, app):
    # Ensure modifier is correctly applied in the backend
    with app.app_context():
        from app.app import db
        p = Product(product_sku="PM-1", name="PM Product", category="Test", base_price_cents=1000)
        db.session.add(p)
        db.session.commit()

        v = Variant(sku="PM-1-V1", product_id=p.id, price_modifier_cents=250)
        db.session.add(v)
        db.session.commit()

    response = client.get('/api/products/PM-1')
    data = response.get_json()
    assert data['variants'][0]['final_price_cents'] == 1250

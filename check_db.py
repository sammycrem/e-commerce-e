import os
import sys

# Ensure app can be imported
sys.path.append(os.getcwd())

from app.app import app, db
from app.models import Product, Variant

with app.app_context():
    products = Product.query.all()
    print(f"Total products: {len(products)}")
    for p in products:
        print(f"ID: {p.id}, SKU: {p.product_sku}, Name: {p.name}")
        variants = Variant.query.filter_by(product_id=p.id).all()
        print(f"  Variants: {len(variants)}")
        for v in variants[:2]:
            print(f"    - {v.sku}")

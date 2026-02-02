import os
import sys
sys.path.append(os.getcwd())
from app.app import app, db
from app.models import Product, ProductImage

with app.app_context():
    p = Product.query.filter_by(product_sku='p-1').first()
    if p:
        print(f"Product: {p.name}")
        for img in p.images:
            print(f"  Image: {img.url}")
    else:
        print("Product p-1 not found")

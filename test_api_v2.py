import requests
import json

BASE_URL = "http://localhost:5000/api"

def test_product_crud():
    # 1. Create a product with new fields
    new_product = {
        "product_sku": "TEST-SKU-1",
        "name": "Test Product",
        "category": "Testing",
        "base_price_cents": 1000,
        "description": "Long description",
        "short_description": "Short description",
        "product_details": "Highly detailed information",
        "related_products": ["p-1", "p-2"],
        "proposed_products": ["p-3", "p-4"],
        "tag1": "New",
        "tag2": "Sale",
        "tag3": "Limited",
        "variants": [
            {
                "sku": "TEST-SKU-1-V1",
                "color_name": "Blue",
                "size": "M",
                "stock_quantity": 5,
                "price_modifier_cents": 0
            }
        ]
    }

    print("Creating product...")
    resp = requests.post(f"{BASE_URL}/products", json=new_product)
    if resp.status_code != 201:
        print(f"Failed to create product: {resp.text}")
        return

    product = resp.json()
    print("Product created successfully.")

    # 2. Verify fields
    fields_to_check = [
        "short_description", "product_details", "tag1", "tag2", "tag3"
    ]
    for f in fields_to_check:
        if product.get(f) != new_product[f]:
            print(f"Field mismatch: {f}. Expected {new_product[f]}, got {product.get(f)}")

    if product.get("related_products") != new_product["related_products"]:
         print(f"Field mismatch: related_products. Expected {new_product['related_products']}, got {product.get('related_products')}")

    # 3. Update product
    update_data = {
        "product_sku": "TEST-SKU-1",
        "name": "Updated Test Product",
        "base_price_cents": 1200,
        "short_description": "Updated short",
        "product_details": "Updated details",
        "tag1": "UpdatedTag",
        "related_products": ["p-2"],
        "variants": new_product["variants"] # Need to keep variants or they might be deleted
    }

    print("Updating product...")
    resp = requests.put(f"{BASE_URL}/products/TEST-SKU-1", json=update_data)
    if resp.status_code != 200:
        print(f"Failed to update product: {resp.text}")
        return

    updated_product = resp.json()
    if updated_product.get("short_description") == "Updated short" and updated_product.get("tag1") == "UpdatedTag":
        print("Product updated successfully.")
    else:
        print(f"Update verification failed: {updated_product}")

    # 4. Clean up
    print("Deleting product...")
    resp = requests.delete(f"{BASE_URL}/products/TEST-SKU-1")
    if resp.status_code == 200:
        print("Product deleted successfully.")
    else:
        print(f"Failed to delete product: {resp.text}")

if __name__ == "__main__":
    try:
        test_product_crud()
    except Exception as e:
        print(f"An error occurred during API testing: {e}")

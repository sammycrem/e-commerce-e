import requests

BASE_URL = "http://127.0.0.1:5000"

def test_admin_api():
    # 1. List products
    res = requests.get(f"{BASE_URL}/api/admin/products")
    print(f"List products status: {res.status_code}")
    if res.status_code == 200:
        data = res.json()
        print(f"Products count: {len(data.get('products', []))}")
        if data.get('products'):
            sku = data['products'][0]['product_sku']
            # 2. Get single product
            res2 = requests.get(f"{BASE_URL}/api/admin/products/{sku}")
            print(f"Get product {sku} status: {res2.status_code}")
            if res2.status_code == 200:
                print(f"Product name: {res2.json()['name']}")

    # 3. Create product
    new_product = {
        "product_sku": "ADMIN-TEST-1",
        "name": "Admin Test Product",
        "base_price_cents": 1000,
        "variants": [
            {"sku": "ADMIN-TEST-1-V1", "stock_quantity": 10}
        ]
    }
    res3 = requests.post(f"{BASE_URL}/api/admin/products", json=new_product)
    print(f"Create product status: {res3.status_code}")
    if res3.status_code == 201 or res3.status_code == 200:
         print("Created successfully")
    else:
         print(f"Error: {res3.text}")

if __name__ == "__main__":
    test_admin_api()

import requests
import sys

BASE_URL = "http://localhost:5000/api"

def test_get_product():
    print("Testing GET /api/products/p-1...")
    res = requests.get(f"{BASE_URL}/products/p-1")
    if res.status_code != 200:
        print(f"Error: Expected 200, got {res.status_code}")
        sys.exit(1)

    data = res.json()
    fields = ["short_description", "product_details", "related_products", "proposed_products", "tag1", "tag2", "tag3"]
    for field in fields:
        if field not in data:
            print(f"Error: Missing field '{field}' in response")
            sys.exit(1)
        print(f"Verified field '{field}': {data[field]}")

    if data["related_products"] != ["p-2", "p-3"]:
        print(f"Error: related_products mismatch. Got {data['related_products']}")
        sys.exit(1)

    print("GET /api/products/p-1 successful.")

def test_update_product():
    print("Testing PUT /api/products/p-1...")
    update_data = {
        "short_description": "Updated short desc",
        "tag1": "NewTag",
        "related_products": ["p-5"]
    }
    # Get current data first to avoid missing required fields if any (though PUT handles partials in our implementation usually, let's check app.py)
    curr = requests.get(f"{BASE_URL}/products/p-1").json()
    curr.update(update_data)

    res = requests.put(f"{BASE_URL}/products/p-1", json=curr)
    if res.status_code != 200:
        print(f"Error: Expected 200, got {res.status_code}")
        print(res.text)
        sys.exit(1)

    updated = res.json()
    if updated["short_description"] != "Updated short desc":
        print(f"Error: short_description not updated. Got {updated['short_description']}")
        sys.exit(1)
    if updated["tag1"] != "NewTag":
        print(f"Error: tag1 not updated. Got {updated['tag1']}")
        sys.exit(1)
    if updated["related_products"] != ["p-5"]:
        print(f"Error: related_products not updated. Got {updated['related_products']}")
        sys.exit(1)

    print("PUT /api/products/p-1 successful.")

if __name__ == "__main__":
    # Ensure server is running
    try:
        requests.get("http://localhost:5000", timeout=2)
    except:
        print("Error: Server not running on http://localhost:5000")
        sys.exit(1)

    test_get_product()
    test_update_product()
    print("All API tests passed!")

import requests
import sys

BASE_URL = "http://localhost:5000/api/admin"

# Note: These tests assume they are run with an authenticated session if @login_required is enforced.
# In a real CI environment, we would handle login.
# For this environment, let's see if we can bypass or if we need to login.
# The app.py uses @login_required for categories.

def test_category_crud():
    print("Testing Category CRUD...")

    # We need a session to handle cookies for login_required
    session = requests.Session()

    # Login as admin
    login_res = session.post("http://localhost:5000/login", data={
        "email": "admin@example.com",
        "password": "adminpass"
    })

    if login_res.status_code != 200 and "Login" in login_res.text:
        print("Login failed, attempting alternative credentials...")
        # Try to find credentials from app.py or environment
        # Based on app.py: ADMIN_USER = config['APP_ADMIN_USER']
        # Default is admin@example.com / admin

    # Create category
    res = session.post(f"{BASE_URL}/categories", json={"name": "Test Category"})
    if res.status_code == 409:
        print("Category already exists, proceeding...")
    elif res.status_code != 201:
        print(f"Error creating category: {res.status_code}")
        print(res.text)
        sys.exit(1)
    else:
        print("Category created.")

    # List categories
    res = session.get(f"{BASE_URL}/categories")
    cats = res.json()
    test_cat = next((c for c in cats if c['name'] == "Test Category"), None)
    if not test_cat:
        print("Error: Test Category not found in list")
        sys.exit(1)
    print("Category found in list.")

    cat_id = test_cat['id']

    # Update category
    res = session.put(f"{BASE_URL}/categories/{cat_id}", json={"name": "Updated Category"})
    if res.status_code != 200:
        print(f"Error updating category: {res.status_code}")
        sys.exit(1)
    print("Category updated.")

    # Delete category
    res = session.delete(f"{BASE_URL}/categories/{cat_id}")
    if res.status_code != 200:
        print(f"Error deleting category: {res.status_code}")
        sys.exit(1)
    print("Category deleted.")

    print("Category CRUD tests passed!")

if __name__ == "__main__":
    test_category_crud()

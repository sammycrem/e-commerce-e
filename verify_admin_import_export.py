
from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        # Login
        page.goto("http://localhost:5000/login")
        page.fill("input[name='email']", "admin@example.com")
        page.fill("input[name='password']", "adminpass")
        page.click("button:has-text('Login')")

        # Go to Admin
        page.goto("http://localhost:5000/admin")

        # Click Products tab (it is active by default but to be safe)
        page.click("#products-tab")

        # Check for Export Dropdown
        expect(page.locator("button:has-text('Export')")).to_be_visible()
        page.click("button:has-text('Export')")
        expect(page.locator("#btn-export-json")).to_be_visible()
        expect(page.locator("#btn-export-csv")).to_be_visible()

        # Check Import Button
        expect(page.locator("#btn-import-products")).to_be_visible()
        page.click("#btn-import-products")

        # Verify Modal
        modal = page.locator("#importModal")
        expect(modal).to_be_visible()
        expect(modal.locator("text=Import Products")).to_be_visible()
        expect(modal.locator("#importFile")).to_be_visible()
        expect(modal.locator("input[name='importMode']")).to_have_count(3)

        # Take screenshot of the modal
        page.screenshot(path="verification_modal.png")
        print("Screenshot taken: verification_modal.png")

        browser.close()

if __name__ == "__main__":
    run()

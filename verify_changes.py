import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        try:
            # Login
            print("Logging in...")
            await page.goto("http://localhost:5000/login")
            await page.fill("input[name='email']", "admin@example.com")
            await page.fill("input[name='password']", "adminpass")
            await page.click("button[type='submit']")
            await page.wait_for_load_state("networkidle")

            # Verify Admin Page
            print("Verifying Admin Dashboard...")
            await page.goto("http://localhost:5000/admin")
            await page.wait_for_selector("#product-list")

            # Check for new fields in Admin UI
            fields = [
                "short_description", "product_details",
                "related_products", "proposed_products",
                "tag1", "tag2", "tag3"
            ]
            for field in fields:
                visible = await page.is_visible(f"#{field}")
                print(f"Admin field {field} visible: {visible}")

            await page.screenshot(path="/home/jules/verification/admin_dashboard.png")
            print("Admin dashboard screenshot saved.")

            # Verify Product Detail Page (assuming p-1 exists)
            print("Verifying Product Detail Page (p-1)...")
            await page.goto("http://localhost:5000/product/p-1")
            await page.wait_for_selector("#product-name")

            # Check for UI elements
            ui_elements = [
                "#product-tags",
                "#product-description",
                "#product-details-section",
                "#related-products-section",
                "#proposed-products-section"
            ]
            for el in ui_elements:
                visible = await page.is_visible(el)
                print(f"UI element {el} visible: {visible}")
                if visible:
                    content = await page.inner_text(el)
                    print(f"  Content length: {len(content)}")

            await page.screenshot(path="/home/jules/verification/product_detail_p1.png")
            print("Product detail screenshot saved.")

        except Exception as e:
            print(f"An error occurred: {e}")
            await page.screenshot(path="/home/jules/verification/error.png")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())

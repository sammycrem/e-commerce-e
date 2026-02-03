import asyncio
from playwright.async_api import async_playwright
import os

async def verify():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        # Set a large viewport to ensure the sidebar (d-lg-block) is visible
        context = await browser.new_context(viewport={'width': 1920, 'height': 1080})
        page = await context.new_page()

        try:
            # Go to product p-1
            print("Navigating to product p-1...")
            await page.goto("http://localhost:5000/product/p-1", wait_until="networkidle")

            # 1. Check Tags
            print("Checking tags...")
            tags = await page.locator(".tag-badge").all_text_contents()
            print(f"Found tags: {tags}")
            expected_tags = ["NEWTAG", "TAG2", "TAG3"]
            for tag in expected_tags:
                if tag not in tags:
                    print(f"MISSING TAG: {tag}")

            # 2. Check Short Description
            print("Checking short description...")
            short_desc = await page.locator("#product-description").text_content()
            print(f"Short desc: {short_desc.strip()}")

            # 3. Check Product Details
            print("Checking product details...")
            details = await page.locator("#product-details-container").text_content()
            print(f"Details: {details.strip()}")

            # 4. Check Sidebar Visibility
            print("Checking sidebar...")
            sidebar = page.locator("#sidebar-cart-list")
            await sidebar.wait_for(state="visible", timeout=5000)
            print("Sidebar is visible.")

            sidebar_title = await page.locator("h5.fw-bold.mb-0").first.text_content()
            print(f"Sidebar Title: {sidebar_title}")

            # 5. Check Recommended for You (Proposed Products)
            print("Checking Recommended for You section...")
            proposed = page.locator("#proposed-products-section")
            await proposed.wait_for(state="visible", timeout=5000)
            print("Recommended section is visible.")

            # 6. Test Add to Cart and Sidebar Refresh
            print("Testing Add to Cart...")
            # Select first color and size if not auto-selected (should be auto-selected)
            await page.click("#add-to-cart")
            await asyncio.sleep(1) # wait for refresh

            cart_items = await page.locator(".sidebar-item").count()
            print(f"Cart items in sidebar: {cart_items}")

            total = await page.locator("#sidebar-total").text_content()
            print(f"Sidebar total: {total}")

            await page.screenshot(path="verify_frontend_final.png", full_page=True)
            print("Screenshot saved to verify_frontend_final.png")

        except Exception as e:
            print(f"Verification failed: {e}")
            await page.screenshot(path="verification_error.png")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(verify())

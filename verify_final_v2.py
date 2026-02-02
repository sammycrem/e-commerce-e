
import asyncio
import os
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # 1. Check Homepage
        print("Checking Homepage icons...")
        await page.goto("http://localhost:5000/")
        await page.screenshot(path="verify_home.png")
        await page.wait_for_selector(".product-card img")

        # Find product P-1 specifically if possible
        p1_img_locator = page.locator(".product-card:has-text('T-Shirt P-1') img").first
        img_src = await p1_img_locator.get_attribute("src")
        print(f"Home P-1 image src: {img_src}")
        if "_icon." in img_src:
            print("  SUCCESS: Home page uses icons.")
        else:
            print("  FAILURE: Home page does NOT use icons.")

        # 2. Check Shop Page
        print("Checking Shop Page icons...")
        await page.goto("http://localhost:5000/shop")
        await page.wait_for_selector(".product-card img")
        p1_img_shop_locator = page.locator(".product-card:has-text('T-Shirt P-1') img").first
        img_src_shop = await p1_img_shop_locator.get_attribute("src")
        print(f"Shop P-1 image src: {img_src_shop}")
        if "_icon." in img_src_shop:
            print("  SUCCESS: Shop page uses icons.")
        else:
            print("  FAILURE: Shop page does NOT use icons.")

        # 3. Check Product Detail Page
        sku = "p-1"
        print(f"Checking Product Detail Page for {sku}...")
        await page.goto(f"http://localhost:5000/product/{sku}")
        await page.screenshot(path="verify_product.png")
        await page.wait_for_selector("#main-image")

        # Wait for images to load via JS
        await page.wait_for_selector(".thumb-item img")

        main_src = await page.get_attribute("#main-image", "src")
        print(f"Main image src: {main_src}")
        if "_icon." not in main_src:
            print("  SUCCESS: Main image is full size.")
        else:
            print("  FAILURE: Main image is using icon!")

        thumb_src = await page.get_attribute(".thumb-item img", "src")
        print(f"Thumb image src: {thumb_src}")
        if "_icon." in thumb_src:
            print("  SUCCESS: Gallery thumbnails use icons.")
        else:
            print("  FAILURE: Gallery thumbnails do NOT use icons.")

        # 4. Check Cart Page
        print("Checking Cart Page...")
        # Add to cart first (on product page)
        # Wait for "Added ✓" to appear on the button to ensure fetch completed
        await page.click("#add-to-cart")
        await page.wait_for_selector("text=Added ✓")

        await page.goto("http://localhost:5000/cart")
        await page.wait_for_selector(".product-info img")
        cart_img_src = await page.get_attribute(".product-info img", "src")
        print(f"Cart image src: {cart_img_src}")
        if "_icon." in cart_img_src:
            print("  SUCCESS: Cart page uses icons.")
        else:
            print("  FAILURE: Cart page does NOT use icons.")

        # 5. Check Admin Dashboard Previews
        print("Checking Admin Dashboard previews...")
        await page.goto("http://localhost:5000/login")
        await page.fill('input[name="email"]', 'admin@example.com')
        await page.fill('input[name="password"]', 'adminpass')
        await page.click('button[type="submit"]')
        await page.goto("http://localhost:5000/admin")
        await page.wait_for_selector(".product-list-item")

        # Select P-1
        await page.click("text=T-Shirt P-1 (p-1)")
        # Wait for product info to load into inputs
        await page.wait_for_function('document.getElementById("product_sku").value === "p-1"')
        await page.wait_for_selector(".image-row img")
        await page.screenshot(path="verify_admin.png")
        admin_preview_src = await page.get_attribute(".image-row img", "src")
        print(f"Admin preview src: {admin_preview_src}")
        if "_icon." in admin_preview_src:
            print("  SUCCESS: Admin dashboard uses icons for previews.")
        else:
            print("  FAILURE: Admin dashboard does NOT use icons for previews.")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())

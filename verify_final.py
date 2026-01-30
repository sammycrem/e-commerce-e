import asyncio
from playwright.async_api import async_playwright
import os

async def verify():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context()
        page = await context.new_page()

        # Navigate to a product page
        sku = "p-1"
        await page.goto(f"http://localhost:5000/product/{sku}")

        # Wait for content to load
        try:
            await page.wait_for_selector("#product-name:not(:has-text('Loading...'))", timeout=5000)
        except:
            print("Timeout waiting for product name")

        # Capture screenshot
        os.makedirs('/home/jules/verification', exist_ok=True)
        await page.screenshot(path='/home/jules/verification/product_p1_final.png', full_page=True)

        name = await page.inner_text("#product-name")
        print(f"Product name found: {name}")

        short_desc = await page.inner_text("#product-short-description")
        print(f"Short description found: {short_desc}")

        details = await page.inner_text("#product-details")
        print(f"Details found: {details.replace('\n', ' ')}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify())

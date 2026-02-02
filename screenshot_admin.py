import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Login
        await page.goto("http://localhost:5000/login")
        await page.fill('input[name="email"]', 'admin@example.com')
        await page.fill('input[name="password"]', 'adminpass')
        await page.click('button[type="submit"]')

        # Go to Admin
        await page.goto("http://localhost:5000/admin")
        await page.wait_for_selector(".product-list-item")

        # Select P-1
        await page.click("text=T-Shirt P-1 (p-1)")
        await page.wait_for_function('document.getElementById("product_sku").value === "p-1"')

        # Scroll down to see new fields
        await page.evaluate("window.scrollTo(0, 500)")
        await page.screenshot(path="admin_p1_edit.png", full_page=True)

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())

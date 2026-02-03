import asyncio
from playwright.async_api import async_playwright

async def debug_frontend():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto("http://localhost:5000/product/p-1")
        await page.wait_for_timeout(2000)
        await page.screenshot(path="debug_product.png", full_page=True)
        print("Screenshot saved to debug_product.png")
        html = await page.content()
        with open("debug_product.html", "w") as f:
            f.write(html)
        await browser.close()

if __name__ == "__main__":
    asyncio.run(debug_frontend())

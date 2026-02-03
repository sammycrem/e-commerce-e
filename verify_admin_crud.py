import asyncio
from playwright.async_api import async_playwright
import os

async def verify():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(viewport={'width': 1280, 'height': 800})
        page = await context.new_page()

        try:
            print("Navigating to Admin Dashboard...")
            await page.goto("http://localhost:5000/admin", wait_until="networkidle")

            # Find and click on T-Shirt P-1 (p-1)
            print("Selecting product p-1...")
            await page.click("text=T-Shirt P-1 (p-1)")
            await asyncio.sleep(1) # wait for load

            # Verify fields
            print("Verifying field values...")

            short_desc = await page.input_value("#short_description")
            print(f"Short Description: {short_desc}")
            if short_desc != "Updated short desc":
                print("FAILURE: Short description mismatch")

            details = await page.input_value("#product_details")
            print(f"Product Details: {details}")
            if details != "Detailed info for p-1":
                print("FAILURE: Product details mismatch")

            tag1 = await page.input_value("#tag1")
            print(f"Tag 1: {tag1}")
            if tag1 != "NewTag":
                print("FAILURE: Tag1 mismatch")

            # Try to update a value and save
            print("Updating Tag 1 and saving...")
            await page.fill("#tag1", "UpdatedTag")
            await page.click("#save-product")

            # Wait for success feedback
            await page.wait_for_selector(".feedback.success", timeout=5000)
            print("Save successful feedback seen.")

            # Refresh and check again
            await page.reload(wait_until="networkidle")
            await page.click("text=T-Shirt P-1 (p-1)")
            await asyncio.sleep(1)

            tag1_after = await page.input_value("#tag1")
            print(f"Tag 1 after reload: {tag1_after}")
            if tag1_after == "UpdatedTag":
                print("SUCCESS: Admin CRUD verified for new fields.")
            else:
                print("FAILURE: Admin CRUD did not persist change.")

            await page.screenshot(path="verify_admin_crud.png")

        except Exception as e:
            print(f"Verification failed: {e}")
            await page.screenshot(path="admin_verification_error.png")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(verify())

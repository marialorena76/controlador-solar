import re
import time
from playwright.sync_api import Playwright, sync_playwright, expect

def run(playwright: Playwright) -> None:
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Log console messages
    page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))

    try:
        # Navigate to the app
        page.goto("http://127.0.0.1:5000/")

        # 1. Wait for the city search input to be visible and fetch cities
        expect(page.locator("#buscar-ciudad")).to_be_visible(timeout=10000)

        # Wait for the city list to be populated (wait for at least one 'li' element)
        page.wait_for_selector("#lista-ciudades li", timeout=15000)

        # 2. Search for a city and select it
        page.locator("#buscar-ciudad").fill("Tandil")
        # Wait for the filtered list to appear
        page.wait_for_selector("#lista-ciudades li:has-text('Tandil')", timeout=5000)

        # Use a more specific locator to click the exact match for "TANDIL, BUENOS AIRES"
        page.locator("#lista-ciudades li").filter(has_text=re.compile(r"^TANDIL, BUENOS AIRES$")).click()

        # Verify selection with the full city name
        expect(page.locator("#ciudad-seleccionada")).to_have_text("Ciudad seleccionada: TANDIL, BUENOS AIRES")

        # 3. Confirm the city
        page.locator("#confirmar-ciudad").click()

        # Wait for the text to update using a JS function, which is more robust for async updates
        page.wait_for_function("document.getElementById('ciudad-seleccionada').textContent.includes('Ciudad confirmada')", timeout=10000)

        # Now that we know the text has updated, we can assert the full content
        expect(page.locator("#ciudad-seleccionada")).to_have_text("Ciudad confirmada: TANDIL, BUENOS AIRES")
        expect(page.locator("#user-type-section")).to_be_visible(timeout=5000)

        print("SUCCESS: City selection and confirmation flow works.")

        # Take a screenshot of the final state
        page.screenshot(path="final_state.png")
        print("Screenshot 'final_state.png' captured.")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="error_state.png")
        print("Screenshot 'error_state.png' captured due to an error.")
        raise

    finally:
        # ---------------------
        context.close()
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
import re
from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # 1. Navigate to the application
        page.goto("http://localhost:8000")

        # 2. Locate the new city search input field
        search_input = page.locator("#ciudad-search-input")
        expect(search_input).to_be_visible(timeout=10000)

        # 3. Type a city name and press Enter to confirm selection
        city_to_select = "Olavarría"
        search_input.type(city_to_select, delay=100) # Type slowly to allow datalist to appear
        search_input.press("Enter")

        # 4. Assert that the location display has updated
        location_display = page.locator("#location-display")
        expect(location_display).to_contain_text(f"Ubicación seleccionada: {city_to_select}", timeout=10000)

        # 5. Take a screenshot for visual confirmation
        page.screenshot(path="jules-scratch/verification/city_search_verification.png")
        print("✅ City search verification successful. Screenshot saved.")

    except Exception as e:
        print(f"❌ An error occurred during verification: {e}")
        page.screenshot(path="jules-scratch/verification/city_search_failure.png")

    finally:
        # 6. Clean up
        context.close()
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
from playwright.sync_api import sync_playwright, expect
import re

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # 1. Navigate to the application
        page.goto("http://127.0.0.1:8000", timeout=30000)
        print("Navigated to the page.")

        # 2. Locate the city search input
        city_input = page.locator("#ciudad-search-input")
        expect(city_input).to_be_visible(timeout=10000)
        print("City input is visible.")

        city_to_select = "Olavarría"

        # 3. Fill the input with the exact city name
        city_input.fill(city_to_select)
        print(f"Filled input with '{city_to_select}'.")

        # 4. Trigger the 'change' event by blurring the input.
        # Clicking another element is a reliable way to do this.
        page.locator("body").click()
        print("Clicked body to blur input and trigger change event.")

        # Add a small delay to ensure the event has time to be processed.
        page.wait_for_timeout(2000)

        # 5. Verify the location display has updated
        location_display = page.locator("#location-display")

        # Use a regular expression to make the text check more flexible
        expect(location_display).to_have_text(re.compile(city_to_select), timeout=15000)
        print("Location display updated correctly.")

        # 6. Take a screenshot for visual confirmation
        screenshot_path = "jules-scratch/verification/verification.png"
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        # Clean up
        context.close()
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
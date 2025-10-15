from playwright.sync_api import sync_playwright, expect
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        page.goto("http://127.0.0.1:5000/calculador.html")

        # Wait for the map to be visible
        expect(page.locator("#map")).to_be_visible(timeout=15000)

        # Wait for the userSelections object to be available
        page.wait_for_function("window.userSelections")

        # Bypass the initial location confirmation
        page.evaluate("document.getElementById('confirm-location-btn').disabled = false;")
        page.evaluate("window.userSelections.city = 'La Plata';")
        page.locator("#confirm-location-btn").click()

        # Select user type to get to the next step
        user_type_section = page.locator("#user-type-section")
        expect(user_type_section).to_be_visible(timeout=5000)
        page.locator("#basic-user-button").click()

        # Go to the data form screen
        expect(page.locator("#income-section")).to_be_visible(timeout=5000)
        page.locator("#income-high-button").click()

        # Now on the data form screen, select a zona
        zona_section = page.locator("#data-meteorologicos-section")
        expect(zona_section).to_be_visible(timeout=5000)
        page.locator("input[name='zonaInstalacionNewScreen'][value='Urbana']").click()

        # Click the next button
        page.locator("#next-to-energia").click()

        # Verify that the energia section is now visible
        energia_section = page.locator("#energia-section")
        expect(energia_section).to_be_visible(timeout=5000)

        # Verify that the appliance list is visible
        appliance_list = page.locator("#electrodomesticos-list")
        expect(appliance_list).to_be_visible(timeout=10000)

        # Take a screenshot to show the result
        page.screenshot(path="jules-scratch/verification/verification.png")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error_screenshot.png")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
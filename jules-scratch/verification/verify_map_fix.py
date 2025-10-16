from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = browser.new_page()

    import os
    filepath = os.path.abspath("calculador.html")
    page.goto(f"file://{filepath}")

    # 1. Click the geocoder icon to expand it
    page.click(".leaflet-control-geocoder-icon")

    # 2. Search for a city and select it
    geocoder_input = page.locator(".leaflet-control-geocoder-form input")
    expect(geocoder_input).to_be_visible()
    geocoder_input.fill("La Plata")
    page.press(".leaflet-control-geocoder-form input", "Enter")
    page.wait_for_selector(".leaflet-control-geocoder-alternatives a")
    page.click(".leaflet-control-geocoder-alternatives a")

    # 3. Wait for the confirm button to be enabled and click it
    confirm_btn = page.locator("#confirm-location-btn")
    expect(confirm_btn).to_be_enabled()
    confirm_btn.click()

    # 4. Wait for user type section to be visible
    user_type_section = page.locator("#user-type-section")
    expect(user_type_section).to_be_visible()

    # 5. Click "Básico"
    page.click("#basic-user-button")

    # 6. Wait for supply section to be visible
    supply_section = page.locator("#supply-section")
    expect(supply_section).to_be_visible()

    page.screenshot(path="jules-scratch/verification/verification.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
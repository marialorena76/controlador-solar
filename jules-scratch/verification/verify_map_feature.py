from playwright.sync_api import sync_playwright, Page, expect
import time

def verify_map_interaction(page: Page):
    """
    This script verifies that the Leaflet map and geocoder are correctly integrated.
    It simulates a click on the map, confirms the UI updates via reverse geocoding,
    and captures a screenshot.
    """
    try:
        # 1. Navigate to the application homepage.
        page.goto("http://127.0.0.1:5000/calculador.html", timeout=20000)

        # 2. Wait for the map container to be visible.
        map_container = page.locator("#map")
        expect(map_container).to_be_visible(timeout=15000)

        # Give the map tiles and geocoder a moment to load
        page.wait_for_timeout(3000)

        # 3. Simulate a click on the map (center of the map container).
        map_container.click()

        # 4. Wait for the reverse geocoding to complete and update the UI.
        # The Nominatim reverse geocoder can be slow, so we'll wait a bit longer.
        page.wait_for_timeout(3000)

        # 5. Assert that the location details have been updated.
        # Clicking the center of the map (initially Buenos Aires) should return a relevant address.
        address_display = page.locator("#address-display")
        expect(address_display).not_to_have_text("-", timeout=10000)

        # 6. Check that the "Confirmar Ubicación" button is enabled.
        confirm_button = page.locator("#confirmar-ubicacion-mapa")
        expect(confirm_button).to_be_enabled()

        # 7. Take a screenshot to show the map after a successful click.
        page.screenshot(path="jules-scratch/verification/verification.png")

    except Exception as e:
        print(f"An error occurred during verification: {e}")
        # Take a screenshot on error for debugging.
        page.screenshot(path="jules-scratch/verification/error_verification.png")
        raise e

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        verify_map_interaction(page)
        browser.close()

if __name__ == "__main__":
    main()
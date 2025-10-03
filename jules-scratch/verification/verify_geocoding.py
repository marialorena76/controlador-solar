from playwright.sync_api import Page, expect
import time

def test_geocoding_and_map_click(page: Page):
    """
    This test verifies that the geocoding search and map click functionalities
    are working correctly. It also ensures the search icon is visible.
    """
    # 1. Arrange: Go to the application's homepage.
    page.goto("http://127.0.0.1:5000/index.html")

    # 2. Assert: Verify that the geocoder input and search icon are visible.
    geocoder_input = page.locator(".leaflet-control-geocoder-form input")
    search_icon = page.locator(".leaflet-control-geocoder-icon")

    expect(geocoder_input).to_be_visible(timeout=10000)
    expect(search_icon).to_be_visible()

    # 3. Act: Enter an address and select the first result.
    geocoder_input.fill("Olavarría, Buenos Aires")
    page.locator(".leaflet-control-geocoder-alternatives li").first.click()

    # 4. Assert: Check that the location display has been updated.
    location_display = page.locator("#location-display")
    expect(location_display).to_have_text("Ubicación seleccionada: Olavarría", timeout=10000)

    # 5. Act: Click on a different location on the map.
    map_container = page.locator("#map")
    map_container.click(position={"x": 200, "y": 200})
    time.sleep(5) # Wait for reverse geocoding

    # 6. Screenshot: Capture the final result for visual verification.
    page.screenshot(path="jules-scratch/verification/verification.png")
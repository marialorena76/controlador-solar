from playwright.sync_api import Page, expect

def test_map_and_buttons_are_working(page: Page):
    """
    This test verifies that the map is visible and the 'Básico' and 'Avanzado'
    buttons are interactive, which was the user's original issue.
    """
    # 1. Arrange: Go to the application's homepage.
    # The Flask server runs on port 5000 by default.
    page.goto("http://127.0.0.1:5000/index.html")

    # 2. Act & Assert: Verify that the map and key buttons are visible.
    # We use expect(...).to_be_visible() which waits for the element to appear.
    # This implicitly checks that the JS has run without fatal errors.

    # Check for the map container
    map_container = page.locator("#map")
    expect(map_container).to_be_visible(timeout=10000) # Increased timeout for map loading

    # Check for the buttons
    basic_button = page.locator("#basic-user-button")
    expert_button = page.locator("#expert-user-button")

    expect(basic_button).to_be_visible()
    expect(expert_button).to_be_visible()
    expect(basic_button).to_be_enabled()
    expect(expert_button).to_be_enabled()

    # 3. Act: Click the "Básico" button to test interactivity.
    basic_button.click()

    # 4. Assert: Check that clicking the button reveals the next section.
    supply_section = page.locator("#supply-section")
    expect(supply_section).to_be_visible()

    # 5. Screenshot: Capture the final result for visual verification.
    page.screenshot(path="jules-scratch/verification/verification.png")
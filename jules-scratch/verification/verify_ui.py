from playwright.sync_api import Page, expect

def test_initial_ui_state(page: Page):
    """
    This test verifies that the initial UI displays the city search input
    and user type selection buttons, while the map is hidden.
    """
    # 1. Arrange: Go to the application's home page.
    page.goto("http://127.0.0.1:8000")

    # 2. Assert: Verify that the correct elements are visible.
    # Check for the city search input
    city_search_input = page.locator("#ciudad-search-input")
    expect(city_search_input).to_be_visible()

    # Check for the user type selection buttons
    basic_user_button = page.get_by_role("button", name="Básico")
    expert_user_button = page.get_by_role("button", name="Avanzado")
    expect(basic_user_button).to_be_visible()
    expect(expert_user_button).to_be_visible()

    # Verify that the map is hidden
    map_element = page.locator("#map")
    expect(map_element).to_be_hidden()

    # 3. Screenshot: Capture the final result for visual verification.
    page.screenshot(path="jules-scratch/verification/verification.png")
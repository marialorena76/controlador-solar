import asyncio
from playwright.sync_api import sync_playwright, expect
import os

def run_test(page):
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    file_path = os.path.join(base_dir, 'calculador.html')

    page.goto(f'file://{file_path}')

    # Listen for any uncaught exceptions on the page
    errors = []
    page.on("pageerror", lambda error: errors.append(error))

    # Directly call the function we want to test
    page.evaluate('buscarCodigoCiudad("Olavarria")')

    # Wait for network requests to complete
    page.wait_for_timeout(3000)

    # Check if there were any errors
    if errors:
        print("Page errors found:")
        for error in errors:
            print(error)
        raise Exception("Page errors occurred during test.")

    print("Test completed successfully with no page errors.")
    # Take a screenshot to show the page is still there
    page.screenshot(path="jules-scratch/verification/verification.png")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    # Mock the API calls
    def mock_api(route, request):
        if 'api/buscar_ciudad' in request.url:
            route.fulfill(status=200, json={"codigo_ciudad": "OLAVARRIA"})
        else:
            # For this test, we don't need the other APIs
            route.continue_()

    page.route("**/api/buscar_ciudad", mock_api)

    run_test(page)
    browser.close()

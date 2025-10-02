from playwright.sync_api import sync_playwright

def run_verification(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Navigate to the application's homepage
        page.goto("http://127.0.0.1:8000", timeout=15000)

        # Wait for the main map container to be present in the DOM,
        # even if it's not fully rendered. This is a basic check.
        page.wait_for_selector("#map", timeout=10000)

        # Take a screenshot of the initial page load
        page.screenshot(path="jules-scratch/verification/initial_page_load.png")
        print("Screenshot 'initial_page_load.png' created successfully.")

    except Exception as e:
        print(f"An error occurred during page load verification: {e}")
        # Take a screenshot even on error to see the state of the page
        page.screenshot(path="jules-scratch/verification/page_load_error.png")
    finally:
        browser.close()

with sync_playwright() as p:
    run_verification(p)
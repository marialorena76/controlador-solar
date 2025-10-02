from playwright.sync_api import sync_playwright, expect

def run_verification(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # 1. Navigate to the application
        page.goto("http://127.0.0.1:8000")

        # 2. Wait for the map screen and the expert button to be visible
        expect(page.locator("#map-screen")).to_be_visible()
        expert_button = page.locator("#expert-user-button")
        expect(expert_button).to_be_visible()

        # 3. Click the "Avanzado" button
        expert_button.click()

        # 4. Give a brief moment for any JS animations/transitions to complete
        page.wait_for_timeout(500)

        # 5. Take a screenshot to see the result of the click
        page.screenshot(path="jules-scratch/verification/expert_click_result.png")
        print("Screenshot 'expert_click_result.png' created successfully.")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/expert_click_error.png")
    finally:
        browser.close()

with sync_playwright() as p:
    run_verification(p)
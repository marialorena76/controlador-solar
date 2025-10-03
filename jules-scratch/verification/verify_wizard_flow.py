import re
from playwright.sync_api import Page, expect, sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Listen for console messages to aid in debugging if needed
    page.on("console", lambda msg: print(f"BROWSER CONSOLE: [{msg.type}] {msg.text}"))

    try:
        # 1. Go to the application
        page.goto("http://127.0.0.1:5000/")

        # 2. City Selection Step
        # Wait for the city list to be populated
        expect(page.locator("#lista-ciudades li").first).to_be_visible(timeout=10000)

        # Type and select a city
        page.get_by_label("Buscá tu ciudad:").fill("Tandil")
        page.get_by_role("listitem").filter(has_text="Tandil").click()

        # Confirm the city
        page.get_by_role("button", name="Confirmar ciudad").click()

        # 3. User Type Selection Step
        # Verify the section is now visible
        expect(page.locator("#user-type-section")).to_be_visible(timeout=5000)
        page.get_by_role("button", name="Avanzado").click()

        # 4. Supply Type Selection Step
        # Verify the section is now visible
        expect(page.locator("#supply-section")).to_be_visible()
        page.get_by_role("button", name="Residencial").click()

        # 5. Income Level Selection Step
        # Verify the section is now visible
        expect(page.locator("#income-section")).to_be_visible()
        page.get_by_role("button", name="ALTO").click()

        # 6. Final Verification Step
        # Verify the main data form screen is now visible
        expect(page.locator("#data-form-screen")).to_be_visible()
        # Verify the first section within the data form is visible
        expect(page.locator("#data-meteorologicos-section")).to_be_visible()
        expect(page.get_by_role("heading", name="¿En qué zona se encuentra la instalación?")).to_be_visible()

        # 7. Take a screenshot for visual confirmation
        page.screenshot(path="jules-scratch/verification/verification.png")

        print("Playwright script executed successfully. Screenshot saved.")

    except Exception as e:
        print(f"An error occurred during Playwright verification: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
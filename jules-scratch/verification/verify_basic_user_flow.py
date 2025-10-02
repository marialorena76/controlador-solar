import re
from playwright.sync_api import Page, expect, sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # 1. Go to the main page
        page.goto("http://127.0.0.1:5000")

        # 2. Select "Básico"
        page.get_by_role("button", name="Básico").click()

        # 3. Select "Residencial"
        page.get_by_role("button", name="Residencial").click()

        # 4. Select income level "ALTO"
        page.get_by_role("button", name="ALTO").click()

        # 5. On the data form screen, select a "Zona de Instalación"
        expect(page.locator("#data-form-screen")).to_be_visible()
        page.get_by_role("radio", name="Urbana", exact=True).check()

        # 6. Go to the "Energía" section
        page.get_by_role("button", name="Siguiente").click()

        # 7. Enter some appliance quantities
        expect(page.locator("#energia-section")).to_be_visible()

        # Expand the "Cocina" accordion and fill the input
        cocina_header = page.get_by_role("heading", name="Cocina")
        cocina_header.click()
        page.pause() # Pause to inspect the state
        heladera_input = page.locator("#cant-Heladera")
        heladera_input.wait_for(state='visible')
        heladera_input.fill("2")

        # Expand the "Entretenimiento" accordion and fill the input
        entretenimiento_header = page.get_by_role("heading", name="Entretenimiento")
        entretenimiento_header.click()
        televisor_input = page.locator("#cant-Televisor")
        televisor_input.wait_for(state='visible')
        televisor_input.fill("3")

        # 8. Go to the "Análisis Económico" section
        page.get_by_role("button", name="Siguiente").click()

        # 9. Click "Finalizar y ver resultados"
        expect(page.locator("#analisis-economico-section")).to_be_visible()
        page.get_by_role("button", name="Finalizar y ver resultados").click()

        # 10. Verify that the summary report is displayed
        results_container = page.locator("#resultados-informe")
        expect(results_container).to_be_visible(timeout=20000)
        expect(results_container.get_by_text("Datos técnicos del dimensionamiento")).to_be_visible()
        expect(page).to_have_url(re.compile(r"http://127.0.0.1:5000/?"))

        # 11. Take a screenshot
        page.screenshot(path="jules-scratch/verification/basic_user_report.png")
        print("Screenshot saved to jules-scratch/verification/basic_user_report.png")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error_screenshot.png")

    finally:
        context.close()
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
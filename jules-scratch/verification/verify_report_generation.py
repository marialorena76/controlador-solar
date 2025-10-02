from playwright.sync_api import sync_playwright, expect

def run_verification(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # 1. Navigate to the application
        page.goto("http://127.0.0.1:8000")

        # --- Step 1: Initial Setup on Map Screen ---

        # Wait for the map screen to be visible
        expect(page.locator("#map-screen")).to_be_visible()

        # Select user type: Avanzado
        page.locator("#expert-user-button").click()

        # Wait for the next section to become visible before proceeding
        expect(page.locator("#supply-section")).to_be_visible(timeout=5000)

        # Select supply type: Residencial
        page.locator("#residential-button").click()

        # Select income level: Medio
        expect(page.locator("#income-medium-button")).to_be_visible()
        page.locator("#income-medium-button").click()

        # Fill in a dummy address to enable form progression
        # The geocoder input is inside the #geocoder-container
        # We need to wait for the selector to be available as it's added by JS
        geocoder_selector = "#geocoder-container .leaflet-control-geocoder-form input"
        page.wait_for_selector(geocoder_selector, timeout=10000) # Wait up to 10 seconds

        geocoder_input = page.locator(geocoder_selector)
        expect(geocoder_input).to_be_visible()
        geocoder_input.fill("Buenos Aires, Argentina")
        # Click on the map to simulate address selection confirmation
        page.locator("#map").click()


        # --- Step 2: Data Form Screen ---

        # Wait for the data form screen to appear and select "Zona"
        expect(page.locator("#data-meteorologicos-section")).to_be_visible()
        page.locator('input[name="zonaInstalacionNewScreen"][value="Urbana"]').click()
        page.locator("#next-to-energia").click()

        # --- Step 3: Energy Consumption ---

        # Wait for the energy section and select input method
        expect(page.locator("#energia-section")).to_be_visible()
        page.locator('input[name="metodoIngresoConsumo"][value="boletaMensual"]').click()

        # Fill in monthly consumption data
        expect(page.locator("#consumo-factura-section")).to_be_visible()
        for month in ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]:
            page.locator(f"#consumo-{month}").fill("100")

        page.locator("#next-to-paneles").click()

        # --- Step 4: Panel Selection ---

        expect(page.locator("#panel-marca-subform")).to_be_visible()
        # Select panel brand
        marca_select = page.locator("#marca-panel-select")
        expect(marca_select).to_be_visible()
        marca_select.select_option("GENERICOS")

        # Input panel power
        potencia_input = page.locator("#potencia-panel-deseada-input")
        expect(potencia_input).to_be_visible()
        potencia_input.fill("450")

        # Wait for the model to auto-populate (with a timeout)
        expect(page.locator("#modelo-panel-input")).to_have_value("GENERICO 450W", timeout=5000)

        page.locator("#next-to-inversor-from-panels").click()

        # --- Step 5: Inversor Selection ---

        expect(page.locator("#inversor-section")).to_be_visible()
        inversor_select = page.locator("#inversor-select")
        expect(inversor_select).to_be_visible(timeout=10000) # Increased timeout for API call
        # Select the first available option
        inversor_select.select_option(index=1)
        page.locator("#next-to-perdidas").click()

        # --- Step 6: Pérdidas Section ---

        # Modelo de Temperatura
        expect(page.locator("#panel-modelo-temperatura-subform")).to_be_visible()
        page.locator('input[name="modeloTemperaturaSelect"][value="Mattei"]').click()
        page.locator("#next-to-frecuencia-lluvias-from-modelo-temperatura").click()

        # Frecuencia de Lluvias
        expect(page.locator("#frecuencia-lluvias-subform-content")).to_be_visible()
        page.locator("#frecuencia-lluvias-select").select_option(index=1)
        page.locator("#next-to-foco-polvo-from-frecuencia").click()

        # Foco de Polvo
        expect(page.locator("#foco-polvo-subform-content")).to_be_visible()
        page.locator('input[name="focoPolvoOptions"][value="NO"]').click()
        page.locator("#next-to-analisis-from-foco-polvo").click()

        # --- Step 7: Final Analysis ---

        expect(page.locator("#analisis-economico-section")).to_be_visible()
        page.locator("#moneda").select_option("Dólares")
        page.locator("#finalizar-calculo").click()

        # --- Step 8: Verification ---

        # Wait for the results container to be populated with the report summary
        report_container = page.locator("#resultados-informe .basic-report-summary-container")
        expect(report_container).to_be_visible(timeout=15000) # Wait up to 15s for the report

        # Check for a specific piece of data to confirm it's not empty
        expect(report_container.locator("text=Resultado del dimensionamiento fotovoltaico")).to_be_visible()

        # Take a screenshot
        page.screenshot(path="jules-scratch/verification/report_populated.png")
        print("Screenshot 'report_populated.png' created successfully.")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")
    finally:
        browser.close()

with sync_playwright() as p:
    run_verification(p)
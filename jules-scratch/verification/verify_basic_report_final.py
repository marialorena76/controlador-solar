from playwright.sync_api import sync_playwright, expect

def run_verification(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        log_step("1. Navigating to the application")
        page.goto("http://127.0.0.1:8000", timeout=20000)

        # --- Step 2: Initial Setup on Map Screen (Basic User Flow) ---
        log_step("2. Setting up as a basic residential user")

        expect(page.locator("#map-screen")).to_be_visible()

        log_step("   - Clicking 'Básico'")
        page.locator("#basic-user-button").click()

        log_step("   - Clicking 'Residencial'")
        expect(page.locator("#supply-section")).to_be_visible(timeout=5000)
        page.locator("#residential-button").click()

        log_step("   - Clicking 'Medio'")
        expect(page.locator("#income-section")).to_be_visible(timeout=5000)
        page.locator("#income-medium-button").click()

        # --- Step 3: Data Form Screen ---
        log_step("3. Filling out the data form")

        expect(page.locator("#data-meteorologicos-section")).to_be_visible(timeout=10000)

        log_step("   - Selecting 'Zona Urbana'")
        page.locator('input[name="zonaInstalacionNewScreen"][value="Urbana"]').click()
        page.locator("#next-to-energia").click()

        # --- Step 4: Energy Consumption ---
        log_step("4. Entering energy consumption")

        expect(page.locator("#energia-section")).to_be_visible(timeout=5000)

        # Open the 'Cocina' accordion
        cocina_accordion_title = page.locator("h2.acordeon-titulo", has_text="Cocina")
        expect(cocina_accordion_title).to_be_visible(timeout=10000)
        cocina_accordion_title.click()

        # Add one appliance
        heladera_input = page.locator("#cant-Heladera")
        expect(heladera_input).to_be_visible(timeout=5000)
        heladera_input.fill("1")
        log_step("   - Added 1 Heladera")

        page.locator("#next-to-paneles").click()

        # --- Step 5: Final Analysis ---
        log_step("5. Finalizing calculation")

        expect(page.locator("#analisis-economico-section")).to_be_visible(timeout=5000)
        page.locator("#moneda").select_option("Dólares")
        page.locator("#finalizar-calculo").click()

        # --- Step 6: Verification on Report Page ---
        log_step("6. Verifying the report page")

        page.wait_for_url("**/informe.html", timeout=20000)
        log_step("   - Navigated to informe.html")

        report_body = page.locator("#basico_resultados_excel_body")
        expect(report_body).to_be_visible(timeout=10000)

        # Check for a specific, expected piece of text in the report
        expect(report_body.locator("text=Consumo anual de energía eléctrica")).to_be_visible(timeout=5000)
        log_step("   - Report table is populated with expected data")

        # Take a screenshot
        page.screenshot(path="jules-scratch/verification/basic_report_final.png")
        print("Screenshot 'basic_report_final.png' created successfully.")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")
    finally:
        browser.close()

def log_step(message):
    print(f"\n[Verification Step] {message}")

with sync_playwright() as p:
    run_verification(p)
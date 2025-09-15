import pandas as pd
import os
import math
import json

# --- Constants ---
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
EXCEL_FILE_PATH = os.path.join(SCRIPT_DIR, 'Calculador Solar - web 06-24_con ayuda - modificaciones 2025_5.xlsx')

# --- Calibrated Parameters from the original engine ---
HSP_DIARIO_PROMEDIO = 5.98
PERFORMANCE_RATIO = 1.0
FACTOR_AUTOCONSUMO = 0.4225
TARIFA_CONSUMO_PROMEDIO_ARS = 79.5675
TARIFA_INYECCION_PROMEDIO_ARS = 86.52
COSTO_INVERSION_USD_POR_W = 4.64
COSTO_MANTENIMIENTO_USD_POR_W_ANUAL = 0.00807
TASA_CAMBIO_USD_ARS = 1150.00
VIDA_UTIL_ANOS = 25
FACTOR_EMISION_TCO2_POR_MWH = 0.4658

def _get_user_inputs(user_data):
    """
    Extracts and validates user inputs from the data dictionary sent by the frontend.
    This function is critical for mapping frontend keys to backend keys.
    """
    # Safely extract all expected keys from the user_data dictionary, providing defaults.
    inputs = {
        "lat": user_data.get("location", {}).get("lat", -34.6037),
        "lng": user_data.get("location", {}).get("lng", -58.3816),

        # Determine consumption type and data based on frontend logic
        "consumo_tipo": user_data.get("metodoIngresoConsumoEnergia"), # Can be 'boletaMensual' or 'detalleHogar'
        "consumo_factura_mensual": user_data.get("consumosMensualesFactura", []),
        "consumo_anual_total": user_data.get("totalAnnualConsumption", 0),

        # Panel data mapping
        "paneles_marca": user_data.get("marcaPanel", "GENERICOS"),
        "paneles_potencia": user_data.get("potenciaPanelDeseada") or 450,

        # Installation details mapping
        "rotacion_descripcion": user_data.get("rotacionInstalacion", {}).get("descripcion", "fijos"),
        "angulo_inclinacion": user_data.get("anguloInclinacion", 35),
        "angulo_orientacion": user_data.get("anguloOrientacion", 0),

        # Economic data mapping
        "moneda": user_data.get("selectedCurrency", "Pesos argentinos")
    }

    # If consumption type is by bill but the array is empty/zeros, use the totalAnnualConsumption as a fallback.
    # This handles cases where user selects bill method but doesn't enter details.
    if inputs["consumo_tipo"] == 'boletaMensual' and not any(inputs["consumo_factura_mensual"]):
        if inputs["consumo_anual_total"] > 0:
            monthly_avg = inputs["consumo_anual_total"] / 12
            inputs["consumo_factura_mensual"] = [monthly_avg] * 12
            print(f"DEBUG: Using annual consumption fallback for bill method. Monthly avg: {monthly_avg}")

    return inputs

def _calculate_annual_consumption(inputs):
    """
    Calculates the annual energy consumption based on the user's selected method.
    """
    consumo_tipo = inputs.get("consumo_tipo")

    # If the user chose to enter by bill ('boletaMensual') and provided valid monthly values, sum them up.
    if consumo_tipo == 'boletaMensual':
        factura_mensual = inputs.get("consumo_factura_mensual", [])
        if factura_mensual and any(factura_mensual): # Check if list is not empty and has non-zero values
            print(f"DEBUG: Calculating annual consumption from monthly bill: {sum(factura_mensual)}")
            return sum(factura_mensual)

    # For 'detalleHogar' (appliances), or as a fallback for the bill method if no data was entered,
    # use the total annual consumption pre-calculated by the frontend.
    print(f"DEBUG: Using totalAnnualConsumption from frontend: {inputs.get('consumo_anual_total', 0)}")
    return inputs.get("consumo_anual_total", 0)

def run_calculation_engine(user_data, excel_path=EXCEL_FILE_PATH):
    """
    Top-level function to run the entire calculation process.
    This engine re-implements the Excel logic in Python and structures the output.
    """
    print("DEBUG: Python Calculation Engine Started.")
    inputs = _get_user_inputs(user_data)
    user_type = user_data.get("userType", "basico")

    # --- Pipeline de Cálculo ---
    consumo_anual_kwh = _calculate_annual_consumption(inputs)
    panel_seleccionado = _select_panel(inputs)
    system_size_data = _calculate_system_size(consumo_anual_kwh, panel_seleccionado)
    selected_inverter = _select_inverter(system_size_data.get("total_system_power_wp", 0))
    energy_generation_data = _calculate_energy_generation(
        system_size_data.get("total_system_power_wp", 0),
        consumo_anual_kwh
    )
    economics_data = _calculate_economics(inputs, system_size_data, energy_generation_data)
    environmental_data = _calculate_environmental_impact(energy_generation_data.get("generacion_anual_kwh", 0))
    chart_data = _calculate_chart_data(consumo_anual_kwh, energy_generation_data)

    # --- Ensamblado del Reporte Final Estructurado ---

    # Datos técnicos para ambos tipos de usuario
    technical_data_dict = {
        "consumo_anual_kwh": consumo_anual_kwh,
        "energia_generada_anual": energy_generation_data.get("generacion_anual_kwh"),
        "autoconsumo": energy_generation_data.get("autoconsumo_kwh"),
        "inyectada_red": energy_generation_data.get("inyectada_red_kwh"),
        "potencia_paneles_sugerida": panel_seleccionado.get('Pmax[W]'),
        "cantidad_paneles_necesarios": system_size_data.get("number_of_panels"),
        "superficie_necesaria": system_size_data.get("number_of_panels", 0) * panel_seleccionado.get('Area (m2)', 0),
        "vida_util_proyecto": VIDA_UTIL_ANOS,
    }

    # Datos económicos para ambos tipos de usuario
    economic_data_dict = {
        "costo_anual_reducido": economics_data.get("costo_futuro"),
        "gasto_anual_sin_fv": economics_data.get("costo_actual"),
        "inversion_inicial": economics_data.get("inversion_inicial"),
        # Mantener otros datos económicos por si son útiles para el modo experto
        "mantenimiento": economics_data.get("mantenimiento"),
        "ingreso_red": economics_data.get("ingreso_red"),
        "ahorro_total": economics_data.get("ahorro_total"),
        "flujo_de_fondos": economics_data.get("flujo_de_fondos"),
    }

    final_report = {
        "userType": user_type,
        "moneda": inputs["moneda"],
        "emisiones_evitadas_total_tco2": environmental_data.get("emisiones_evitadas_total_tco2"),
        "technical_data": technical_data_dict,
        "economic_data": economic_data_dict,
        "chart_data": chart_data
    }

    # Si es usuario experto, enriquecemos el diccionario de datos técnicos
    if user_type == 'experto':
        expert_tech_data = _calculate_technical_data(
            inputs,
            system_size_data,
            energy_generation_data,
            panel_seleccionado,
            selected_inverter
        )
        # Unimos los datos básicos con los de experto
        final_report['technical_data'].update(expert_tech_data)

    print("DEBUG: Engine calculation finished.")
    return final_report

def _calculate_technical_data(inputs, system_size_data, energy_generation_data, panel_seleccionado, selected_inverter):
    """
    Calculates and assembles the detailed technical data required for the expert report.
    This function replaces reading from a static Excel sheet.
    """
    # 1. Radiación y Performance (simulado por ahora, puede ser mejorado con modelos más complejos)
    # Placeholder values to ensure the report has data. A real implementation would calculate these.
    annual_irradiance = 1750  # Example: kWh/m²/year
    performance_ratio = 75.0   # Example: %

    # 2. Panel Details
    panel_details = {
        "Marca": panel_seleccionado.get("Marca", "N/A"),
        "Potencia": panel_seleccionado.get("Pmax[W]", "N/A"),
        "Modelo": panel_seleccionado.get("Modelo", "N/A"),
        "Eficiencia informada por el fabricante del panel": panel_seleccionado.get("Eficiencia", "N/A"),
        "Cantidad Paneles Necesarios": system_size_data.get("number_of_panels", "N/A"),
        "Superficie necesaria": system_size_data.get("number_of_panels", 0) * panel_seleccionado.get('Area (m2)', 0),
        "Potencia Instalada Wp": system_size_data.get("total_system_power_wp", "N/A")
    }

    # 3. Inverter Details
    inverter_details = {
        "Inversores sugeridos": selected_inverter.get("NOMBRE", "N/A"),
        "Potencia": selected_inverter.get("Pot nom CA [W]", "N/A"),
        "Eficiencia informada por el fabricante del INVERSOR": selected_inverter.get("Eficiencia Europea", "N/A"),
        "Cantidad de Inversores": 1  # Assuming 1 for this calculation model
    }

    # 4. Monthly Generation
    annual_generation = energy_generation_data.get("generacion_anual_kwh", 0)
    # Using a typical solar curve for the southern hemisphere
    monthly_distribution = [0.12, 0.11, 0.10, 0.08, 0.06, 0.05, 0.05, 0.07, 0.09, 0.10, 0.11, 0.12]
    monthly_generation_kwh = [annual_generation * p for p in monthly_distribution]

    # 5. Losses (simulated with typical values)
    # A more advanced model could calculate these based on user inputs.
    losses = {
        "sombreado": 3.0,    # Placeholder % for shading
        "suciedad": 2.0,     # Placeholder % for soiling
        "reflexion": 5.0,    # Placeholder % for reflection/IAM
        "dc_ac": 4.0,        # Placeholder % for DC/AC conversion (inverter)
        "planta": 1.0        # Placeholder % for other system losses (cabling, etc.)
    }

    # Assemble the final dictionary
    technical_data = {
        "annual_irradiance": annual_irradiance,
        "performance_ratio": performance_ratio,
        "annual_generation": annual_generation,
        "monthly_generation": monthly_generation_kwh,
        "panel_details": panel_details,
        "inverter_details": inverter_details,
        "losses": losses
    }
    return technical_data

def _select_panel(inputs, data_path=os.path.join(SCRIPT_DIR, 'data')):
    """Selects a solar panel based on user's brand and power criteria."""
    with open(os.path.join(data_path, 'paneles_comerciales.json'), 'r') as f:
        paneles_comerciales = json.load(f)
    with open(os.path.join(data_path, 'paneles_genericos.json'), 'r') as f:
        paneles_genericos = json.load(f)

    df_comerciales = pd.DataFrame(paneles_comerciales)
    df_genericos = pd.DataFrame(paneles_genericos)

    marca = inputs["paneles_marca"]
    potencia = inputs["paneles_potencia"]

    if marca == 'GENERICOS':
        df_paneles = df_genericos.copy()
    else:
        df_paneles = df_comerciales[df_comerciales['Marca'] == marca].copy()

    if df_paneles.empty:
        df_paneles = df_genericos.copy()

    # --- Data Sanitization to prevent TypeError ---
    df_paneles['Pmax[W]'] = pd.to_numeric(df_paneles['Pmax[W]'], errors='coerce')
    df_paneles.dropna(subset=['Pmax[W]'], inplace=True)

    # Handle case where no valid panels are left after cleaning
    if df_paneles.empty:
        print("ERROR: No valid panels found for the selected criteria after data sanitization. Falling back to all generics.")
        df_paneles = df_genericos.copy()
        df_paneles['Pmax[W]'] = pd.to_numeric(df_paneles['Pmax[W]'], errors='coerce')
        df_paneles.dropna(subset=['Pmax[W]'], inplace=True)
        if df_paneles.empty:
             print("CRITICAL ERROR: No valid panels could be loaded even from the generic list.")
             return {"error": "No valid panel data could be loaded from the generic list."}

    df_paneles['diff'] = (df_paneles['Pmax[W]'] - potencia).abs()
    panel_seleccionado_row = df_paneles.loc[df_paneles['diff'].idxmin()]
    panel_data = panel_seleccionado_row.to_dict()
    return {k: v for k, v in panel_data.items() if pd.notna(v)}

def _calculate_system_size(annual_consumption_kwh, selected_panel):
    """Estimates the required number of panels and total system power."""
    if not selected_panel or 'Pmax[W]' not in selected_panel or selected_panel['Pmax[W]'] <= 0:
        return {"error": "Datos del panel seleccionado son inválidos."}

    single_panel_power_wp = selected_panel['Pmax[W]']
    annual_consumption_wh = annual_consumption_kwh * 1000
    hsp_anual = HSP_DIARIO_PROMEDIO * 365
    required_power_wp = annual_consumption_wh / (hsp_anual * PERFORMANCE_RATIO)
    number_of_panels = math.ceil(required_power_wp / single_panel_power_wp)
    total_system_power_wp = number_of_panels * single_panel_power_wp

    return {
        "number_of_panels": number_of_panels,
        "total_system_power_wp": total_system_power_wp,
    }

def _select_inverter(total_system_power_wp, data_path=os.path.join(SCRIPT_DIR, 'data')):
    """Selects the best-matching inverter from the list."""
    with open(os.path.join(data_path, 'inversores_genericos.json'), 'r') as f:
        inversores = json.load(f)
    df_inversores = pd.DataFrame(inversores)

    min_inverter_power_w = total_system_power_wp / 1.25
    suitable_inverters = df_inversores[df_inversores['Pot nom CA [W]'] >= min_inverter_power_w]

    if suitable_inverters.empty:
        selected_inverter_row = df_inversores.loc[df_inversores['Pot nom CA [W]'].idxmax()]
    else:
        selected_inverter_row = suitable_inverters.loc[suitable_inverters['Pot nom CA [W]'].idxmin()]

    inverter_data = selected_inverter_row.to_dict()
    return {k: v for k, v in inverter_data.items() if pd.notna(v)}

def _calculate_energy_generation(total_system_power_wp, annual_consumption_kwh):
    """Calculates energy generation, self-consumption, and grid injection."""
    total_system_power_kwp = total_system_power_wp / 1000.0
    hsp_anual = HSP_DIARIO_PROMEDIO * 365
    generacion_anual_kwh = total_system_power_kwp * hsp_anual * PERFORMANCE_RATIO
    autoconsumo_kwh = min(annual_consumption_kwh * FACTOR_AUTOCONSUMO, generacion_anual_kwh)
    inyectada_red_kwh = generacion_anual_kwh - autoconsumo_kwh

    return {
        "generacion_anual_kwh": generacion_anual_kwh,
        "autoconsumo_kwh": autoconsumo_kwh,
        "inyectada_red_kwh": inyectada_red_kwh,
    }

def _calculate_economics(inputs, system_data, generation_data):
    """Calculates all economic indicators."""
    annual_consumption_kwh = _calculate_annual_consumption(inputs)
    inyectada_red_kwh = generation_data.get("inyectada_red_kwh", 0)
    total_system_power_wp = system_data.get("total_system_power_wp", 0)

    costo_actual_anual_ars = annual_consumption_kwh * TARIFA_CONSUMO_PROMEDIO_ARS
    inversion_inicial_ars = (total_system_power_wp * COSTO_INVERSION_USD_POR_W) * TASA_CAMBIO_USD_ARS
    mantenimiento_anual_ars = (total_system_power_wp * COSTO_MANTENIMIENTO_USD_POR_W_ANUAL) * TASA_CAMBIO_USD_ARS
    ingreso_red_anual_ars = inyectada_red_kwh * TARIFA_INYECCION_PROMEDIO_ARS
    energia_comprada_kwh = max(0, annual_consumption_kwh - generation_data.get("generacion_anual_kwh", 0))
    costo_futuro_anual_ars = energia_comprada_kwh * TARIFA_CONSUMO_PROMEDIO_ARS

    beneficios_totales_ars = (costo_actual_anual_ars * VIDA_UTIL_ANOS) + (ingreso_red_anual_ars * VIDA_UTIL_ANOS)
    costos_totales_ars = inversion_inicial_ars + (mantenimiento_anual_ars * VIDA_UTIL_ANOS)
    ahorro_total_ars = beneficios_totales_ars - costos_totales_ars

    # Cash flow chart data
    flujo_de_fondos = []
    for year in range(VIDA_UTIL_ANOS + 1):
        if year == 0:
            flujo_sin_proyecto = 0
            flujo_con_proyecto = -inversion_inicial_ars
        else:
            flujo_sin_proyecto = -costo_actual_anual_ars
            flujo_con_proyecto = ingreso_red_anual_ars - costo_futuro_anual_ars - mantenimiento_anual_ars

        flujo_de_fondos.append({
            "anio": year,
            "sin_proyecto": flujo_sin_proyecto,
            "con_proyecto": flujo_con_proyecto
        })

    if inputs["moneda"] == 'Dólares':
        return {
            "costo_actual": costo_actual_anual_ars / TASA_CAMBIO_USD_ARS,
            "inversion_inicial": inversion_inicial_ars / TASA_CAMBIO_USD_ARS,
            "mantenimiento": mantenimiento_anual_ars / TASA_CAMBIO_USD_ARS,
            "costo_futuro": costo_futuro_anual_ars / TASA_CAMBIO_USD_ARS,
            "ingreso_red": ingreso_red_anual_ars / TASA_CAMBIO_USD_ARS,
            "ahorro_total": ahorro_total_ars / TASA_CAMBIO_USD_ARS,
            "resumen_economico": "El análisis detallado estará disponible en futuras versiones.",
            "vida_util": VIDA_UTIL_ANOS,
            "flujo_de_fondos": [{k: v / TASA_CAMBIO_USD_ARS if k != 'anio' else v for k, v in item.items()} for item in flujo_de_fondos]
        }
    else: # Pesos argentinos
        return {
            "costo_actual": costo_actual_anual_ars,
            "inversion_inicial": inversion_inicial_ars,
            "mantenimiento": mantenimiento_anual_ars,
            "costo_futuro": costo_futuro_anual_ars,
            "ingreso_red": ingreso_red_anual_ars,
            "ahorro_total": ahorro_total_ars,
            "resumen_economico": "El análisis detallado estará disponible en futuras versiones.",
            "vida_util": VIDA_UTIL_ANOS,
            "flujo_de_fondos": flujo_de_fondos
        }

def get_panel_model_name(marca, potencia, excel_path):
    """
    Looks up the specific panel model name based on brand and power.
    This is a lightweight function for use before the full calculation.
    """
    try:
        data_path = os.path.join(os.path.dirname(excel_path), 'data')
        with open(os.path.join(data_path, 'paneles_comerciales.json'), 'r', encoding='utf-8') as f:
            paneles_comerciales = json.load(f)
        with open(os.path.join(data_path, 'paneles_genericos.json'), 'r', encoding='utf-8') as f:
            paneles_genericos = json.load(f)

        df_comerciales = pd.DataFrame(paneles_comerciales)
        df_genericos = pd.DataFrame(paneles_genericos)

        if marca == 'GENERICOS':
            df_paneles = df_genericos.copy()
        else:
            df_paneles = df_comerciales[df_comerciales['Marca'] == marca].copy()

        if df_paneles.empty:
            df_paneles = df_genericos.copy()

        # --- Data Sanitization to prevent TypeError ---
        df_paneles['Pmax[W]'] = pd.to_numeric(df_paneles['Pmax[W]'], errors='coerce')
        df_paneles.dropna(subset=['Pmax[W]'], inplace=True)

        if df_paneles.empty:
            return f"No hay paneles válidos para la marca '{marca}'"

        # Find the panel with the closest power rating
        df_paneles['diff'] = (df_paneles['Pmax[W]'] - potencia).abs()

        panel_seleccionado_row = df_paneles.loc[df_paneles['diff'].idxmin()]

        # Specific check from Excel logic: if the power difference is too large, it's an error.
        # This threshold can be adjusted. Let's use 50W as a reasonable threshold.
        if panel_seleccionado_row['diff'] > 50:
            return "VERIFIQUE LA POTENCIA, NO HAY PANELES DE ESA POTENCIA DE LA MARCA ELEGIDA"

        model_name = panel_seleccionado_row.get('Modelo')

        return model_name if pd.notna(model_name) else "Modelo no encontrado"

    except FileNotFoundError:
        return {"error": "Archivo de datos de paneles no encontrado."}
    except Exception as e:
        print(f"ERROR in get_panel_model_name: {e}")
        return {"error": f"Error interno al buscar el modelo de panel: {str(e)}"}


def _calculate_chart_data(annual_consumption_kwh, energy_generation_data):
    """
    Generates plausible daily and monthly data for charts based on annual totals.
    This is a simplified model and does not perform a full hourly simulation.
    """
    # --- Monthly Data Simulation ---
    # Southern hemisphere solar generation curve (higher in summer)
    solar_dist = [0.12, 0.11, 0.10, 0.08, 0.06, 0.05, 0.05, 0.07, 0.09, 0.10, 0.11, 0.12]
    # Typical consumption curve (higher in summer/winter peaks)
    consump_dist = [0.10, 0.09, 0.08, 0.07, 0.06, 0.07, 0.08, 0.09, 0.08, 0.09, 0.10, 0.11]

    monthly_generation = [energy_generation_data.get("generacion_anual_kwh", 0) * p for p in solar_dist]
    monthly_total_consumption = [annual_consumption_kwh * p for p in consump_dist]

    monthly_autoconsumption = []
    monthly_injection = []
    monthly_consumption_from_grid = []

    for i in range(12):
        gen = monthly_generation[i]
        cons = monthly_total_consumption[i]
        # Simplified assumption: a fixed fraction of generation goes to self-consumption, up to the consumption limit
        autocons = min(cons, gen * FACTOR_AUTOCONSUMO * 2) # Adjusting factor for monthly granularity
        monthly_autoconsumption.append(autocons)
        monthly_injection.append(gen - autocons)
        monthly_consumption_from_grid.append(max(0, cons - autocons))

    # --- Daily Data Simulation ---
    # Typical daily solar generation curve (bell curve)
    daily_gen_dist = [0,0,0,0,0,0.01,0.05,0.1,0.14,0.16,0.18,0.16,0.14,0.1,0.05,0.01,0,0,0,0,0,0,0,0]
    # Typical daily consumption (double hump - morning and evening)
    daily_cons_dist = [0.03,0.02,0.02,0.02,0.03,0.04,0.05,0.06,0.05,0.04,0.04,0.04,0.04,0.04,0.04,0.05,0.06,0.07,0.08,0.07,0.06,0.05,0.04,0.04]

    # Summer (Jan - index 0), Winter (Jul - index 6)
    summer_daily_gen_kw = [monthly_generation[0] / 31 * p for p in daily_gen_dist]
    summer_daily_cons_kw = [monthly_total_consumption[0] / 31 * p for p in daily_cons_dist]
    winter_daily_gen_kw = [monthly_generation[6] / 31 * p for p in daily_gen_dist]
    winter_daily_cons_kw = [monthly_total_consumption[6] / 31 * p for p in daily_cons_dist]

    return {
        "monthly_consumption": monthly_consumption_from_grid,
        "monthly_autoconsumption": monthly_autoconsumption,
        "monthly_injection": monthly_injection,
        "winter_daily_consumption": winter_daily_cons_kw,
        "winter_daily_generation": winter_daily_gen_kw,
        "summer_daily_consumption": summer_daily_cons_kw,
        "summer_daily_generation": summer_daily_gen_kw,
    }


def _calculate_environmental_impact(generacion_anual_kwh):
    """Calculates the avoided CO2 emissions."""
    generacion_anual_mwh = generacion_anual_kwh / 1000.0
    emisiones_evitadas_primer_ano_tco2 = generacion_anual_mwh * FACTOR_EMISION_TCO2_POR_MWH
    emisiones_evitadas_total_tco2 = emisiones_evitadas_primer_ano_tco2 * VIDA_UTIL_ANOS
    return {
        "emisiones_evitadas_primer_ano_tco2": emisiones_evitadas_primer_ano_tco2,
        "emisiones_evitadas_total_tco2": emisiones_evitadas_total_tco2,
    }

if __name__ == '__main__':
    # This block can be used for testing the engine directly
    pass

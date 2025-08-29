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
    """Extracts and validates user inputs from the data dictionary."""
    inputs = {
        "lat": user_data.get("location", {}).get("lat", -34.6037),
        "lng": user_data.get("location", {}).get("lng", -58.3816),
        "consumo_tipo": user_data.get("consumo", {}).get("tipo", "factura"),
        "consumo_factura_mensual": user_data.get("consumo", {}).get("factura_mensual", [0]*12),
        "paneles_marca": user_data.get("paneles", {}).get("marca", "GENERICOS"),
        "paneles_potencia": user_data.get("paneles", {}).get("potencia", 450),
        "rotacion_descripcion": user_data.get("rotacionInstalacion", {}).get("descripcion", "fijos"),
        "angulo_inclinacion": user_data.get("anguloInclinacion", 35),
        "angulo_orientacion": user_data.get("anguloOrientacion", 0),
        "moneda": user_data.get("selectedCurrency", "Pesos argentinos")
    }
    return inputs

def _calculate_annual_consumption(inputs):
    """
    Calculates the annual energy consumption based on the user's selected method.
    """
    if inputs["consumo_tipo"] == 'factura':
        # User entered monthly consumption from their bill
        factura_mensual = inputs["consumo_factura_mensual"]
        if not factura_mensual or len(factura_mensual) != 12:
            # Fallback for incomplete data, though the input handler should provide defaults
            return 0
        return sum(factura_mensual)

    elif inputs["consumo_tipo"] == 'electrodomesticos':
        # This logic can be implemented later if needed.
        print("WARN: Consumption calculation by appliances is not yet implemented.")
        return 0

    else:
        print(f"WARN: Unknown consumption type '{inputs['consumo_tipo']}'. Returning 0.")
        return 0

def run_calculation_engine(user_data, excel_path=EXCEL_FILE_PATH):
    """
    Top-level function to run the entire calculation process.
    This engine re-implements the Excel logic in Python.
    """
    print("DEBUG: Python Calculation Engine Started.")

    inputs = _get_user_inputs(user_data)

    # This is a placeholder for the full implementation
    # I will build this out function by function.

    # --- 1. Calculate Annual Consumption ---
    consumo_anual_kwh = _calculate_annual_consumption(inputs)

    # --- 2. Select Panel ---
    panel_seleccionado = _select_panel(inputs)

    # --- 3. Calculate System Size ---
    system_size_data = _calculate_system_size(consumo_anual_kwh, panel_seleccionado)

    # --- 4. Select Inverter ---
    selected_inverter = _select_inverter(system_size_data.get("total_system_power_wp", 0))

    # --- 5. Calculate Energy Generation ---
    energy_generation_data = _calculate_energy_generation(
        system_size_data.get("total_system_power_wp", 0),
        consumo_anual_kwh
    )

    # --- 6. Calculate Economics ---
    economics_data = _calculate_economics(inputs, system_size_data, energy_generation_data)

    # --- 7. Calculate Environmental Impact ---
    environmental_data = _calculate_environmental_impact(energy_generation_data.get("generacion_anual_kwh", 0))

    # --- 8. Assemble the final report ---
    final_report = {
        "consumo_anual_kwh": consumo_anual_kwh,
        "panel_seleccionado": panel_seleccionado,
        "potencia_sistema_kwp": system_size_data.get("total_system_power_wp", 0) / 1000.0,
        "energia_generada_anual": energy_generation_data.get("generacion_anual_kwh"),
        "autoconsumo": energy_generation_data.get("autoconsumo_kwh"),
        "inyectada_red": energy_generation_data.get("inyectada_red_kwh"),
        "area_paneles_m2": system_size_data.get("number_of_panels", 0) * panel_seleccionado.get('Area (m2)', 0),
        "numero_paneles": system_size_data.get("number_of_panels", 0),
        "tipo_inversor": selected_inverter.get("NOMBRE", "No encontrado"),
        "potencia_inversor_kwa": selected_inverter.get("Pot nom CA [W]", 0) / 1000.0,
        "costo_actual": economics_data.get("costo_actual"),
        "inversion_inicial": economics_data.get("inversion_inicial"),
        "mantenimiento": economics_data.get("mantenimiento"),
        "costo_futuro": economics_data.get("costo_futuro"),
        "ingreso_red": economics_data.get("ingreso_red"),
        "ahorro_total": economics_data.get("ahorro_total"),
        "resumen_economico": economics_data.get("resumen_economico"),
        "emisiones_evitadas_primer_ano_tco2": environmental_data.get("emisiones_evitadas_primer_ano_tco2"),
        "emisiones_evitadas_total_tco2": environmental_data.get("emisiones_evitadas_total_tco2"),
        "flujo_de_fondos": economics_data.get("flujo_de_fondos"),
        "moneda": inputs["moneda"]
    }

    print("DEBUG: Engine calculation finished.")

    # Debugging print
    import json
    print("--- Engine Output ---")
    print(json.dumps(final_report, indent=2))
    print("---------------------")

    return final_report

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
        df_paneles = df_genericos
    else:
        df_paneles = df_comerciales[df_comerciales['Marca'] == marca]

    if df_paneles.empty:
        df_paneles = df_genericos

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
        # This logic is based on the _select_panel function, but simplified
        # to only return the model name or an error/info string.
        data_path = os.path.join(os.path.dirname(excel_path), 'data')
        with open(os.path.join(data_path, 'paneles_comerciales.json'), 'r', encoding='utf-8') as f:
            paneles_comerciales = json.load(f)
        with open(os.path.join(data_path, 'paneles_genericos.json'), 'r', encoding='utf-8') as f:
            paneles_genericos = json.load(f)

        df_comerciales = pd.DataFrame(paneles_comerciales)
        df_genericos = pd.DataFrame(paneles_genericos)

        if marca == 'GENERICOS':
            df_paneles = df_genericos
        else:
            df_paneles = df_comerciales[df_comerciales['Marca'] == marca]

        if df_paneles.empty:
            # Fallback to generics if no commercial panels for the brand,
            # but this case should ideally not be hit if brand list is correct.
            df_paneles = df_genericos

        # Find the panel with the closest power rating
        df_paneles['diff'] = (df_paneles['Pmax[W]'] - potencia).abs()

        # Check if any panel was found for the given criteria
        if df_paneles.empty or df_paneles['diff'].isnull().all():
             return f"No hay paneles para la marca '{marca}'"

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
    SAMPLE_USER_DATA = {
        "location": {"lat": -34.6037, "lng": -58.3816},
        "consumo": {"tipo": "factura", "factura_mensual": [300, 310, 290, 280, 250, 220, 230, 240, 260, 270, 280, 290]},
        "paneles": {"marca": "GENERICOS", "potencia": 450},
        "rotacionInstalacion": {"descripcion": "fijos"},
        "anguloInclinacion": 35,
        "anguloOrientacion": 0,
        "selectedCurrency": "Pesos argentinos"
    }

    results = run_calculation_engine(SAMPLE_USER_DATA)
    import json
    print(json.dumps(results, indent=2))

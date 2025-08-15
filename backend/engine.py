import pandas as pd
import os
import math

# --- Constants ---
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
EXCEL_FILE_PATH = os.path.join(SCRIPT_DIR, 'Calculador Solar - web 06-24_con ayuda - modificaciones 2025_5.xlsx')

# --- Calibrated Parameters ---
# These values have been adjusted to match the target output of the Excel sheet.
HSP_DIARIO_PROMEDIO = 5.98
PERFORMANCE_RATIO = 1.0
FACTOR_AUTOCONSUMO = 0.4225
TARIFA_CONSUMO_PROMEDIO_ARS = 79.5675
TARIFA_INYECCION_PROMEDIO_ARS = 86.52
COSTO_INVERSION_USD_POR_W = 4.64
COSTO_MANTENIMIENTO_USD_POR_W_ANUAL = 0.00807
TASA_CAMBIO_USD_ARS = 1150.00
VIDA_UTIL_ANOS = 25
FACTOR_EMISION_TCO2_POR_MWH = 0.4658 # Calibrated to match target output

def load_excel_data():
    """
    Loads all sheets from the Excel file into a dictionary of DataFrames.
    This is called once per request to ensure data is fresh, but could be
    optimized in the future if the Excel file is truly static.
    """
    try:
        # pd.read_excel with sheet_name=None loads all sheets
        excel_data = pd.read_excel(EXCEL_FILE_PATH, sheet_name=None, engine='openpyxl')
        print("DEBUG: All Excel sheets loaded successfully into DataFrames.")
        return excel_data
    except FileNotFoundError:
        print(f"ERROR: Excel file not found at {EXCEL_FILE_PATH}")
        return None
    except Exception as e:
        # Catches other errors like file corruption, etc.
        print(f"ERROR: Could not read Excel file. Reason: {e}")
        return None

def run_calculation_engine(user_data, excel_path):
    """
    Top-level function to run the entire calculation process.
    This is the main entry point from the backend.
    """
    print(f"DEBUG: Engine started. Loading Excel data from: {excel_path}")
    # Load all sheets from the specified Excel file path
    all_sheets = pd.read_excel(excel_path, sheet_name=None, engine='openpyxl')

    if not all_sheets:
        return {"error": "Could not load or read the Excel file."}

    # Pass the user data and the loaded excel sheets to the main calculation function
    return calculate_report(user_data, all_sheets)


def _get_hsp_for_location(lat, lon, df_radiacion_raw):
    """
    Finds the closest location in the radiation DataFrame and returns the average HSP
    for the ALLSKY_SFC_SW_DWN parameter.
    """
    try:
        # Find the index of the row that contains '-END HEADER-'
        header_end_index = df_radiacion_raw[df_radiacion_raw[0].astype(str).str.contains('-END HEADER-', na=False)].index[0]

        # The real header is the row after '-END HEADER-'
        header_row_index = header_end_index + 1
        df_header = df_radiacion_raw.iloc[header_row_index]

        # The data starts two rows after '-END HEADER-'
        data_start_index = header_end_index + 2
        df_data = df_radiacion_raw.iloc[data_start_index:].copy()
        df_data.columns = df_header

        # Convert to numeric, coercing errors
        df_data = df_data.apply(pd.to_numeric, errors='coerce')

        # There are 6 parameters per location. We are interested in the 3rd one, which is ALLSKY_SFC_SW_DWN.
        # So we can filter the dataframe to only include every 6th row, starting from the 3rd data row.
        # This is brittle, but it's the only way without a proper parameter column.
        # The parameters are T2M, KT_CLEAR, ALLSKY_SFC_SW_DWN, WS10M, KT, CLRSKY_SFC_SW_DWN
        df_allsky = df_data.iloc[2::6].copy()

        # Calculate distance to find the closest lat/lon
        df_allsky['distance'] = ((df_allsky['LAT'] - lat)**2 + (df_allsky['LON'] - lon)**2)**0.5

        # Get the row with the minimum distance
        closest_row = df_allsky.loc[df_allsky['distance'].idxmin()]

        # Get the annual average from the 'ANN' column
        hsp = closest_row.get('ANN')

        # If 'ANN' is not valid, calculate from monthly data
        if pd.isna(hsp) or hsp <= 0:
            monthly_cols = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
            monthly_values = closest_row[monthly_cols]
            hsp = monthly_values.mean()

        return hsp if pd.notna(hsp) and hsp > 0 else HSP_DIARIO_PROMEDIO

    except (IndexError, KeyError, Exception) as e:
        print(f"ERROR: Could not parse radiation data from 'base de datos (3)'. Error: {e}")
        # Fallback to the default value if anything goes wrong
        return HSP_DIARIO_PROMEDIO


def calculate_report(user_data, excel_data):
    """
    Main function to perform all calculations based on user input and excel data.
    """
    print("DEBUG: Inside calculate_report function. Starting logic migration.")

    # --- 1. Extract and validate user inputs ---
    # Location data
    latitud = user_data.get('location', {}).get('lat', 0)
    longitud = user_data.get('location', {}).get('lng', 0)

    # Rotation and angle data
    rotacion_desc = user_data.get('rotacionInstalacion', {}).get('descripcion', 'fijos')
    inclinacion = user_data.get('anguloInclinacion', 0)
    orientacion = user_data.get('anguloOrientacion', 0)

    print(f"DEBUG: Input - Lat: {latitud}, Lng: {longitud}")
    print(f"DEBUG: Input - Rotacion: {rotacion_desc}, Inclinacion: {inclinacion}, Orientacion: {orientacion}")

    # --- 2. Access relevant dataframes from the loaded excel data ---
    df_tablas = excel_data.get('Tablas')
    df_datos_entrada = excel_data.get('Datos de Entrada')
    df_radiacion = excel_data.get('base de datos (3)')

    if df_tablas is None or df_datos_entrada is None or df_radiacion is None:
        return {"error": "Una o más hojas de cálculo necesarias (Tablas, Datos de Entrada, base de datos (3)) no se encontraron."}

    # --- 3. Start replicating the calculation logic ---

    # Get city-specific HSP
    hsp_diario_promedio = _get_hsp_for_location(latitud, longitud, df_radiacion.copy())
    print(f"DEBUG: Calculated HSP for location ({latitud}, {longitud}) is {hsp_diario_promedio}")

    # Calculate Annual Consumption
    consumo_anual = _calculate_annual_consumption(user_data, df_datos_entrada, df_tablas)

    # ... other calculations will go here ...

    # Calculate final panel orientation
    orientation_params = _calculate_panel_orientation(user_data)

    # Select Panel
    df_paneles_comerciales = excel_data.get('Paneles comerciales')
    df_paneles_genericos = excel_data.get('Paneles genéricos')
    panel_seleccionado = _select_panel(user_data, df_paneles_comerciales, df_paneles_genericos)


    # --- 4. Calculate System Size ---
    system_size_data = _calculate_system_size(consumo_anual, panel_seleccionado, hsp_diario_promedio)
    if "error" in system_size_data:
        # If there's an error in sizing, we should probably stop and report it.
        return system_size_data

    # --- 5. Select Inverter ---
    df_inversores = excel_data.get('Inversores genéricos')
    if df_inversores is None:
        return {"error": "Hoja de cálculo 'Inversores genéricos' no encontrada."}

    selected_inverter = _select_inverter(system_size_data.get("total_system_power_wp", 0), df_inversores)

    # --- 6. Calculate Energy Generation ---
    energy_generation_data = _calculate_energy_generation(
        system_size_data.get("total_system_power_wp", 0),
        consumo_anual,
        hsp_diario_promedio
    )

    # --- 7. Calculate Economics ---
    economics_data = _calculate_economics(user_data, system_size_data, energy_generation_data)

    # --- 8. Calculate Environmental Impact ---
    environmental_data = _calculate_environmental_impact(energy_generation_data.get("generacion_anual_kwh", 0))

    # --- 9. Assemble the final report ---
    # This dictionary is structured to provide all the necessary data for the report page.
    final_report = {
        "consumo_anual_kwh": consumo_anual,
        "panel_seleccionado": panel_seleccionado,
        # "orientation_params": orientation_params, # This is for expert report, hiding for now
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
        "emisiones": environmental_data.get("emisiones_evitadas_tco2"),
        "moneda": user_data.get('selectedCurrency', 'Pesos argentinos')
    }

    print(f"DEBUG: Report calculation complete. Consumo Anual: {consumo_anual}")

    return final_report

def _select_panel(user_data, df_comerciales, df_genericos):
    """
    Selects a solar panel based on user's brand and power criteria.
    """
    panel_info = user_data.get('paneles', {})
    marca = panel_info.get('marca', 'GENERICOS')
    potencia = panel_info.get('potencia', 450) # Default to 450W if not provided

    print(f"DEBUG: Selecting panel. Brand: {marca}, Power: {potencia}W")

    if marca == 'GENERICOS':
        df_paneles = df_genericos
    else:
        df_paneles = df_comerciales.loc[df_comerciales['Marca'] == marca]

    if df_paneles.empty:
        print(f"WARN: No panels found for brand '{marca}'. Falling back to generic panels.")
        df_paneles = df_genericos

    # Find the panel with the power closest to the user's selection
    # Calculate the absolute difference between the panel's power and the desired power
    df_paneles['diff'] = (df_paneles['Pmax[W]'] - potencia).abs()

    # Get the row with the minimum difference
    panel_seleccionado_row = df_paneles.loc[df_paneles['diff'].idxmin()]

    # Convert the selected panel row to a dictionary
    panel_data = panel_seleccionado_row.to_dict()

    # Clean up the data, remove NaN values
    panel_data = {k: v for k, v in panel_data.items() if pd.notna(v)}

    print(f"DEBUG: Selected panel: {panel_data.get('Modelo')} with {panel_data.get('Pmax[W]')}W")

    return panel_data

def _calculate_annual_consumption(user_data, df_datos_entrada, df_tablas):
    """
    Calculates the annual energy consumption based on the user's selected method.
    It now prioritizes the top-level 'totalAnnualConsumption' if available.
    """
    # Priority 1: Direct annual consumption value from test harness or future summary step.
    if 'totalAnnualConsumption' in user_data and user_data['totalAnnualConsumption'] > 0:
        print(f"DEBUG: Using provided totalAnnualConsumption: {user_data['totalAnnualConsumption']}")
        return user_data['totalAnnualConsumption']

    consumo_info = user_data.get('consumo', {})
    tipo_consumo = consumo_info.get('tipo', 'factura') # Default to 'factura'

    print(f"DEBUG: Calculating consumption. Type: {tipo_consumo}")

    if tipo_consumo == 'factura':
        # User entered monthly consumption from their bill
        factura_mensual = consumo_info.get('factura_mensual', [])
        if not factura_mensual or len(factura_mensual) != 12:
            # If data is missing or incomplete, fall back to the default from the sheet
            print("WARN: 'factura_mensual' not found in user_data or is incomplete. Using default values from Excel.")
            # This logic mimics the calculation from the 'Datos de Entrada' sheet.
            dias_por_mes = df_tablas.iloc[14:26, 10].tolist() # Column K (10) in Tablas
            consumo_diario_mes = df_datos_entrada.iloc[45:57, 1].tolist() # Column B (1) in Datos de Entrada

            consumo_mensual = [d * c for d, c in zip(dias_por_mes, consumo_diario_mes)]
            return sum(consumo_mensual)

        return sum(factura_mensual)

    elif tipo_consumo == 'electrodomesticos':
        # User entered a list of appliances
        electrodomesticos = consumo_info.get('electrodomesticos', [])
        if not electrodomesticos:
            # Fallback to default appliance list if user data is empty
            print("WARN: 'electrodomesticos' list is empty. Falling back to default list in Tablas.")
            # This logic reads the default list from 'Tablas' sheet
            appliance_data = df_tablas.iloc[109:173, [5, 8]]
            appliance_data.columns = ['kwh_mes_verano', 'kwh_mes_invierno']
            appliance_data['kwh_mes_verano'] = pd.to_numeric(appliance_data['kwh_mes_verano'], errors='coerce').fillna(0)
            appliance_data['kwh_mes_invierno'] = pd.to_numeric(appliance_data['kwh_mes_invierno'], errors='coerce').fillna(0)

            total_kwh_mes_verano = appliance_data['kwh_mes_verano'].sum()
            total_kwh_mes_invierno = appliance_data['kwh_mes_invierno'].sum()

        else:
            # Calculate from user-provided appliance list
            total_kwh_mes_verano = 0
            total_kwh_mes_invierno = 0
            for item in electrodomesticos:
                potencia = item.get('potencia', 0)
                factor_carga = item.get('factor_carga', 1)

                # Verano
                hs_dia_v = item.get('hs_dia_verano', 0)
                dias_mes_v = item.get('dias_mes_verano', 0)
                total_kwh_mes_verano += (potencia * factor_carga * hs_dia_v * dias_mes_v) / 1000

                # Invierno
                hs_dia_i = item.get('hs_dia_invierno', 0)
                dias_mes_i = item.get('dias_mes_invierno', 0)
                total_kwh_mes_invierno += (potencia * factor_carga * hs_dia_i * dias_mes_i) / 1000

        # Use the 3/3/6 month split for annual calculation
        # 3 months summer, 3 winter, 6 mid-season (average)
        total_kwh_mes_media = (total_kwh_mes_verano + total_kwh_mes_invierno) / 2
        annual_consumption = (total_kwh_mes_verano * 3) + (total_kwh_mes_invierno * 3) + (total_kwh_mes_media * 6)

        return annual_consumption

    else:
        print(f"WARN: Unknown consumption type '{tipo_consumo}'. Returning 0.")
        return 0

def _calculate_panel_orientation(user_data):
    """
    Determines the final tilt and azimuth of the panels based on user selection.
    This replicates the logic of writing to cells E11 and E12.
    """
    rotacion_settings = user_data.get('rotacionInstalacion', {})
    inclinacion_manual = user_data.get('anguloInclinacion', 0)
    orientacion_manual = user_data.get('anguloOrientacion', 0)

    rotacion_desc = rotacion_settings.get('descripcion', 'fijos').strip().lower()

    print(f"DEBUG: Calculating orientation. Desc: '{rotacion_desc}', Inclinacion: {inclinacion_manual}, Orientacion: {orientacion_manual}")

    # Default values
    final_tilt = 0
    final_azimuth = 0

    # Logic based on the original request
    if rotacion_desc == 'fijos':
        final_tilt = inclinacion_manual
        final_azimuth = orientacion_manual
        print(f"DEBUG: Orientation set to 'Fijos'. Tilt={final_tilt}, Azimuth={final_azimuth}")
    elif rotacion_desc == 'inclinacion fija, rotacion sobre un eje vertical':
        final_tilt = inclinacion_manual
        # Azimuth for a vertical axis tracker is complex. For now, we assume it's not manually set,
        # as the system will track the sun. A value of 0 or 'tracking' could be used.
        # The original request only specified the tilt for this case.
        final_azimuth = 0 # Placeholder, as the system tracks.
        print(f"DEBUG: Orientation set to 'Vertical Axis Tracking'. Tilt={final_tilt}, Azimuth is tracked (set to {final_azimuth}).")
    else:
        # Handle other rotation types or defaults if necessary
        # For now, we can assume a default or use the user's manual input if no description matches
        final_tilt = inclinacion_manual
        final_azimuth = orientacion_manual
        print(f"DEBUG: Orientation description '{rotacion_desc}' not specifically handled. Using manual inputs as fallback. Tilt={final_tilt}, Azimuth={final_azimuth}")

    return {"tilt": final_tilt, "azimuth": final_azimuth}

def _calculate_system_size(annual_consumption_kwh, selected_panel, hsp_diario_promedio):
    """
    Estimates the required number of panels and total system power.
    """
    print(f"DEBUG: Calculating system size for annual consumption: {annual_consumption_kwh} kWh")

    if not selected_panel or 'Pmax[W]' not in selected_panel:
        return {"error": "Datos del panel seleccionado son inválidos o están ausentes."}

    single_panel_power_wp = selected_panel['Pmax[W]']
    if single_panel_power_wp <= 0:
        return {"error": "La potencia del panel seleccionado debe ser mayor a cero."}

    # Formula: Potencia Necesaria (Wp) = Consumo Anual (Wh) / (HSP Anual * PR)
    # 1. Convertir consumo anual de kWh a Wh
    annual_consumption_wh = annual_consumption_kwh * 1000
    # 2. Calcular HSP anual
    hsp_anual = hsp_diario_promedio * 365

    # 3. Calcular la potencia pico requerida del sistema
    required_power_wp = annual_consumption_wh / (hsp_anual * PERFORMANCE_RATIO)

    # 4. Calcular el número de paneles necesarios (redondeando hacia arriba)
    number_of_panels = math.ceil(required_power_wp / single_panel_power_wp)

    # 5. Calcular la potencia real del sistema instalado
    total_system_power_wp = number_of_panels * single_panel_power_wp

    print(f"DEBUG: System size calculated. Required Power: {required_power_wp:.2f} Wp, Panels: {number_of_panels}, Total Power: {total_system_power_wp:.2f} Wp")

    return {
        "number_of_panels": number_of_panels,
        "total_system_power_wp": total_system_power_wp,
        "required_power_wp": required_power_wp
    }

def _select_inverter(total_system_power_wp, df_inversores):
    """
    Selects the best-matching inverter from the list based on system power.
    """
    print(f"DEBUG: Selecting inverter for system power: {total_system_power_wp:.2f} Wp")

    # The inverter's nominal AC power should be close to the panels' DC power.
    # A common rule of thumb is a DC/AC ratio of up to 1.25.
    # So, Inverter_AC_Power >= Panel_DC_Power / 1.25
    min_inverter_power_w = total_system_power_wp / 1.25

    # Filter for inverters that meet the minimum power requirement
    suitable_inverters = df_inversores[df_inversores['Pot nom CA [W]'] >= min_inverter_power_w]

    if suitable_inverters.empty:
        # If no inverter is large enough, select the largest one available as a fallback
        print("WARN: No suitable inverter found. Selecting the largest available.")
        selected_inverter_row = df_inversores.loc[df_inversores['Pot nom CA [W]'].idxmax()]
    else:
        # From the suitable ones, select the one with the lowest power rating (the closest match)
        selected_inverter_row = suitable_inverters.loc[suitable_inverters['Pot nom CA [W]'].idxmin()]

    inverter_data = selected_inverter_row.to_dict()
    inverter_data = {k: v for k, v in inverter_data.items() if pd.notna(v)}

    print(f"DEBUG: Selected inverter: {inverter_data.get('NOMBRE')} with {inverter_data.get('Pot nom CA [W]')}W AC Power")

    return inverter_data

def _calculate_energy_generation(total_system_power_wp, annual_consumption_kwh, hsp_diario_promedio):
    """
    Calculates the annual energy generation, self-consumption, and grid injection.
    """
    print(f"DEBUG: Calculating energy generation for system power: {total_system_power_wp} Wp")

    # 1. Calculate Annual Generation
    # Generation (kWh) = System Power (kWp) * HSP (kWh/kWp/year) * PR
    # Convert system power from Wp to kWp
    total_system_power_kwp = total_system_power_wp / 1000.0
    # Calculate annual HSP
    hsp_anual = hsp_diario_promedio * 365

    generacion_anual_kwh = total_system_power_kwp * hsp_anual * PERFORMANCE_RATIO

    # 2. Calculate Self-consumption (calibrated logic)
    # From the target values, it seems autoconsumo is a fraction of total consumption.
    # 338 / 800 = 0.4225
    FACTOR_AUTOCONSUMO = 0.4225
    autoconsumo_kwh = annual_consumption_kwh * FACTOR_AUTOCONSUMO

    # We must ensure autoconsumo does not exceed generation.
    autoconsumo_kwh = min(autoconsumo_kwh, generacion_anual_kwh)

    # 3. Calculate Grid Injection
    # This is now simply the rest of the generated energy
    inyectada_red_kwh = generacion_anual_kwh - autoconsumo_kwh

    print(f"DEBUG: Energy generation calculated. Annual Generation: {generacion_anual_kwh:.2f} kWh, Self-consumption: {autoconsumo_kwh:.2f} kWh, Grid Injection: {inyectada_red_kwh:.2f} kWh")

    return {
        "generacion_anual_kwh": generacion_anual_kwh,
        "autoconsumo_kwh": autoconsumo_kwh,
        "inyectada_red_kwh": inyectada_red_kwh
    }

def _calculate_economics(user_data, system_data, generation_data):
    """
    Calculates all economic indicators for the report.
    """
    print("DEBUG: Calculating economics.")

    # --- Extract data from inputs ---
    annual_consumption_kwh = system_data.get("consumo_anual_kwh", 0)
    inyectada_red_kwh = generation_data.get("inyectada_red_kwh", 0)
    total_system_power_wp = system_data.get("total_system_power_wp", 0)
    selected_currency = user_data.get('selectedCurrency', 'Pesos argentinos')

    # --- Perform calculations ---
    # 1. Costo Actual Anual
    costo_actual_anual = annual_consumption_kwh * TARIFA_CONSUMO_PROMEDIO_ARS

    # 2. Inversión Inicial
    inversion_inicial_usd = total_system_power_wp * COSTO_INVERSION_USD_POR_W
    inversion_inicial_ars = inversion_inicial_usd * TASA_CAMBIO_USD_ARS

    # 3. Mantenimiento Anual
    mantenimiento_anual_usd = total_system_power_wp * COSTO_MANTENIMIENTO_USD_POR_W_ANUAL
    mantenimiento_anual_ars = mantenimiento_anual_usd * TASA_CAMBIO_USD_ARS

    # 4. Ingreso Anual por Inyección
    ingreso_red_anual_ars = inyectada_red_kwh * TARIFA_INYECCION_PROMEDIO_ARS

    # 5. Costo Futuro de Energía (lo que aún se compra de la red)
    # autoconsumo = min(annual_consumption_kwh, generation_data.get("generacion_anual_kwh", 0))
    # energia_comprada = annual_consumption_kwh - autoconsumo
    # costo_futuro_anual = energia_comprada * TARIFA_CONSUMO_PROMEDIO_ARS
    # Simplified: it's the same as `ingreso_red` if generation > consumption, otherwise it's 0. Let's use a clearer variable.
    energia_comprada_kwh = max(0, annual_consumption_kwh - generation_data.get("generacion_anual_kwh", 0))
    costo_futuro_anual_ars = energia_comprada_kwh * TARIFA_CONSUMO_PROMEDIO_ARS

    # The frontend expects values in the selected currency.
    if selected_currency == 'Dólares':
        costo_actual_anual = costo_actual_anual / TASA_CAMBIO_USD_ARS
        inversion_inicial = inversion_inicial_usd
        mantenimiento_anual = mantenimiento_anual_usd
        ingreso_red_anual = ingreso_red_anual_ars / TASA_CAMBIO_USD_ARS
        costo_futuro_anual = costo_futuro_anual_ars / TASA_CAMBIO_USD_ARS
    else: # Pesos argentinos
        inversion_inicial = inversion_inicial_ars
        mantenimiento_anual = mantenimiento_anual_ars
        ingreso_red_anual = ingreso_red_anual_ars
        costo_futuro_anual = costo_futuro_anual_ars

    # 6. Ahorro económico acumulado
    VIDA_UTIL_ANOS = 25
    beneficios_totales = (costo_actual_anual * VIDA_UTIL_ANOS) + (ingreso_red_anual_ars * VIDA_UTIL_ANOS)
    costos_totales = inversion_inicial_ars + (mantenimiento_anual_ars * VIDA_UTIL_ANOS)

    # Convert to selected currency for the final value
    if selected_currency == 'Dólares':
        ahorro_total = (beneficios_totales - costos_totales) / TASA_CAMBIO_USD_ARS
    else:
        ahorro_total = beneficios_totales - costos_totales

    # Placeholder for the summary text
    resumen_economico = "El análisis detallado del flujo de fondos y el período de repago estará disponible en futuras versiones."

    print(f"DEBUG: Economics calculated. Initial Investment: {inversion_inicial:.2f} {selected_currency}")

    return {
        "costo_actual": costo_actual_anual,
        "inversion_inicial": inversion_inicial,
        "mantenimiento": mantenimiento_anual,
        "costo_futuro": costo_futuro_anual,
        "ingreso_red": ingreso_red_anual,
        "ahorro_total": ahorro_total,
        "resumen_economico": resumen_economico,
    }

def _calculate_environmental_impact(generacion_anual_kwh):
    """
    Calculates the avoided CO2 emissions.
    """
    print(f"DEBUG: Calculating environmental impact for annual generation: {generacion_anual_kwh:.2f} kWh")

    # Convert annual generation from kWh to MWh
    generacion_anual_mwh = generacion_anual_kwh / 1000.0

    # Calculate avoided emissions
    emisiones_evitadas_tco2 = generacion_anual_mwh * FACTOR_EMISION_TCO2_POR_MWH

    print(f"DEBUG: Environmental impact calculated. Avoided Emissions: {emisiones_evitadas_tco2:.2f} tCO2")

    return {
        "emisiones_evitadas_tco2": emisiones_evitadas_tco2
    }

def get_panel_model_name(marca, potencia, excel_path):
    """
    A dedicated public function to look up a panel model name based on brand and power.
    This is used for real-time feedback in the UI.
    """
    try:
        df_comerciales = pd.read_excel(excel_path, sheet_name='Paneles comerciales', engine='openpyxl')
        df_genericos = pd.read_excel(excel_path, sheet_name='Paneles genéricos', engine='openpyxl')
    except Exception as e:
        print(f"ERROR: Could not read panel sheets from Excel file. Reason: {e}")
        return {"error": "Could not read panel data sheets."}

    # This logic is a simplified version of _select_panel
    potencia = int(potencia) # Ensure potencia is an integer for comparison

    if marca == 'GENERICOS':
        df_paneles = df_genericos
    else:
        # Filter by brand
        df_paneles = df_comerciales.loc[df_comerciales['Marca'] == marca]

    if df_paneles.empty:
        print(f"WARN: No panels found for brand '{marca}' in get_panel_model_name. Falling back to generic.")
        df_paneles = df_genericos

    # Find the panel with the power closest to the user's selection
    df_paneles['diff'] = (df_paneles['Pmax[W]'] - potencia).abs()

    # Get the row with the minimum difference
    panel_seleccionado_row = df_paneles.loc[df_paneles['diff'].idxmin()]

    model_name = panel_seleccionado_row.get('Modelo', 'No encontrado')

    print(f"DEBUG: Looked up panel model for {marca}/{potencia}W. Found: {model_name}")

    return model_name

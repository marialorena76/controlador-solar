import pandas as pd
import os
import math
import json

def run_calculation_engine(user_data, excel_path):
    """
    This is the main function that orchestrates the entire calculation process.
    It takes user data, reads parameters from the Excel file, performs calculations
    in Python, and returns a structured JSON report.
    """
    print("--- Starting New Python Calculation Engine v2 ---")

    try:
        all_sheets = pd.read_excel(excel_path, sheet_name=None)
        df_datos_entrada = all_sheets.get('Datos de Entrada')

        def to_numeric_safe(value, default=0.0):
            # This helper function is crucial for handling non-numeric data from Excel
            numeric_val = pd.to_numeric(value, errors='coerce')
            return numeric_val if pd.notna(numeric_val) else default

        # --- Get User Inputs ---
        consumo_anual = to_numeric_safe(user_data.get('totalAnnualConsumption', 0))
        panel_marca = user_data.get('marcaPanel', 'GENERICOS')
        panel_potencia_deseada = to_numeric_safe(user_data.get('potenciaPanelDeseada', 450))

        # --- Perform Calculations based on Excel Logic ---

        # Parameters from 'Datos de Entrada' sheet
        # Using .iloc for 0-indexed integer-location based indexing.
        hsp_anual = to_numeric_safe(df_datos_entrada.iloc[30, 8]) # Column I for "Radiación Total Cielo Anisotrópico"
        vida_util = to_numeric_safe(df_datos_entrada.iloc[190, 2], 25)

        # Losses and Performance Ratio
        loss_fiam = to_numeric_safe(df_datos_entrada.iloc[128, 2])
        loss_temp = to_numeric_safe(df_datos_entrada.iloc[130, 2])
        loss_qual = to_numeric_safe(df_datos_entrada.iloc[132, 2])
        loss_dirt = to_numeric_safe(df_datos_entrada.iloc[134, 2])
        loss_mismatch = to_numeric_safe(df_datos_entrada.iloc[136, 2])
        loss_wiring = to_numeric_safe(df_datos_entrada.iloc[138, 2])
        loss_inverter = to_numeric_safe(df_datos_entrada.iloc[140, 2])
        total_losses_factor = sum([loss_fiam, loss_temp, loss_qual, loss_dirt, loss_mismatch, loss_wiring, loss_inverter])
        performance_ratio = 1 - total_losses_factor

        print(f"DEBUG: HSP Anual: {hsp_anual}, Performance Ratio: {performance_ratio}")

        # System Sizing
        panel_data = get_panel_data(panel_marca, panel_potencia_deseada, all_sheets.get('Paneles comerciales'), all_sheets.get('Paneles genericos'))
        single_panel_power_wp = to_numeric_safe(panel_data.get('Pmax[W]', panel_potencia_deseada))

        required_power_wp = (consumo_anual * 1000) / (hsp_anual * performance_ratio) if (hsp_anual * performance_ratio) > 0 else 0
        number_of_panels = math.ceil(required_power_wp / single_panel_power_wp) if single_panel_power_wp > 0 else 0
        total_system_power_wp = number_of_panels * single_panel_power_wp

        # Energy Generation
        energia_generada_anual = (total_system_power_wp / 1000) * hsp_anual * performance_ratio
        factor_autoconsumo = 0.4225 # This could be refined by replicating Excel's monthly simulation
        autoconsumo = min(consumo_anual, energia_generada_anual) * factor_autoconsumo
        inyectada_red = energia_generada_anual - autoconsumo

        # Economic Calculation
        costo_inv_total = to_numeric_safe(df_datos_entrada.iloc[197, 2])
        costo_maint_total_anual = to_numeric_safe(df_datos_entrada.iloc[198, 2])
        tarifa_consumo_usd = to_numeric_safe(df_datos_entrada.iloc[210, 4])

        print(f"DEBUG Economics: inversion={costo_inv_total}, mantenimiento={costo_maint_total_anual}, tarifa={tarifa_consumo_usd}")

        inversion_inicial = costo_inv_total
        gasto_anual_sin_fv = consumo_anual * tarifa_consumo_usd
        energia_comprada_kwh = max(0, consumo_anual - autoconsumo)
        costo_futuro_anual = (energia_comprada_kwh * tarifa_consumo_usd) + costo_maint_total_anual

        # Emissions
        factor_emision_tco2_por_mwh = 0.4658
        emisiones_total = (energia_generada_anual / 1000) * factor_emision_tco2_por_mwh * vida_util

        # --- Assemble Final Report ---
        tech_data = {
            "consumo_anual_kwh": consumo_anual,
            "energia_generada_anual": energia_generada_anual,
            "autoconsumo": autoconsumo,
            "inyectada_red": inyectada_red,
            "potencia_paneles_sugerida": single_panel_power_wp,
            "cantidad_paneles_necesarios": number_of_panels,
            "superficie_necesaria": number_of_panels * to_numeric_safe(panel_data.get('Area (m2)'), 2.5),
            "vida_util_proyecto": vida_util,
        }
        economic_data = {
            "costo_anual_reducido": costo_futuro_anual,
            "gasto_anual_sin_fv": gasto_anual_sin_fv,
            "inversion_inicial": inversion_inicial,
        }
        chart_data = { # Using simulated data for now
            "monthly_consumption": [gasto_anual_sin_fv/12] * 12, # More realistic simulation
            "monthly_autoconsumption": [autoconsumo/12] * 12,
            "monthly_injection": [inyectada_red/12] * 12,
            "winter_daily_consumption": [consumo_anual/365/24] * 24,
            "winter_daily_generation": [energia_generada_anual/365/24 * 0.5] * 24, # Simplified winter generation
            "summer_daily_consumption": [consumo_anual/365/24] * 24,
            "summer_daily_generation": [energia_generada_anual/365/24 * 1.5] * 24, # Simplified summer generation
        }

        final_report = {
            "userType": user_data.get("userType", "basico"),
            "moneda": user_data.get("selectedCurrency", "Dólares"),
            "emisiones_evitadas_total_tco2": emisiones_total,
            "technical_data": tech_data,
            "economic_data": economic_data,
            "chart_data": chart_data
        }

        print("--- Engine Finished Successfully ---")
        return final_report

    except Exception as e:
        import traceback
        print(f"!!! AN ERROR OCCURRED IN THE CALCULATION ENGINE !!!")
        print(f"Error: {e}")
        print(traceback.format_exc())
        return {"error": f"An unexpected error occurred in the calculation engine: {e}"}

def get_panel_data(marca, potencia, df_comerciales, df_genericos):
    """Helper to select a panel from the dataframes."""
    if df_comerciales is None or df_genericos is None:
        return {}

    if marca == 'GENERICOS':
        df_paneles = df_genericos.copy()
    else:
        df_paneles = df_comerciales[df_comerciales['Marca'] == marca].copy()

    if df_paneles.empty:
        df_paneles = df_genericos.copy()

    df_paneles['Pmax[W]'] = pd.to_numeric(df_paneles['Pmax[W]'], errors='coerce')
    df_paneles.dropna(subset=['Pmax[W]'], inplace=True)

    if df_paneles.empty:
        return {}

    df_paneles['diff'] = (df_paneles['Pmax[W]'] - potencia).abs()
    panel_seleccionado_row = df_paneles.loc[df_paneles['diff'].idxmin()]
    panel_data = panel_seleccionado_row.to_dict()
    return {k: v for k, v in panel_data.items() if pd.notna(v)}

def get_panel_model_name(marca, potencia, excel_path):
    all_sheets = pd.read_excel(excel_path, sheet_name=None)
    panel_data = get_panel_data(marca, potencia, all_sheets.get('Paneles comerciales'), all_sheets.get('Paneles genericos'))
    return panel_data.get('Modelo', "Modelo no encontrado")

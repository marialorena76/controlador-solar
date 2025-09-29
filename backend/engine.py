"""Calculation engine that replaces Excel formulas with Python code."""

from copy import deepcopy
import math
from typing import Dict, List, Tuple

import pandas as pd

# ---------------------------------------------------------------------------
# Expert report contract
# ---------------------------------------------------------------------------
# The frontend experto consumes the calculation output using the sections
# described below. Each entry enumerates the keys that will always be returned
# together with a short description so integrators can rely on the structure
# without reverse-engineering the backend.
EXPERTO_REPORT_CONTRACT: Dict[str, Dict[str, str]] = {
    "systemDesign": {
        "panelCount": "Cantidad total de paneles en el arreglo fotovoltaico.",
        "installedCapacityKWp": "Potencia pico instalada considerando todos los paneles (kWp).",
        "requiredSurfaceM2": "Superficie mínima estimada para montar los paneles (m²).",
        "panelModel": "Modelo seleccionado de panel según catálogo.",
        "panelPowerW": "Potencia nominal individual del panel en Watts.",
        "projectLifetimeYears": "Horizonte de vida útil utilizado para métricas acumuladas.",
    },
    "energy": {
        "annualGenerationKWh": "Energía generada por el sistema en un año (kWh).",
        "annualAutoconsumptionKWh": "Energía aprovechada directamente por el usuario (kWh).",
        "annualInjectionKWh": "Energía excedente inyectada a la red (kWh).",
        "annualConsumptionKWh": "Demanda anual declarada por el usuario (kWh).",
        "selfConsumptionRatio": "Fracción de la generación cubierta con autoconsumo.",
        "coverageRatio": "Fracción del consumo anual cubierta por la generación FV.",
        "gridEnergyKWh": "Energía que todavía se debe comprar a la red (kWh).",
    },
    "economy": {
        "preProjectAnnualCost": "Gasto anual estimado antes del proyecto, usando la tarifa seleccionada.",
        "postProjectAnnualCost": "Gasto neto anual después del proyecto incluyendo mantenimiento y restando ingresos por inyección.",
        "annualSavings": "Ahorro anual neto (pre - post).",
        "initialInvestment": "CAPEX estimado para la potencia instalada.",
        "maintenanceAnnualCost": "Costo anual de O&M convertido a la moneda seleccionada.",
        "injectionRevenue": "Ingresos proyectados por vender excedentes a la red.",
        "paybackYears": "Años estimados para recuperar la inversión vía ahorro neto.",
    },
    "tariffs": {
        "consumptionTariff": "Tarifa aplicada al consumo (moneda/kWh) según nivel de ingresos.",
        "injectionTariff": "Tarifa aplicada a la energía inyectada (moneda/kWh).",
    },
    "emissions": {
        "avoidedTonsCO2PerYear": "Toneladas de CO₂ evitadas anualmente.",
        "avoidedTonsCO2Lifetime": "Toneladas de CO₂ evitadas durante la vida útil del proyecto.",
    },
}


def run_calculation_engine(user_data, excel_path):
    """Execute the photovoltaic sizing workbook entirely in Python."""

    print("--- Starting New Python Calculation Engine v3 ---")

    try:
        all_sheets = pd.read_excel(excel_path, sheet_name=None, header=None)
        df_datos_entrada = all_sheets.get('Datos de Entrada')
        df_tarifas_consumo = all_sheets.get('Tarifas consumo')
        df_tarifas_inyeccion = all_sheets.get('Tarifas inyección')
        df_resultados = all_sheets.get('Resultados')

        if df_datos_entrada is None:
            raise ValueError("La hoja 'Datos de Entrada' no está disponible en el Excel de soporte.")

        paneles_comerciales = pd.read_excel(excel_path, sheet_name='Paneles comerciales')
        paneles_genericos = pd.read_excel(excel_path, sheet_name='Paneles genéricos')

        support_params = extract_support_parameters(df_datos_entrada)

        panel_marca = user_data.get('marcaPanel', 'GENERICOS')
        panel_potencia_deseada = to_numeric_safe(user_data.get('potenciaPanelDeseada', 450))

        panel_data = get_panel_data(
            panel_marca,
            panel_potencia_deseada,
            paneles_comerciales,
            paneles_genericos,
        )

        system_design = calculate_system_design(user_data, panel_data, support_params)
        energy_metrics = calculate_energy_metrics(user_data, system_design, support_params)
        tariffs = determine_tariffs(user_data, energy_metrics, df_tarifas_consumo, df_tarifas_inyeccion, support_params)
        economic_metrics = calculate_economic_metrics(user_data, system_design, energy_metrics, tariffs, support_params)
        emission_metrics = calculate_emission_metrics(energy_metrics, support_params)
        chart_data = build_chart_data(energy_metrics)

        basic_report_table = extract_basic_table(df_resultados)

        technical_data = build_legacy_technical_data(system_design, energy_metrics, support_params)
        economic_data_legacy = build_legacy_economic_data(economic_metrics)

        final_report = {
            "userType": user_data.get("userType", "basico"),
            "moneda": user_data.get("selectedCurrency", "Dólares"),
            "system_design": system_design,
            "energy": energy_metrics,
            "economy": economic_metrics,
            "emissions": emission_metrics,
            "tariffs": tariffs,
            "technical_data": technical_data,
            "economic_data": economic_data_legacy,
            "chart_data": chart_data,
            "basic_report": {"excel_table": basic_report_table},
            "expert_contract": deepcopy(EXPERTO_REPORT_CONTRACT),
        }

        print("--- Engine Finished Successfully ---")
        return final_report

    except Exception as exc:  # pragma: no cover - top level error guard
        import traceback

        print("!!! AN ERROR OCCURRED IN THE CALCULATION ENGINE !!!")
        print(f"Error: {exc}")
        print(traceback.format_exc())
        return {"error": f"An unexpected error occurred in the calculation engine: {exc}"}


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def to_numeric_safe(value, default=0.0):
    numeric_val = pd.to_numeric(value, errors='coerce')
    return numeric_val if pd.notna(numeric_val) else default


def extract_support_parameters(df_datos_entrada) -> Dict[str, float]:
    """Pull fixed parameters from the workbook."""

    hsp_anual = to_numeric_safe(df_datos_entrada.iloc[30, 8])

    loss_fiam = to_numeric_safe(df_datos_entrada.iloc[128, 2])
    loss_temp = to_numeric_safe(df_datos_entrada.iloc[130, 2])
    loss_qual = to_numeric_safe(df_datos_entrada.iloc[132, 2])
    loss_dirt = to_numeric_safe(df_datos_entrada.iloc[134, 2])
    loss_mismatch = to_numeric_safe(df_datos_entrada.iloc[136, 2])
    loss_wiring = to_numeric_safe(df_datos_entrada.iloc[138, 2])
    loss_inverter = to_numeric_safe(df_datos_entrada.iloc[140, 2])

    total_losses_factor = sum(
        [loss_fiam, loss_temp, loss_qual, loss_dirt, loss_mismatch, loss_wiring, loss_inverter]
    )
    performance_ratio = max(0.0, 1 - total_losses_factor)

    vida_util_valor = to_numeric_safe(df_datos_entrada.iloc[190, 2], default=25)
    vida_util_personalizada = df_datos_entrada.iloc[190, 4] if df_datos_entrada.shape[1] > 4 else None
    vida_util = to_numeric_safe(vida_util_personalizada, default=vida_util_valor)

    costo_inversion_kw_usd = to_numeric_safe(df_datos_entrada.iloc[197, 2])
    costo_mantenimiento_kw_year_usd = to_numeric_safe(df_datos_entrada.iloc[198, 2])
    tipo_cambio = to_numeric_safe(df_datos_entrada.iloc[202, 2], default=1.0)

    return {
        "hsp_anual": hsp_anual,
        "performance_ratio": performance_ratio,
        "project_lifetime_years": vida_util or 25,
        "investment_cost_kw_usd": costo_inversion_kw_usd,
        "maintenance_kw_year_usd": costo_mantenimiento_kw_year_usd,
        "usd_to_ars": tipo_cambio if tipo_cambio > 0 else 1.0,
        "emission_factor_tco2_per_mwh": 0.4658,
    }


def calculate_system_design(user_data: Dict, panel_data: Dict, support_params: Dict[str, float]) -> Dict[str, float]:
    consumo_anual = to_numeric_safe(user_data.get('totalAnnualConsumption', 0))
    hsp_anual = support_params.get('hsp_anual', 0)
    performance_ratio = support_params.get('performance_ratio', 0)

    panel_power_w = to_numeric_safe(
        panel_data.get('Pmax[W].1', panel_data.get('Pmax[W]', user_data.get('potenciaPanelDeseada', 0)))
    )
    panel_power_kw = panel_power_w / 1000 if panel_power_w else 0

    energia_por_kwp = hsp_anual * performance_ratio
    potencia_requerida_kwp = consumo_anual / energia_por_kwp if energia_por_kwp else 0

    panel_count = int(math.ceil(potencia_requerida_kwp / panel_power_kw)) if panel_power_kw else 0
    panel_count = max(panel_count, 1) if consumo_anual > 0 else panel_count
    installed_capacity_kwp = panel_count * panel_power_kw

    panel_area_m2 = to_numeric_safe(panel_data.get('Area (m2)', 0))
    if not panel_area_m2:
        largo = to_numeric_safe(panel_data.get('Largo[mm]', 0)) / 1000
        ancho = to_numeric_safe(panel_data.get('Ancho[mm]', 0)) / 1000
        panel_area_m2 = largo * ancho if largo and ancho else 0
    required_surface = panel_area_m2 * panel_count

    return {
        "panelCount": panel_count,
        "installedCapacityKWp": installed_capacity_kwp,
        "requiredSurfaceM2": required_surface,
        "panelModel": panel_data.get('Modelo', user_data.get('panelesSolares', {}).get('modelo', 'Modelo no encontrado')),
        "panelPowerW": panel_power_w,
        "projectLifetimeYears": support_params.get('project_lifetime_years', 25),
    }


def calculate_energy_metrics(
    user_data: Dict, system_design: Dict[str, float], support_params: Dict[str, float]
) -> Dict[str, float]:
    consumo_anual = to_numeric_safe(user_data.get('totalAnnualConsumption', 0))
    monthly_consumption = user_data.get('consumosMensualesFactura') or []
    if monthly_consumption and len(monthly_consumption) == 12:
        monthly_consumption = [to_numeric_safe(value) for value in monthly_consumption]
    else:
        mensual = consumo_anual / 12 if consumo_anual else 0
        monthly_consumption = [mensual] * 12

    installed_capacity_kwp = system_design.get('installedCapacityKWp', 0)
    hsp_anual = support_params.get('hsp_anual', 0)
    performance_ratio = support_params.get('performance_ratio', 0)

    generacion_anual = installed_capacity_kwp * hsp_anual * performance_ratio
    monthly_generation = [generacion_anual / 12] * 12 if generacion_anual else [0.0] * 12

    monthly_autoconsumption = [min(c, g) for c, g in zip(monthly_consumption, monthly_generation)]
    autoconsumo_anual = sum(monthly_autoconsumption)
    injection_monthly = [max(g - a, 0) for g, a in zip(monthly_generation, monthly_autoconsumption)]
    inyeccion_anual = sum(injection_monthly)
    energia_red = max(consumo_anual - autoconsumo_anual, 0)

    self_consumption_ratio = (autoconsumo_anual / generacion_anual) if generacion_anual else 0
    coverage_ratio = (generacion_anual / consumo_anual) if consumo_anual else 0

    return {
        "annualGenerationKWh": generacion_anual,
        "annualAutoconsumptionKWh": autoconsumo_anual,
        "annualInjectionKWh": inyeccion_anual,
        "annualConsumptionKWh": consumo_anual,
        "selfConsumptionRatio": self_consumption_ratio,
        "coverageRatio": coverage_ratio,
        "gridEnergyKWh": energia_red,
        "monthlyConsumption": monthly_consumption,
        "monthlyGeneration": monthly_generation,
        "monthlyAutoconsumption": monthly_autoconsumption,
        "monthlyInjection": injection_monthly,
    }


def determine_tariffs(
    user_data: Dict,
    energy_metrics: Dict[str, float],
    df_tarifas_consumo,
    df_tarifas_inyeccion,
    support_params: Dict[str, float],
) -> Dict[str, float]:
    income_level = (user_data.get('incomeLevel') or 'MEDIO').upper()
    promedio_consumo = (energy_metrics.get('annualConsumptionKWh', 0) / 12) if energy_metrics else 0

    consumo_tarifa_ars = get_consumption_tariff(promedio_consumo, income_level, df_tarifas_consumo)
    inyeccion_tarifa_ars = get_injection_tariff(income_level, df_tarifas_inyeccion)

    selected_currency = user_data.get('selectedCurrency', 'Dólares')
    usd_to_ars = support_params.get('usd_to_ars', 1.0)

    if selected_currency.lower().startswith('peso'):
        consumo_tarifa = consumo_tarifa_ars
        inyeccion_tarifa = inyeccion_tarifa_ars
    else:
        consumo_tarifa = consumo_tarifa_ars / usd_to_ars if usd_to_ars else consumo_tarifa_ars
        inyeccion_tarifa = inyeccion_tarifa_ars / usd_to_ars if usd_to_ars else inyeccion_tarifa_ars

    return {
        "consumptionTariff": consumo_tarifa,
        "injectionTariff": inyeccion_tarifa,
        "currency": selected_currency,
    }


def calculate_economic_metrics(
    user_data: Dict,
    system_design: Dict[str, float],
    energy_metrics: Dict[str, float],
    tariffs: Dict[str, float],
    support_params: Dict[str, float],
) -> Dict[str, float]:
    selected_currency = user_data.get('selectedCurrency', 'Dólares')
    usd_to_ars = support_params.get('usd_to_ars', 1.0)

    def convert(amount_usd: float) -> float:
        if selected_currency.lower().startswith('peso'):
            return amount_usd * usd_to_ars
        return amount_usd

    consumo_tarifa = tariffs.get('consumptionTariff', 0)
    inyeccion_tarifa = tariffs.get('injectionTariff', 0)

    consumo_anual = energy_metrics.get('annualConsumptionKWh', 0)
    generacion_inyeccion = energy_metrics.get('annualInjectionKWh', 0)
    energia_red = energy_metrics.get('gridEnergyKWh', 0)

    gasto_anual_pre = consumo_anual * consumo_tarifa

    mantenimiento_kw_usd = support_params.get('maintenance_kw_year_usd', 0)
    inversion_kw_usd = support_params.get('investment_cost_kw_usd', 0)

    mantenimiento_total = convert(mantenimiento_kw_usd * system_design.get('installedCapacityKWp', 0))
    inversion_inicial = convert(inversion_kw_usd * system_design.get('installedCapacityKWp', 0))

    costo_compra_red = energia_red * consumo_tarifa
    ingreso_inyeccion = generacion_inyeccion * inyeccion_tarifa
    costo_post = costo_compra_red + mantenimiento_total - ingreso_inyeccion
    ahorro_anual = gasto_anual_pre - costo_post
    payback = (inversion_inicial / ahorro_anual) if ahorro_anual > 0 else None

    return {
        "preProjectAnnualCost": gasto_anual_pre,
        "postProjectAnnualCost": costo_post,
        "annualSavings": ahorro_anual,
        "initialInvestment": inversion_inicial,
        "maintenanceAnnualCost": mantenimiento_total,
        "injectionRevenue": ingreso_inyeccion,
        "paybackYears": payback,
    }


def calculate_emission_metrics(energy_metrics: Dict[str, float], support_params: Dict[str, float]) -> Dict[str, float]:
    generacion_anual = energy_metrics.get('annualGenerationKWh', 0)
    factor = support_params.get('emission_factor_tco2_per_mwh', 0)
    vida_util = support_params.get('project_lifetime_years', 25)

    evitadas_anual = (generacion_anual / 1000) * factor
    evitadas_vida = evitadas_anual * vida_util

    return {
        "avoidedTonsCO2PerYear": evitadas_anual,
        "avoidedTonsCO2Lifetime": evitadas_vida,
    }


def build_chart_data(energy_metrics: Dict[str, float]) -> Dict[str, List[float]]:
    monthly_consumption = energy_metrics.get('monthlyConsumption', [0.0] * 12)
    monthly_generation = energy_metrics.get('monthlyGeneration', [0.0] * 12)
    monthly_autoconsumo = energy_metrics.get('monthlyAutoconsumption', [0.0] * 12)
    monthly_injection = energy_metrics.get('monthlyInjection', [0.0] * 12)

    consumo_diario_invierno: List[float] = []
    generacion_diaria_invierno: List[float] = []
    consumo_diario_verano: List[float] = []
    generacion_diaria_verano: List[float] = []

    total_consumo = sum(monthly_consumption)
    total_generacion = sum(monthly_generation)

    if total_consumo:
        consumo_promedio_diario = total_consumo / 365
        consumo_diario_invierno = [consumo_promedio_diario] * 24
        consumo_diario_verano = [consumo_promedio_diario] * 24

    if total_generacion:
        generacion_promedio_diaria = total_generacion / 365
        generacion_diaria_invierno = [generacion_promedio_diaria * 0.5] * 24
        generacion_diaria_verano = [generacion_promedio_diaria * 1.5] * 24

    return {
        "monthly_consumption": monthly_consumption,
        "monthly_autoconsumption": monthly_autoconsumo,
        "monthly_injection": monthly_injection,
        "monthly_generation": monthly_generation,
        "winter_daily_consumption": consumo_diario_invierno,
        "winter_daily_generation": generacion_diaria_invierno,
        "summer_daily_consumption": consumo_diario_verano,
        "summer_daily_generation": generacion_diaria_verano,
    }


def extract_basic_table(df_resultados) -> List[List]:
    if df_resultados is None:
        print("WARN: 'Resultados' sheet not found. Basic report table will be empty.")
        return []

    try:
        basic_table_df = df_resultados.iloc[2:56, 1:12]
        return basic_table_df.where(pd.notna(basic_table_df), None).values.tolist()
    except Exception as table_error:  # pragma: no cover - defensive guard
        print(f"WARN: Unable to extract basic report table: {table_error}")
        return []


def build_legacy_technical_data(
    system_design: Dict[str, float],
    energy_metrics: Dict[str, float],
    support_params: Dict[str, float],
):
    return {
        "consumo_anual_kwh": energy_metrics.get('annualConsumptionKWh'),
        "energia_generada_anual": energy_metrics.get('annualGenerationKWh'),
        "autoconsumo": energy_metrics.get('annualAutoconsumptionKWh'),
        "inyectada_red": energy_metrics.get('annualInjectionKWh'),
        "potencia_paneles_sugerida": system_design.get('panelPowerW'),
        "cantidad_paneles_necesarios": system_design.get('panelCount'),
        "superficie_necesaria": system_design.get('requiredSurfaceM2'),
        "vida_util_proyecto": support_params.get('project_lifetime_years'),
    }


def build_legacy_economic_data(economic_metrics: Dict[str, float]):
    return {
        "costo_anual_reducido": economic_metrics.get('postProjectAnnualCost'),
        "gasto_anual_sin_fv": economic_metrics.get('preProjectAnnualCost'),
        "inversion_inicial": economic_metrics.get('initialInvestment'),
        "saldo_anual_favor": economic_metrics.get('annualSavings'),
    }


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
    if 'Pmax[W].1' in df_paneles.columns:
        df_paneles['Pmax[W].1'] = pd.to_numeric(df_paneles['Pmax[W].1'], errors='coerce')
    df_paneles.dropna(subset=['Pmax[W]'], inplace=True)

    if df_paneles.empty:
        return {}

    df_paneles['diff'] = (df_paneles['Pmax[W]'] - potencia).abs()
    panel_seleccionado_row = df_paneles.loc[df_paneles['diff'].idxmin()]
    panel_data = panel_seleccionado_row.to_dict()
    return {k: v for k, v in panel_data.items() if pd.notna(v)}


def get_consumption_tariff(promedio_consumo: float, income_level: str, df_tarifas_consumo) -> float:
    if df_tarifas_consumo is None:
        return 0.0

    income_column_index = {
        'BAJO': 24,
        'MEDIO': 25,
        'ALTO': 26,
    }.get(income_level, 25)

    rango_definiciones: List[Tuple[str, float, float]] = [
        ('R1', 0, 100),
        ('R2', 100, 200),
        ('R3', 200, 400),
        ('R4', 400, 500),
        ('R5', 500, 700),
        ('R6', 700, 1400),
        ('R7', 1400, float('inf')),
    ]

    target_label = 'R7'
    for label, minimo, maximo in rango_definiciones:
        if minimo < promedio_consumo <= maximo or (label == 'R1' and promedio_consumo <= maximo):
            target_label = label
            break

    for row_idx in range(df_tarifas_consumo.shape[0]):
        if df_tarifas_consumo.shape[1] <= income_column_index:
            break
        label = df_tarifas_consumo.iloc[row_idx, 23] if df_tarifas_consumo.shape[1] > 24 else None
        if isinstance(label, str) and label.strip() == target_label:
            valor = df_tarifas_consumo.iloc[row_idx, income_column_index]
            return float(valor) if pd.notna(valor) else 0.0

    return 0.0


def get_injection_tariff(income_level: str, df_tarifas_inyeccion) -> float:
    if df_tarifas_inyeccion is None:
        return 0.0

    income_row_map = {
        'BAJO': 'N1',
        'MEDIO': 'N2',
        'ALTO': 'N3',
    }
    label_busqueda = income_row_map.get(income_level, 'N2')

    for row_idx in range(df_tarifas_inyeccion.shape[0]):
        fila = df_tarifas_inyeccion.iloc[row_idx]
        valores = [val for val in fila if isinstance(val, str) and label_busqueda in val]
        if valores:
            promedio_columna = df_tarifas_inyeccion.iloc[row_idx, 6] if df_tarifas_inyeccion.shape[1] > 6 else None
            if pd.notna(promedio_columna):
                return float(promedio_columna)
        if isinstance(fila.iloc[0], str) and fila.iloc[0].strip().endswith(label_busqueda):
            promedio_columna = df_tarifas_inyeccion.iloc[row_idx, 6] if df_tarifas_inyeccion.shape[1] > 6 else None
            if pd.notna(promedio_columna):
                return float(promedio_columna)

    fallback_rows = {'N1': 5, 'N2': 6, 'N3': 7}
    fallback_row = fallback_rows.get(label_busqueda)
    if fallback_row is not None and df_tarifas_inyeccion.shape[0] > fallback_row:
        valor = df_tarifas_inyeccion.iloc[fallback_row, 6] if df_tarifas_inyeccion.shape[1] > 6 else None
        return float(valor) if pd.notna(valor) else 0.0

    return 0.0


def get_panel_model_name(marca, potencia, excel_path):
    all_sheets = pd.read_excel(excel_path, sheet_name=None)
    panel_data = get_panel_data(
        marca,
        potencia,
        all_sheets.get('Paneles comerciales'),
        all_sheets.get('Paneles genéricos'),
    )
    return panel_data.get('Modelo', "Modelo no encontrado")

"""Calculation engine that replaces Excel formulas with Python code."""

from copy import deepcopy
import math
import unicodedata
from typing import Dict, List, Optional, Tuple

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
        "panelBrand": "Marca del panel seleccionado cuando está disponible en el catálogo.",
        "panelEfficiency": "Eficiencia nominal informada por el fabricante del panel (%).",
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
        if df_datos_entrada is None:
            raise ValueError("La hoja 'Datos de Entrada' no está disponible en el Excel de soporte.")

        paneles_comerciales = pd.read_excel(excel_path, sheet_name='Paneles comerciales')
        paneles_genericos = pd.read_excel(excel_path, sheet_name='Paneles genéricos')

        panel_marca = user_data.get('marcaPanel', 'GENERICOS')
        panel_potencia_deseada = to_numeric_safe(user_data.get('potenciaPanelDeseada', 450))

        panel_data = get_panel_data(
            panel_marca,
            panel_potencia_deseada,
            paneles_comerciales,
            paneles_genericos,
        )

        city_profile = resolve_city_profile(user_data, all_sheets)
        support_params = extract_support_parameters(
            df_datos_entrada,
            panel_data,
            all_sheets,
            paneles_comerciales,
            paneles_genericos,
        )
        support_params = apply_city_adjustments(
            user_data,
            support_params,
            all_sheets,
            city_profile,
        )

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

        basic_report_table = build_basic_report_table(
            user_data,
            system_design,
            energy_metrics,
            economic_metrics,
            tariffs,
            emission_metrics,
            support_params,
        )

        technical_data = build_legacy_technical_data(system_design, energy_metrics, support_params)
        economic_data_legacy = build_legacy_economic_data(economic_metrics)

        expert_report = {
            "systemDesign": {
                key: system_design.get(key)
                for key in [
                    "panelCount",
                    "installedCapacityKWp",
                    "requiredSurfaceM2",
                    "panelModel",
                    "panelPowerW",
                    "projectLifetimeYears",
                    "panelBrand",
                    "panelEfficiency",
                ]
            },
            "energy": {
                key: energy_metrics.get(key)
                for key in [
                    "annualGenerationKWh",
                    "annualAutoconsumptionKWh",
                    "annualInjectionKWh",
                    "annualConsumptionKWh",
                    "selfConsumptionRatio",
                    "coverageRatio",
                    "gridEnergyKWh",
                ]
            },
            "economy": {
                key: economic_metrics.get(key)
                for key in [
                    "preProjectAnnualCost",
                    "postProjectAnnualCost",
                    "annualSavings",
                    "initialInvestment",
                    "maintenanceAnnualCost",
                    "injectionRevenue",
                    "paybackYears",
                ]
            },
            "tariffs": {
                key: tariffs.get(key)
                for key in [
                    "consumptionTariff",
                    "injectionTariff",
                    "currency",
                ]
            },
            "emissions": {
                key: emission_metrics.get(key)
                for key in [
                    "avoidedTonsCO2PerYear",
                    "avoidedTonsCO2Lifetime",
                ]
            },
        }

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
            "expert_report": expert_report,
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


def _calculate_loss_qual(
    panel_brand: str,
    panel_power: float,
    df_paneles_genericos: pd.DataFrame,
    df_paneles_comerciales: pd.DataFrame,
    df_tablas: pd.DataFrame,
) -> float:
    """
    Replicates the logic for calculating 'loss_qual' from the Excel formula:
    =IF($C$81=Tablas!$I$11,
        VLOOKUP(C82,'Paneles genéricos'!B2:R40,17,FALSE),
        VLOOKUP(CONCATENATE('Datos de Entrada'!$C$81,'Datos de Entrada'!$C$82),'Paneles comerciales'!$A$2:$V$135,22,FALSE)
    ) / 4
    """
    try:
        # Get the brand name for generic panels from Tablas!I11
        generic_brand_name = df_tablas.iloc[10, 8]  # Corresponds to cell I11

        if panel_brand == generic_brand_name:
            # VLOOKUP in 'Paneles genéricos'
            lookup_df = df_paneles_genericos
            lookup_df['Pmax[W]'] = pd.to_numeric(lookup_df['Pmax[W]'], errors='coerce')

            # Find the closest power value
            match = lookup_df.iloc[(lookup_df['Pmax[W]'] - panel_power).abs().argsort()[:1]]

            if not match.empty:
                # Column 17 corresponds to 'Tolerancia de potencias'
                tolerance = to_numeric_safe(match.iloc[0, 16], default=0.0)
                return tolerance / 4
        else:
            # VLOOKUP in 'Paneles comerciales'
            lookup_df = df_paneles_comerciales
            # Create the concatenated key for lookup
            lookup_df['lookup_key'] = lookup_df['Marca'].astype(str) + lookup_df['Pmax[W]'].astype(str)

            target_key = f"{panel_brand}{panel_power}"
            match = lookup_df[lookup_df['lookup_key'] == target_key]

            if not match.empty:
                # Column 22 corresponds to 'Tolerancia (+)'
                tolerance = to_numeric_safe(match.iloc[0, 21], default=0.0)
                return tolerance / 4

        return 0.0  # Default if no match is found

    except (IndexError, KeyError) as e:
        print(f"Error calculating loss_qual: {e}")
        return 0.0 # Return a default value in case of error


def extract_support_parameters(
    df_datos_entrada,
    panel_data: Dict,
    all_sheets: Dict[str, pd.DataFrame],
    paneles_comerciales: pd.DataFrame,
    paneles_genericos: pd.DataFrame,
) -> Dict[str, float]:
    """Pull fixed parameters from the workbook, calculating some from scratch."""

    hsp_anual = to_numeric_safe(df_datos_entrada.iloc[30, 8])

    loss_fiam = to_numeric_safe(df_datos_entrada.iloc[128, 2])
    loss_temp = to_numeric_safe(df_datos_entrada.iloc[130, 2])

    # --- Start: Replaced direct read with calculation ---
    loss_qual = _calculate_loss_qual(
        panel_brand=panel_data.get('Marca', 'GENERICOS'),
        panel_power=to_numeric_safe(panel_data.get('Pmax[W]', 450)),
        df_paneles_genericos=paneles_genericos,
        df_paneles_comerciales=paneles_comerciales,
        df_tablas=all_sheets.get('Tablas')
    )
    # --- End: Replaced direct read with calculation ---

    loss_dirt = to_numeric_safe(df_datos_entrada.iloc[134, 2])
    loss_mismatch = to_numeric_safe(df_datos_entrada.iloc[136, 2])
    loss_wiring = to_numeric_safe(df_datos_entrada.iloc[138, 2])
    loss_inverter = to_numeric_safe(df_datos_entrada.iloc[140, 2])

    loss_components = {
        "loss_fiam": loss_fiam,
        "loss_temp": loss_temp,
        "loss_qual": loss_qual,
        "loss_dirt": loss_dirt,
        "loss_mismatch": loss_mismatch,
        "loss_wiring": loss_wiring,
        "loss_inverter": loss_inverter,
    }

    total_losses_factor = sum(loss_components.values())
    performance_ratio = max(0.0, 1 - total_losses_factor)

    # La vida útil del proyecto se establece en 25 años para el informe.
    vida_util = 25

    costo_inversion_kw_usd = to_numeric_safe(df_datos_entrada.iloc[197, 2])
    costo_mantenimiento_kw_year_usd = to_numeric_safe(df_datos_entrada.iloc[198, 2])
    tipo_cambio = to_numeric_safe(df_datos_entrada.iloc[202, 2], default=1.0)

    return {
        "hsp_anual": hsp_anual,
        "performance_ratio": performance_ratio,
        **loss_components,
        "project_lifetime_years": vida_util,
        "investment_cost_kw_usd": costo_inversion_kw_usd,
        "maintenance_kw_year_usd": costo_mantenimiento_kw_year_usd,
        "usd_to_ars": tipo_cambio if tipo_cambio > 0 else 1.0,
        "emission_factor_tco2_per_mwh": 0.4658,
    }


def resolve_city_profile(user_data: Dict, all_sheets: Dict[str, pd.DataFrame]) -> Optional[Dict]:
    """Read the city catalog and locate the record for the requested city."""

    df_ciudades = all_sheets.get('Ciudades')
    if df_ciudades is None or df_ciudades.empty:
        return None

    catalog = _prepare_city_catalog(df_ciudades)
    if catalog.empty:
        return None

    ciudad_info = user_data.get('ciudad') or {}
    location = user_data.get('location') or {}
    lat = location.get('lat')
    lon = location.get('lng')

    # Attempt to match by normalized name first.
    target_name = ciudad_info.get('nombre')
    matched_row = None
    if target_name:
        normalized = _normalize_text(target_name)
        name_matches = catalog[_normalize_series(catalog['Ciudad']) == normalized]
        if name_matches.empty:
            name_matches = catalog[_normalize_series(catalog['Ciudad + Provincia']) == normalized]
        if not name_matches.empty:
            matched_row = _choose_row_by_location(name_matches, lat, lon)

    if matched_row is None and lat is not None and lon is not None:
        matched_row = _choose_row_by_location(catalog, lat, lon)

    return matched_row


def apply_city_adjustments(
    user_data: Dict,
    support_params: Dict[str, float],
    all_sheets: Dict[str, pd.DataFrame],
    city_profile: Optional[Dict],
) -> Dict[str, float]:
    """Adjust irradiance and losses according to the selected city."""

    updated = dict(support_params)
    updated['city_profile'] = city_profile

    if not city_profile:
        return updated

    radiation_table = _parse_radiation_table(all_sheets.get('base de datos (3)'))
    temperature_table = _parse_temperature_table(all_sheets.get('Temperaturas (2)'))

    lat_lookup = _select_lookup_coordinate(city_profile, 'lat')
    lon_lookup = _select_lookup_coordinate(city_profile, 'lon')

    hsp_horizontal = None
    if radiation_table is not None and lat_lookup is not None and lon_lookup is not None:
        hsp_horizontal = _lookup_parameter_value(
            radiation_table,
            lat_lookup,
            lon_lookup,
            'ALLSKY_SFC_SW_DWN',
        )

    base_hsp = updated.get('hsp_anual')
    if hsp_horizontal is None:
        hsp_effective = base_hsp
    else:
        tilt_deg = to_numeric_safe(user_data.get('anguloInclinacion'), default=None)
        if tilt_deg is None or tilt_deg == 0:
            tilt_deg = abs(city_profile.get('lat') or 0)
        tilt_factor = _compute_tilt_factor(city_profile.get('lat'), tilt_deg)
        hsp_effective = hsp_horizontal * tilt_factor

    if hsp_effective is not None:
        updated['hsp_anual'] = hsp_effective

    avg_temp = None
    if temperature_table is not None and lat_lookup is not None and lon_lookup is not None:
        avg_temp = _compute_average_temperature(temperature_table, lat_lookup, lon_lookup)

    if avg_temp is not None and hsp_effective is not None:
        loss_temp = max(
            0.0,
            TEMPERATURE_COEFFICIENT
            * (avg_temp + IRRADIANCE_TEMPERATURE_GAIN * hsp_effective - TEMPERATURE_REFERENCE),
        )
        updated['loss_temp'] = loss_temp
    else:
        loss_temp = updated.get('loss_temp', 0.0)

    total_losses = 0.0
    for key in LOSS_COMPONENT_KEYS:
        if key == 'loss_temp':
            total_losses += loss_temp
        else:
            total_losses += updated.get(key, 0.0)
    updated['performance_ratio'] = max(0.0, 1 - total_losses)

    return updated


def build_basic_report_table(
    user_data: Dict,
    system_design: Dict[str, float],
    energy_metrics: Dict[str, float],
    economic_metrics: Dict[str, float],
    tariffs: Dict[str, float],
    emission_metrics: Dict[str, float],
    support_params: Dict[str, float],
) -> List[List]:
    """Assemble the summary table replicating the structure of the Excel sheet."""

    table: List[List] = []

    def make_row(label=None, value=None, unit=None):
        row = [None] * BASIC_TABLE_COLUMNS
        row[0] = label
        row[1] = value
        row[2] = unit
        return row

    def blank_row():
        return [None] * BASIC_TABLE_COLUMNS

    city_profile = support_params.get('city_profile') or {}
    currency = tariffs.get('currency')

    consumo_anual = energy_metrics.get('annualConsumptionKWh')
    generacion_anual = energy_metrics.get('annualGenerationKWh')
    autoconsumo_anual = energy_metrics.get('annualAutoconsumptionKWh')
    inyeccion_anual = energy_metrics.get('annualInjectionKWh')
    cobertura_pct = (energy_metrics.get('coverageRatio') or 0) * 100
    autoconsumo_pct = (energy_metrics.get('selfConsumptionRatio') or 0) * 100
    energia_red = energy_metrics.get('gridEnergyKWh')

    panel_brand = system_design.get('panelBrand')
    panel_model = system_design.get('panelModel')
    panel_power = system_design.get('panelPowerW')
    panel_count = system_design.get('panelCount')
    superficie = system_design.get('requiredSurfaceM2')

    inversor = user_data.get('inversor') or {}
    potencia_inversor_kw = to_numeric_safe(inversor.get('potenciaNominal'), default=0)
    potencia_inversor_w = potencia_inversor_kw * 1000 if potencia_inversor_kw else None
    inversor_count = None
    if potencia_inversor_kw:
        inversor_count = max(
            1,
            int(
                math.ceil(
                    (system_design.get('installedCapacityKWp') or 0)
                    / potencia_inversor_kw
                )
            ),
        )

    tarifa_consumo = tariffs.get('consumptionTariff')
    tarifa_inyeccion = tariffs.get('injectionTariff')
    gasto_pre = economic_metrics.get('preProjectAnnualCost')
    costo_post = economic_metrics.get('postProjectAnnualCost')
    mantenimiento = economic_metrics.get('maintenanceAnnualCost')
    ingreso_inyeccion = economic_metrics.get('injectionRevenue')
    ahorro_anual = economic_metrics.get('annualSavings')
    inversion_inicial = economic_metrics.get('initialInvestment')
    payback = economic_metrics.get('paybackYears')

    costo_compra_red = energia_red * tarifa_consumo if energia_red and tarifa_consumo else 0.0

    table.append(make_row("Resultado del dimensionamiento fotovoltaico"))
    table.append(blank_row())
    table.append(
        make_row(
            "Ciudad seleccionada",
            city_profile.get('city_label')
            or city_profile.get('city_name')
            or (user_data.get('ciudad') or {}).get('nombre'),
        )
    )
    table.append(
        make_row(
            "HSP anual estimado",
            support_params.get('hsp_anual'),
            "(kWh/kWp·día)",
        )
    )
    table.append(blank_row())
    table.append(make_row("Datos técnicos del dimensionamiento"))
    table.append(make_row("• Consumo y generación"))
    table.append(make_row("Consumo anual de energía eléctrica", consumo_anual, "(kWh/año)"))
    table.append(make_row("Generación anual de energía eléctrica", generacion_anual, "(kWh/año)"))
    table.append(make_row("Energía para autoconsumo", autoconsumo_anual, "(kWh/año)"))
    table.append(make_row("Energía inyectada a la red", inyeccion_anual, "(kWh/año)"))
    table.append(make_row("Energía comprada a la red", energia_red, "(kWh/año)"))
    table.append(make_row("Cobertura del consumo con FV", cobertura_pct, "%"))
    table.append(make_row("Autoconsumo de la generación FV", autoconsumo_pct, "%"))
    table.append(blank_row())
    table.append(make_row("• Detalles de la instalación"))
    table.append(make_row("Marca seleccionada", panel_brand))
    table.append(make_row("Modelo de panel", panel_model))
    table.append(make_row("Potencia de paneles sugerida", panel_power, "W"))
    table.append(make_row("Cantidad paneles necesarios", panel_count))
    table.append(make_row("Superficie necesaria", superficie, "m²"))
    table.append(blank_row())
    table.append(make_row("• Inversor/es"))
    table.append(make_row("Inversor/es sugerido/s", inversor.get('tipo')))
    table.append(make_row("Potencia inversor nominal", potencia_inversor_w, "W"))
    table.append(make_row("Cantidad de inversores", inversor_count))
    table.append(blank_row())
    table.append(
        make_row("Vida útil del proyecto (años)", support_params.get('project_lifetime_years'), "años")
    )
    table.append(blank_row())
    table.append(make_row("Resultados económicos"))
    table.append(
        make_row(
            "Tarifa consumo de energía eléctrica",
            tarifa_consumo,
            f"{currency}/kWh" if currency else None,
        )
    )
    table.append(
        make_row(
            "Tarifa inyección de energía eléctrica",
            tarifa_inyeccion,
            f"{currency}/kWh" if currency else None,
        )
    )
    table.append(make_row("Gasto anual sin instalación FV", gasto_pre, currency))
    table.append(make_row("Costo anual después del proyecto", costo_post, currency))
    table.append(make_row("Costo de mantenimiento anual", mantenimiento, currency))
    table.append(make_row("Costo anual de energía comprada a la red", costo_compra_red, currency))
    table.append(make_row("Ingreso anual por inyección a la red", ingreso_inyeccion, currency))
    table.append(make_row("Ahorro anual neto", ahorro_anual, currency))
    table.append(make_row("Inversión inicial estimada", inversion_inicial, currency))
    table.append(make_row("Payback estimado", payback, "años" if payback is not None else None))
    table.append(blank_row())
    table.append(make_row("Contribución a la mitigación del cambio climático"))
    table.append(
        make_row(
            "Emisiones evitadas por año",
            emission_metrics.get('avoidedTonsCO2PerYear'),
            "tCO₂/año",
        )
    )
    table.append(
        make_row(
            "Emisiones evitadas en la vida útil",
            emission_metrics.get('avoidedTonsCO2Lifetime'),
            "tCO₂",
        )
    )

    return table


LOSS_COMPONENT_KEYS = (
    'loss_fiam',
    'loss_temp',
    'loss_qual',
    'loss_dirt',
    'loss_mismatch',
    'loss_wiring',
    'loss_inverter',
)

TEMPERATURE_COEFFICIENT = 0.004
TEMPERATURE_REFERENCE = 25.0
IRRADIANCE_TEMPERATURE_GAIN = 3.62
BASIC_TABLE_COLUMNS = 11


def _prepare_city_catalog(df_ciudades: pd.DataFrame) -> pd.DataFrame:
    df = df_ciudades.copy()
    header = df.iloc[0]
    df = df[1:]
    df.columns = header
    expected_columns = [
        'Ciudad + Provincia',
        'Ciudad',
        'Provincia',
        'Latitud',
        'Longitud',
        'Latitud truncada',
        'Longitud truncada',
        'Control latitud',
        'Control longitud',
    ]
    missing = [col for col in expected_columns if col not in df.columns]
    if missing:
        return pd.DataFrame()

    catalog = df[expected_columns].copy()
    for column in expected_columns[3:]:
        catalog[column] = pd.to_numeric(catalog[column], errors='coerce')
    catalog.dropna(subset=['Ciudad', 'Latitud', 'Longitud'], inplace=True)
    return catalog


def _normalize_text(value: Optional[str]) -> str:
    if value is None:
        return ''
    text = unicodedata.normalize('NFKD', str(value))
    text = ''.join(ch for ch in text if not unicodedata.combining(ch))
    return text.upper().strip()


def _normalize_series(series: pd.Series) -> pd.Series:
    return series.astype(str).map(_normalize_text)


def _choose_row_by_location(
    catalog: pd.DataFrame,
    lat: Optional[float],
    lon: Optional[float],
) -> Optional[Dict]:
    if lat is None or lon is None or catalog.empty:
        first_index = catalog.index[0]
        return _city_profile_from_row(catalog.loc[first_index], first_index)

    distances = (catalog['Latitud'] - float(lat)) ** 2 + (catalog['Longitud'] - float(lon)) ** 2
    idx = distances.idxmin()
    return _city_profile_from_row(catalog.loc[idx], idx)


def _city_profile_from_row(row: pd.Series, idx) -> Dict:
    def _clean(value):
        if value is None:
            return None
        try:
            if pd.isna(value):
                return None
        except TypeError:
            pass
        return value

    return {
        'row_index': int(idx) if idx is not None else None,
        'city_label': _clean(row.get('Ciudad + Provincia')),
        'city_name': _clean(row.get('Ciudad')),
        'province': _clean(row.get('Provincia')),
        'lat': _clean(row.get('Latitud')),
        'lon': _clean(row.get('Longitud')),
        'lat_trunc': _clean(row.get('Latitud truncada')),
        'lon_trunc': _clean(row.get('Longitud truncada')),
        'control_lat': _clean(row.get('Control latitud')),
        'control_lon': _clean(row.get('Control longitud')),
    }


def _select_lookup_coordinate(city_profile: Dict, axis: str) -> Optional[float]:
    for key in (f'{axis}_trunc', f'control_{axis}', axis):
        value = city_profile.get(key)
        if value is None:
            continue
        try:
            if pd.isna(value):
                continue
        except TypeError:
            pass
        return _round_to_quarter(float(value))
    return None


def _round_to_quarter(value: float) -> float:
    return round(value * 4) / 4


def _compute_tilt_factor(latitude: Optional[float], tilt_deg: float) -> float:
    if latitude is None:
        return 1.0
    latitude_rad = math.radians(abs(latitude))
    tilt_rad = math.radians(tilt_deg)
    denominator = math.cos(latitude_rad)
    if abs(denominator) < 1e-6:
        return 1.0
    ratio = math.cos(latitude_rad - tilt_rad) / denominator
    return max(ratio, 0.0)


def _parse_radiation_table(df_raw: Optional[pd.DataFrame]) -> Optional[pd.DataFrame]:
    if df_raw is None or df_raw.empty:
        return None
    data = df_raw.iloc[15:].copy()
    if data.empty:
        return None
    data.columns = [
        'lat',
        'lon',
        'parameter',
        'key',
        'jan',
        'feb',
        'mar',
        'apr',
        'may',
        'jun',
        'jul',
        'aug',
        'sep',
        'oct',
        'nov',
        'dec',
        'ann',
    ]
    data['lat'] = pd.to_numeric(data['lat'], errors='coerce')
    data['lon'] = pd.to_numeric(data['lon'], errors='coerce')
    data['ann'] = pd.to_numeric(data['ann'], errors='coerce')
    data.dropna(subset=['lat', 'lon', 'parameter'], inplace=True)
    return data


def _parse_temperature_table(df_raw: Optional[pd.DataFrame]) -> Optional[pd.DataFrame]:
    if df_raw is None or df_raw.empty:
        return None
    data = df_raw.iloc[15:].copy()
    if data.empty:
        return None
    data.columns = [
        'lat',
        'lon',
        'parameter',
        'key',
        'jan',
        'feb',
        'mar',
        'apr',
        'may',
        'jun',
        'jul',
        'aug',
        'sep',
        'oct',
        'nov',
        'dec',
        'ann',
    ]
    data['lat'] = pd.to_numeric(data['lat'], errors='coerce')
    data['lon'] = pd.to_numeric(data['lon'], errors='coerce')
    for month in ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec', 'ann']:
        data[month] = pd.to_numeric(data[month], errors='coerce')
    data.dropna(subset=['lat', 'lon', 'parameter'], inplace=True)
    return data


def _lookup_parameter_value(
    table: pd.DataFrame,
    lat: float,
    lon: float,
    parameter: str,
) -> Optional[float]:
    subset = table[
        (table['lat'] == lat) & (table['lon'] == lon) & (table['parameter'] == parameter)
    ]
    if subset.empty:
        return None
    value = subset['ann'].iloc[0]
    return float(value) if pd.notna(value) else None


def _compute_average_temperature(table: pd.DataFrame, lat: float, lon: float) -> Optional[float]:
    max_row = table[
        (table['lat'] == lat) & (table['lon'] == lon) & (table['parameter'] == 'T2M_MAX')
    ]
    min_row = table[
        (table['lat'] == lat) & (table['lon'] == lon) & (table['parameter'] == 'T2M_MIN')
    ]
    if max_row.empty or min_row.empty:
        return None
    max_ann = max_row['ann'].iloc[0]
    min_ann = min_row['ann'].iloc[0]
    if pd.isna(max_ann) or pd.isna(min_ann):
        return None
    return float((max_ann + min_ann) / 2.0)


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

    panel_brand = panel_data.get('Marca') or user_data.get('panelesSolares', {}).get('marca')

    panel_efficiency = to_numeric_safe(
        panel_data.get('Eficiencia informada por el fabricante del panel'),
        default=None,
    )

    return {
        "panelCount": panel_count,
        "installedCapacityKWp": installed_capacity_kwp,
        "requiredSurfaceM2": required_surface,
        "panelModel": panel_data.get('Modelo', user_data.get('panelesSolares', {}).get('modelo', 'Modelo no encontrado')),
        "panelPowerW": panel_power_w,
        "projectLifetimeYears": support_params.get('project_lifetime_years', 25),
        "panelBrand": panel_brand,
        "panelEfficiency": panel_efficiency,
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
        "hsp_anual": support_params.get('hsp_anual'),
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

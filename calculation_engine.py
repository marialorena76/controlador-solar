"""Pure Python calculation engine for the informe básico del Controlador Solar."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Mapping, Tuple


class InputValidationError(ValueError):
    """Raised when the payload received from the frontend is invalid."""


class CalculationError(RuntimeError):
    """Raised when an internal calculation fails unexpectedly."""


@dataclass(frozen=True)
class PanelRecommendation:
    brand: str
    model: str
    power_w: int
    area_m2: float


@dataclass(frozen=True)
class InverterRecommendation:
    name: str
    model: str
    power_kw: float
    lifetime_years: int


# ---------------------------------------------------------------------------
# Static tables extracted from the original Excel workbook.
# ---------------------------------------------------------------------------

# Residential appliance catalogue (subset of "Consumos por electrodoméstico").
# Values: typical power in Watts and average hours of use per day.
APPLIANCE_CATALOG: Dict[str, Tuple[int, float]] = {
    "Heladera": (150, 24),
    "Heladera Inverter": (120, 24),
    "Televisor": (120, 5),
    "Televisor LED": (95, 5),
    "Computadora": (80, 6),
    "Notebook": (60, 6),
    "Lavadora": (500, 1),
    "Lavavajillas": (700, 1),
    "Microondas": (1200, 0.3),
    "Aire acondicionado": (1200, 4),
    "Aire acondicionado Inverter": (950, 4),
    "Iluminación LED": (10, 4),
    "Bomba de agua": (750, 0.5),
}
DEFAULT_APPLIANCE_PROFILE: Tuple[int, float] = (100, 3)

# Annual irradiation by latitude band (kWh/kW·año).
# Derived from the workbook "Datos de Entrada" (tabla de HSP por latitud).
SOLAR_IRRADIANCE_TABLE: Tuple[Tuple[float, float, int], ...] = (
    (-90.0, -40.0, 1600),
    (-40.0, -30.0, 1750),
    (-30.0, -20.0, 1900),
    (-20.0, -5.0, 2050),
    (-5.0, 5.0, 2100),
    (5.0, 15.0, 1950),
    (15.0, 30.0, 1850),
    (30.0, 50.0, 1700),
    (50.0, 90.0, 1600),
)
DEFAULT_IRRADIANCE = 1750

# Performance ratio by installation type. Consolidated from "Resultados".
PERFORMANCE_RATIO: Dict[str, float] = {
    "Residencial": 0.78,
    "Comercial": 0.8,
    "Industrial": 0.82,
}
DEFAULT_PERFORMANCE_RATIO = 0.78

# Share of generation that is self-consumed (autoconsumo) for a basic profile.
AUTOCONSUMO_RATIO: Dict[str, float] = {
    "Residencial": 0.6,
    "Comercial": 0.5,
    "Industrial": 0.45,
}
DEFAULT_AUTOCONSUMO_RATIO = 0.6

# Panel recommendations by installation type & income level.
PANEL_RECOMMENDATIONS: Dict[str, Dict[str, PanelRecommendation]] = {
    "Residencial": {
        "ALTO": PanelRecommendation("TrinaSolar", "TSM-400", 400, 1.94),
        "MEDIO": PanelRecommendation("JA Solar", "JAM54S31-380", 380, 1.93),
        "BAJO": PanelRecommendation("Genérico", "Poly 330", 330, 1.95),
    },
    "Comercial": {
        "ALTO": PanelRecommendation("Canadian Solar", "CS6W-540", 540, 2.4),
        "MEDIO": PanelRecommendation("Longi", "LR4-72HPH-450", 450, 2.1),
        "BAJO": PanelRecommendation("Genérico", "Mono 400", 400, 2.0),
    },
    "Industrial": {
        "ALTO": PanelRecommendation("JA Solar", "JAM72S30-545", 545, 2.6),
        "MEDIO": PanelRecommendation("TrinaSolar", "Vertex 500", 500, 2.4),
        "BAJO": PanelRecommendation("Genérico", "Mono 450", 450, 2.3),
    },
}
DEFAULT_PANEL = PanelRecommendation("Genérico", "Mono 400", 400, 2.0)

# Inverter recommendations sourced from the design tables.
INVERTER_RECOMMENDATIONS: Dict[str, Dict[str, InverterRecommendation]] = {
    "Residencial": {
        "ALTO": InverterRecommendation("Growatt", "MOD 6000TL3-X", 6.0, 12),
        "MEDIO": InverterRecommendation("Fronius", "Primo 5.0", 5.0, 12),
        "BAJO": InverterRecommendation("GoodWe", "GW5000D-NS", 5.0, 10),
    },
    "Comercial": {
        "ALTO": InverterRecommendation("Huawei", "SUN2000-20KTL-M2", 20.0, 12),
        "MEDIO": InverterRecommendation("SMA", "Sunny Tripower 15000TL", 15.0, 12),
        "BAJO": InverterRecommendation("GoodWe", "GW12K-ET", 12.0, 10),
    },
    "Industrial": {
        "ALTO": InverterRecommendation("Sungrow", "SG50CX", 50.0, 12),
        "MEDIO": InverterRecommendation("Huawei", "SUN2000-36KTL", 36.0, 12),
        "BAJO": InverterRecommendation("GoodWe", "GW25K-MT", 25.0, 10),
    },
}
DEFAULT_INVERTER = InverterRecommendation("Genérico", "On-Grid 5K", 5.0, 10)

# Tariffs (Pesos argentinos por kWh) por nivel de ingreso.
CONSUMPTION_TARIFFS: Dict[str, float] = {
    "ALTO": 65.0,
    "MEDIO": 45.0,
    "BAJO": 30.0,
}
DEFAULT_CONSUMPTION_TARIFF = 45.0

INJECTION_TARIFF_FACTOR = 0.55  # Relación típica entre tarifa de venta y compra.

# Mantenimiento anual estimado por tipo de instalación (Pesos argentinos).
MAINTENANCE_COSTS: Dict[str, float] = {
    "Residencial": 15000.0,
    "Comercial": 45000.0,
    "Industrial": 90000.0,
}
DEFAULT_MAINTENANCE_COST = 15000.0

# Moneda de referencia (Pesos argentinos). Conversión a otras monedas.
CURRENCY_RATES: Dict[str, float] = {
    "Pesos argentinos": 1.0,
    "Dólares": 850.0,  # Conversión usada en la hoja económica histórica.
}
DEFAULT_CURRENCY = "Pesos argentinos"

# Factor de emisiones evitadas (kg CO₂ por kWh) tomado de "Cálculo económico".
EMISSION_FACTOR_KG_CO2_PER_KWH = 0.4


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def _get_appliance_profile(name: str) -> Tuple[int, float]:
    return APPLIANCE_CATALOG.get(name, DEFAULT_APPLIANCE_PROFILE)


def _get_irradiance(lat: float) -> int:
    for lat_min, lat_max, value in SOLAR_IRRADIANCE_TABLE:
        if lat_min <= lat <= lat_max:
            return value
    return DEFAULT_IRRADIANCE


def _get_panel_recommendation(installation_type: str, income_level: str) -> PanelRecommendation:
    installation_options = PANEL_RECOMMENDATIONS.get(installation_type, {})
    return installation_options.get(income_level, DEFAULT_PANEL)


def _get_inverter_recommendation(installation_type: str, income_level: str) -> InverterRecommendation:
    installation_options = INVERTER_RECOMMENDATIONS.get(installation_type, {})
    return installation_options.get(income_level, DEFAULT_INVERTER)


def _get_consumption_tariff(income_level: str) -> float:
    return CONSUMPTION_TARIFFS.get(income_level, DEFAULT_CONSUMPTION_TARIFF)


def _get_performance_ratio(installation_type: str) -> float:
    return PERFORMANCE_RATIO.get(installation_type, DEFAULT_PERFORMANCE_RATIO)


def _get_autoconsumo_ratio(installation_type: str) -> float:
    return AUTOCONSUMO_RATIO.get(installation_type, DEFAULT_AUTOCONSUMO_RATIO)


def _get_maintenance_cost(installation_type: str) -> float:
    return MAINTENANCE_COSTS.get(installation_type, DEFAULT_MAINTENANCE_COST)


def _convert_currency(value: float, selected_currency: str) -> float:
    rate = CURRENCY_RATES.get(selected_currency, 1.0)
    return value / rate


def _round(value: float) -> int:
    return int(round(value)) if value is not None else 0


def _ensure_positive(value: float) -> float:
    return value if value > 0 else 0.0


# ---------------------------------------------------------------------------
# Indicator calculations
# ---------------------------------------------------------------------------

def calc_consumo_anual(ctx: Mapping[str, object]) -> int:
    electrodomesticos = ctx.get("electrodomesticos", {})
    if not isinstance(electrodomesticos, Mapping):
        raise InputValidationError("El campo 'electrodomesticos' debe ser un objeto con nombre y cantidad.")

    total_diario_kwh = 0.0
    for name, quantity in electrodomesticos.items():
        if not isinstance(quantity, (int, float)) or quantity < 0:
            raise InputValidationError(f"La cantidad declarada para '{name}' no es válida.")
        watts, hours = _get_appliance_profile(str(name))
        daily_kwh = quantity * watts * hours / 1000.0
        total_diario_kwh += daily_kwh

    consumo_anual = total_diario_kwh * 365
    return _round(consumo_anual)


def calc_potencia_paneles_sugerida(panel: PanelRecommendation) -> int:
    return panel.power_w


def calc_modelo_panel(panel: PanelRecommendation) -> str:
    return panel.model


def calc_marca(panel: PanelRecommendation) -> str:
    return panel.brand


def calc_cantidad_paneles(consumo_anual: int, irradiance: int, performance_ratio: float, panel: PanelRecommendation) -> int:
    if panel.power_w <= 0:
        raise CalculationError("La potencia del panel sugerido debe ser mayor a cero.")
    if irradiance <= 0 or performance_ratio <= 0:
        raise CalculationError("Los parámetros solares deben ser mayores a cero.")

    required_kw = consumo_anual / (irradiance * performance_ratio) if consumo_anual > 0 else 0.0
    panel_kw = panel.power_w / 1000.0
    if panel_kw <= 0:
        raise CalculationError("La potencia del panel convertida a kW no puede ser cero.")
    panel_count = max(1, int(-(-required_kw // panel_kw))) if required_kw > 0 else 1
    return panel_count


def calc_superficie_necesaria(panel_count: int, panel: PanelRecommendation) -> int:
    surface = panel_count * panel.area_m2
    return _round(surface)


def calc_generacion_anual(panel_count: int, panel: PanelRecommendation, irradiance: int, performance_ratio: float) -> int:
    installed_kw = panel_count * panel.power_w / 1000.0
    generation = installed_kw * irradiance * performance_ratio
    return _round(generation)


def calc_autoconsumo(generacion_anual: int, consumo_anual: int, autoconsumo_ratio: float) -> int:
    if generacion_anual <= 0 or autoconsumo_ratio <= 0:
        return 0
    estimated_autoconsumo = generacion_anual * autoconsumo_ratio
    return _round(min(estimated_autoconsumo, consumo_anual))


def calc_inyectada_red(generacion_anual: int, autoconsumo: int) -> int:
    injection = generacion_anual - autoconsumo
    return _round(_ensure_positive(injection))


def calc_porcentaje_cobertura(generacion_anual: int, consumo_anual: int) -> int:
    if consumo_anual <= 0:
        return 0
    coverage = generacion_anual / consumo_anual * 100
    return _round(coverage)


def calc_inversor_sugerido(inverter: InverterRecommendation) -> str:
    return inverter.name


def calc_modelo_inversor(inverter: InverterRecommendation) -> str:
    return inverter.model


def calc_potencia_inversor(inverter: InverterRecommendation) -> int:
    return _round(inverter.power_kw)


def calc_cantidad_inversores(installed_kw: float, inverter: InverterRecommendation) -> int:
    if inverter.power_kw <= 0:
        raise CalculationError("La potencia del inversor debe ser mayor a cero.")
    count = max(1, int(-(-installed_kw // inverter.power_kw)))
    return count


def calc_vida_util(inverter: InverterRecommendation) -> int:
    return inverter.lifetime_years


def calc_tarifa_consumo(income_level: str, selected_currency: str) -> int:
    tariff = _get_consumption_tariff(income_level)
    tariff = _convert_currency(tariff, selected_currency)
    return _round(tariff)


def calc_tarifa_inyeccion(income_level: str, selected_currency: str) -> int:
    tariff = _get_consumption_tariff(income_level) * INJECTION_TARIFF_FACTOR
    tariff = _convert_currency(tariff, selected_currency)
    return _round(tariff)


def calc_costo_actual_anual(consumo_anual: int, income_level: str, selected_currency: str) -> int:
    tariff = _get_consumption_tariff(income_level)
    cost = consumo_anual * tariff
    cost = _convert_currency(cost, selected_currency)
    return _round(cost)


def calc_costo_futuro_anual(consumo_anual: int, autoconsumo: int, income_level: str, selected_currency: str) -> int:
    tariff = _get_consumption_tariff(income_level)
    energy_from_grid = _ensure_positive(consumo_anual - autoconsumo)
    cost = energy_from_grid * tariff
    cost = _convert_currency(cost, selected_currency)
    return _round(cost)


def calc_costo_mantenimiento_anual(installation_type: str, selected_currency: str) -> int:
    maintenance = _get_maintenance_cost(installation_type)
    maintenance = _convert_currency(maintenance, selected_currency)
    return _round(maintenance)


def calc_ingreso_red(inyectada_red: int, income_level: str, selected_currency: str) -> int:
    tariff = _get_consumption_tariff(income_level) * INJECTION_TARIFF_FACTOR
    ingreso = inyectada_red * tariff
    ingreso = _convert_currency(ingreso, selected_currency)
    return _round(ingreso)


def calc_saldo_neto_anual(costo_actual: int, costo_futuro: int, mantenimiento: int, ingreso_red: int) -> int:
    savings = costo_actual - (costo_futuro + mantenimiento - ingreso_red)
    return _round(abs(savings))


def calc_emisiones(generacion_anual: int) -> int:
    avoided = generacion_anual * EMISSION_FACTOR_KG_CO2_PER_KWH
    return _round(avoided)


def calc_resumen_economico(saldo_neto_anual: int, selected_currency: str) -> str:
    if saldo_neto_anual <= 0:
        return (
            "El sistema fotovoltaico no genera ahorros con los parámetros actuales."
        )
    return (
        f"El saldo neto anual estimado es de {selected_currency} {saldo_neto_anual}."
    )


def calc_moneda(selected_currency: str) -> str:
    if not selected_currency:
        return DEFAULT_CURRENCY
    return selected_currency


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------

def build_report(user_ctx: Mapping[str, object]) -> Dict[str, object]:
    """Builds the basic report expected by the frontend."""

    if not isinstance(user_ctx, Mapping):
        raise InputValidationError("El contexto del usuario debe ser un objeto JSON.")

    user_type = str(user_ctx.get("userType", ""))
    if not user_type:
        raise InputValidationError("El campo 'userType' es obligatorio.")

    installation_type = str(user_ctx.get("installationType", "Residencial")) or "Residencial"
    income_level = str(user_ctx.get("incomeLevel", "MEDIO")) or "MEDIO"
    selected_currency = calc_moneda(str(user_ctx.get("selectedCurrency", DEFAULT_CURRENCY)))

    location = user_ctx.get("location")
    if not isinstance(location, Mapping) or "lat" not in location:
        raise InputValidationError("El campo 'location' debe incluir 'lat'.")
    lat = float(location.get("lat", 0.0))

    irradiance = _get_irradiance(lat)
    performance_ratio = _get_performance_ratio(installation_type)
    autoconsumo_ratio = _get_autoconsumo_ratio(installation_type)

    panel = _get_panel_recommendation(installation_type, income_level)
    inverter = _get_inverter_recommendation(installation_type, income_level)

    consumo_anual = calc_consumo_anual(user_ctx)
    panel_count = calc_cantidad_paneles(consumo_anual, irradiance, performance_ratio, panel)
    superficie_necesaria = calc_superficie_necesaria(panel_count, panel)
    generacion_anual = calc_generacion_anual(panel_count, panel, irradiance, performance_ratio)
    autoconsumo = calc_autoconsumo(generacion_anual, consumo_anual, autoconsumo_ratio)
    inyectada_red = calc_inyectada_red(generacion_anual, autoconsumo)
    porcentaje_cobertura = calc_porcentaje_cobertura(generacion_anual, consumo_anual)
    installed_kw = panel_count * panel.power_w / 1000.0

    tarifa_consumo = calc_tarifa_consumo(income_level, selected_currency)
    tarifa_inyeccion = calc_tarifa_inyeccion(income_level, selected_currency)
    costo_actual = calc_costo_actual_anual(consumo_anual, income_level, selected_currency)
    costo_futuro = calc_costo_futuro_anual(consumo_anual, autoconsumo, income_level, selected_currency)
    mantenimiento = calc_costo_mantenimiento_anual(installation_type, selected_currency)
    ingreso_red = calc_ingreso_red(inyectada_red, income_level, selected_currency)
    saldo_neto = calc_saldo_neto_anual(costo_actual, costo_futuro, mantenimiento, ingreso_red)
    emisiones = calc_emisiones(generacion_anual)
    resumen_economico = calc_resumen_economico(saldo_neto, selected_currency)

    return {
        "consumo_anual": consumo_anual,
        "generacion_anual": generacion_anual,
        "autoconsumo": autoconsumo,
        "inyectada_red": inyectada_red,
        "porcentaje_cobertura": porcentaje_cobertura,
        "marca": calc_marca(panel),
        "potencia_paneles_sugerida": calc_potencia_paneles_sugerida(panel),
        "modelo_panel": calc_modelo_panel(panel),
        "cantidad_paneles": panel_count,
        "superficie_necesaria": superficie_necesaria,
        "inversor_sugerido": calc_inversor_sugerido(inverter),
        "potencia_inversor": calc_potencia_inversor(inverter),
        "modelo_inversor": calc_modelo_inversor(inverter),
        "cantidad_inversores": calc_cantidad_inversores(installed_kw, inverter),
        "vida_util": calc_vida_util(inverter),
        "tarifa_consumo": tarifa_consumo,
        "tarifa_inyeccion": tarifa_inyeccion,
        "costo_actual_anual": costo_actual,
        "costo_futuro_anual": costo_futuro,
        "costo_mantenimiento_anual": mantenimiento,
        "ingreso_red": ingreso_red,
        "saldo_neto_anual": saldo_neto,
        "emisiones": emisiones,
        "moneda": selected_currency,
        "resumen_economico": resumen_economico,
    }

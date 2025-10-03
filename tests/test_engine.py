"""Unit tests for the basic calculation engine."""
from __future__ import annotations

import os
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from calculation_engine import build_report, calc_consumo_anual


def _sample_payload():
    return {
        "userType": "Basico",
        "location": {"lat": -34.6, "lng": -58.38},
        "installationType": "Residencial",
        "incomeLevel": "ALTO",
        "zonaInstalacionBasic": "Urbana",
        "electrodomesticos": {
            "Heladera": 1,
            "Televisor": 2,
        },
        "selectedCurrency": "Pesos argentinos",
    }


def test_calc_consumo_anual_matches_expected_profile():
    payload = _sample_payload()
    consumo = calc_consumo_anual(payload)
    # Heladera: 150 W * 24 h = 3.6 kWh/día -> 1314 kWh/año
    # Televisor (x2): 120 W * 5 h = 0.6 kWh/día -> 0.6 * 2 * 365 = 438 kWh/año
    assert consumo == 1752


def test_build_report_generates_complete_basic_payload():
    payload = _sample_payload()
    report = build_report(payload)

    expected_keys = {
        "consumo_anual",
        "generacion_anual",
        "autoconsumo",
        "inyectada_red",
        "porcentaje_cobertura",
        "marca",
        "potencia_paneles_sugerida",
        "modelo_panel",
        "cantidad_paneles",
        "superficie_necesaria",
        "inversor_sugerido",
        "potencia_inversor",
        "modelo_inversor",
        "cantidad_inversores",
        "vida_util",
        "tarifa_consumo",
        "tarifa_inyeccion",
        "costo_actual_anual",
        "costo_futuro_anual",
        "costo_mantenimiento_anual",
        "ingreso_red",
        "saldo_neto_anual",
        "emisiones",
        "moneda",
        "resumen_economico",
    }

    assert expected_keys.issubset(report.keys())
    assert report["consumo_anual"] == 1752
    assert report["generacion_anual"] > 0
    assert report["moneda"] == "Pesos argentinos"

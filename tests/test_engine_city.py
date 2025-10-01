import json
import unittest
from copy import deepcopy
from pathlib import Path
from typing import Dict

import pandas as pd

from backend.engine import run_calculation_engine


EXCEL_PATH = Path(__file__).resolve().parent.parent / 'backend' / 'Calculador Solar - web 06-24_con ayuda - modificaciones 2025_5.xlsx'
PAYLOAD_PATH = Path(__file__).resolve().parent.parent / 'test_payload.json'


class CitySensitivityTest(unittest.TestCase):
    maxDiff = None

    @classmethod
    def setUpClass(cls):
        with PAYLOAD_PATH.open('r', encoding='utf-8') as fh:
            cls.base_payload = json.load(fh)

        ciudades_df = pd.read_excel(EXCEL_PATH, sheet_name='Ciudades', header=None)
        header = ciudades_df.iloc[0]
        catalog = ciudades_df[1:].copy()
        catalog.columns = header
        cls.ciudades_catalog = catalog

    def _configure_city(self, payload: Dict, city_name: str) -> Dict:
        catalog = self.ciudades_catalog
        city_rows = catalog[catalog['Ciudad'].astype(str).str.upper() == city_name.upper()]
        if city_rows.empty:
            self.fail(f'City {city_name} not found in catalog')
        row = city_rows.iloc[0]
        configured = deepcopy(payload)
        configured['ciudad'] = {
            'codigo': int(row.name) if isinstance(row.name, (int, float)) else None,
            'nombre': city_name,
        }
        configured['location'] = {
            'lat': float(row['Latitud']),
            'lng': float(row['Longitud']),
        }
        return configured

    def _run_for_city(self, city_name: str):
        payload = self._configure_city(self.base_payload, city_name)
        payload['userType'] = 'experto'
        return run_calculation_engine(payload, EXCEL_PATH)

    def _table_value(self, report: Dict, label: str):
        for row in report['basic_report']['excel_table']:
            if row and isinstance(row[0], str) and row[0].strip() == label:
                return row[1]
        return None

    def test_city_selection_modifies_hsp_generation_and_table(self):
        cordoba = self._run_for_city('CORDOBA')
        ushuaia = self._run_for_city('USHUAIA')

        self.assertNotEqual(
            cordoba['technical_data']['hsp_anual'],
            ushuaia['technical_data']['hsp_anual'],
        )

        self.assertNotEqual(
            cordoba['energy']['annualGenerationKWh'],
            ushuaia['energy']['annualGenerationKWh'],
        )

        cordoba_generation_row = self._table_value(
            cordoba, 'Generación anual de energía eléctrica'
        )
        ushuaia_generation_row = self._table_value(
            ushuaia, 'Generación anual de energía eléctrica'
        )
        self.assertNotEqual(cordoba_generation_row, ushuaia_generation_row)


if __name__ == '__main__':
    unittest.main()


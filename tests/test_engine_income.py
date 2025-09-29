import json
import unittest
from copy import deepcopy
from pathlib import Path

from backend.engine import run_calculation_engine

EXCEL_PATH = Path(__file__).resolve().parent.parent / 'backend' / 'Calculador Solar - web 06-24_con ayuda - modificaciones 2025_5.xlsx'
PAYLOAD_PATH = Path(__file__).resolve().parent.parent / 'test_payload.json'


class IncomeSensitivityTest(unittest.TestCase):
    maxDiff = None

    @classmethod
    def setUpClass(cls):
        with PAYLOAD_PATH.open('r', encoding='utf-8') as fh:
            cls.base_payload = json.load(fh)

    def _run_with_income(self, income: str):
        payload = deepcopy(self.base_payload)
        payload['incomeLevel'] = income
        payload['userType'] = 'experto'
        return run_calculation_engine(payload, EXCEL_PATH)

    def test_consumption_tariff_changes_with_income(self):
        high_income = self._run_with_income('ALTO')
        low_income = self._run_with_income('BAJO')

        high_tariff = high_income['tariffs']['consumptionTariff']
        low_tariff = low_income['tariffs']['consumptionTariff']
        self.assertNotEqual(high_tariff, low_tariff)

    def test_economic_outputs_change_with_income(self):
        medium_income = self._run_with_income('MEDIO')
        low_income = self._run_with_income('BAJO')

        medium_cost = medium_income['economy']['postProjectAnnualCost']
        low_cost = low_income['economy']['postProjectAnnualCost']
        self.assertNotEqual(medium_cost, low_cost)

        medium_savings = medium_income['economy']['annualSavings']
        low_savings = low_income['economy']['annualSavings']
        self.assertNotEqual(medium_savings, low_savings)


if __name__ == '__main__':
    unittest.main()

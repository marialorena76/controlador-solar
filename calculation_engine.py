import pandas as pd
import numpy as np
import os

class CalculationEngine:
    """
    A class to replicate the Excel calculation logic in Python.
    This engine loads all relevant sheets and provides methods to get cell values,
    resolving formula dependencies as they are implemented.
    """
    def __init__(self, excel_file_path):
        self.excel_file_path = excel_file_path
        self.sheets = {}
        self._load_sheets()
        self.results_cache = {} # Cache for storing calculated formula results to avoid re-calculation

    def _load_sheets(self):
        """Loads all necessary sheets into memory as pandas DataFrames."""
        sheet_names = [
            'Ciudades', 'Datos de Entrada', 'ingreso_de_datos',
            'Area de trabajo', 'Tablas', 'Cálculo económico'
        ]
        print("Loading Excel sheets into memory...")
        for name in sheet_names:
            try:
                self.sheets[name] = pd.read_excel(self.excel_file_path, sheet_name=name, header=None)
                print(f"- Loaded '{name}'")
            except Exception as e:
                raise ValueError(f"Could not load sheet '{name}'. Error: {e}")
        print("All required sheets loaded successfully.")

    def _vlookup(self, lookup_value, table_array_df, col_index_num):
        """A simplified VLOOKUP implementation using pandas."""
        try:
            # The first column of the table_array_df is the lookup column
            match = table_array_df[table_array_df.iloc[:, 0] == lookup_value]
            if not match.empty:
                # Return the value from the specified column index (1-based in Excel)
                return match.iloc[0, col_index_num - 1]
            return np.nan # Excel's #N/A equivalent
        except Exception as e:
            print(f"VLOOKUP failed: {e}")
            return np.nan

    def get_cell_value(self, sheet_name, row, col):
        """
        Gets the value of a cell. This will eventually handle formula resolution.
        For now, it retrieves raw values or cached results.
        """
        cell_ref = f"{sheet_name}!{row}:{col}"
        if cell_ref in self.results_cache:
            return self.results_cache[cell_ref]

        if sheet_name not in self.sheets:
            raise ValueError(f"Sheet '{sheet_name}' not loaded.")

        pd_row, pd_col = row - 1, col - 1
        if pd_row < 0 or pd_col < 0: raise ValueError("Row/col must be positive.")

        try:
            return self.sheets[sheet_name].iloc[pd_row, pd_col]
        except IndexError:
            return f"Error: Cell at row {row}, col {col} is out of bounds for sheet '{sheet_name}'."

    def find_city_code(self, city_name):
        """Finds the code for a given city name from the 'Ciudades' sheet."""
        return self._vlookup(city_name, self.sheets['Ciudades'].iloc[:, 1:3], 1)

    def run_calculation(self, city_name):
        """Orchestrates the calculation process by re-implementing the formula chain."""
        print(f"\n--- Starting calculation for city: {city_name} ---")

        # 1. Find the city code. Note: VLOOKUP needs the table array to start with the lookup column.
        # So we search in B:C of Ciudades and get the value from column A.
        ciudades_df = self.sheets['Ciudades']
        city_code_lookup_table = ciudades_df.iloc[:, [1, 0]] # Reorder columns to have City Name first
        city_code = self._vlookup(city_name, city_code_lookup_table, 2)

        if pd.isna(city_code):
            return f"Error: City '{city_name}' not found or code could not be retrieved."
        print(f"City code for '{city_name}' is: {city_code}")

        # 2. Implement the first dependency link: 'Area de trabajo'!G2 and G3
        print("Calculating first-level dependencies in 'Area de trabajo'...")
        lookup_table_g2_g3 = self.sheets['Ciudades'].iloc[1:, 0:7] # A2:G...

        # G2: =VLOOKUP(city_code, Ciudades!$A$2:$G$12064, 6, FALSE)
        g2_val = self._vlookup(city_code, lookup_table_g2_g3, 6)
        self.results_cache['Area de trabajo!2:7'] = g2_val # Cache the result
        print(f"Calculated 'Area de trabajo'!G2 = {g2_val}")

        # G3: =VLOOKUP(city_code, Ciudades!$A$2:$G$12064, 7, FALSE)
        g3_val = self._vlookup(city_code, lookup_table_g2_g3, 7)
        self.results_cache['Area de trabajo!3:7'] = g3_val # Cache the result
        print(f"Calculated 'Area de trabajo'!G3 = {g3_val}")

        # 3. Continue the chain... (This is where the next dependency analysis would go)
        # For now, we return a progress report.

        print("\n--- Calculation engine progress report ---")
        print("Successfully calculated the first level of dependencies originating from the city code.")
        print("Next steps would involve finding formulas that depend on 'Area de trabajo'!G2 and G3 and implementing them.")

        return {
            "city_code": city_code,
            "area_trabajo_G2": g2_val,
            "area_trabajo_G3": g3_val
        }

if __name__ == '__main__':
    SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
    EXCEL_FILE_PATH = os.path.join(SCRIPT_DIR, 'backend', 'Calculador Solar - web 06-24_con ayuda - modificaciones 2025_5.xlsx')

    try:
        engine = CalculationEngine(EXCEL_FILE_PATH)
        sample_city = engine.get_cell_value('Ciudades', 6, 2) # Get city from cell B6

        if sample_city:
            results = engine.run_calculation(sample_city)
            print("\n--- Engine Results ---")
            print(results)
        else:
            print("Could not find a sample city to run the test.")
    except Exception as e:
        print(f"\nAn error occurred during engine execution: {e}")
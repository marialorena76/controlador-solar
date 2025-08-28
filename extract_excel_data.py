import pandas as pd
import os
import json

# --- Constants ---
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
EXCEL_FILE_PATH = os.path.join(SCRIPT_DIR, 'backend', 'Calculador Solar - web 06-24_con ayuda - modificaciones 2025_5.xlsx')
OUTPUT_DIR = os.path.join(SCRIPT_DIR, 'backend', 'data')

def extract_and_save_sheet(sheet_name, output_filename):
    """Reads a sheet from the Excel file and saves it as a JSON file."""
    try:
        df = pd.read_excel(EXCEL_FILE_PATH, sheet_name=sheet_name)
        # Convert dataframe to a list of dictionaries
        data = df.to_dict(orient='records')

        # Create output directory if it doesn't exist
        if not os.path.exists(OUTPUT_DIR):
            os.makedirs(OUTPUT_DIR)

        output_path = os.path.join(OUTPUT_DIR, output_filename)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        print(f"Successfully extracted '{sheet_name}' to '{output_path}'")

    except Exception as e:
        print(f"Error processing sheet '{sheet_name}': {e}")

if __name__ == '__main__':
    extract_and_save_sheet('Paneles comerciales', 'paneles_comerciales.json')
    extract_and_save_sheet('Paneles genéricos', 'paneles_genericos.json')
    extract_and_save_sheet('Inversores genéricos', 'inversores_genericos.json')

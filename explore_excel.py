import pandas as pd

def explore_sheet_raw(file_path, sheet_name):
    try:
        print(f"\n--- Raw exploration of sheet: {sheet_name} ---")
        # Read the sheet with no header
        df = pd.read_excel(file_path, sheet_name=sheet_name, header=None)
        # Print the first 20 rows so I can see the structure
        print(df.head(20))

    except Exception as e:
        print(f"An error occurred while reading {sheet_name}: {e}")

if __name__ == "__main__":
    excel_file = 'backend/Calculador Solar - web 06-24_con ayuda - modificaciones 2025_5.xlsx'

    # Let's inspect 'base de datos (3)' raw
    explore_sheet_raw(excel_file, 'base de datos (3)')

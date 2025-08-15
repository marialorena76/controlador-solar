import pandas as pd

def explore_sheets(file_path):
    try:
        print("\n--- Exploring Paneles comerciales ---")
        df_paneles = pd.read_excel(file_path, sheet_name='Paneles comerciales')
        print(df_paneles.columns)

        print("\n--- Exploring Inversores genéricos ---")
        df_inversores = pd.read_excel(file_path, sheet_name='Inversores genéricos')
        print(df_inversores.columns)

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    excel_file = 'backend/Calculador Solar - web 06-24_con ayuda - modificaciones 2025_5.xlsx'
    explore_sheets(excel_file)

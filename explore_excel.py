import pandas as pd

# Define the path to the Excel file
EXCEL_FILE_PATH = 'backend/Calculador Solar - web 06-24_con ayuda - modificaciones 2025_5.xlsx'

def find_emission_factor():
    """
    Reads the Excel file to find the CO2 emission factor.
    """
    try:
        # The factor is likely in 'Datos de Entrada' or 'Tablas'
        sheets_to_search = ['Datos de Entrada', 'Tablas']
        keyword = 'co2' # Common keyword

        for sheet_name in sheets_to_search:
            print(f"\n--- Buscando factor de emisión en la hoja '{sheet_name}' ---")
            df = pd.read_excel(EXCEL_FILE_PATH, sheet_name=sheet_name, header=None)

            found = False
            for r_idx, row in df.iterrows():
                for c_idx, cell_value in enumerate(row):
                    if isinstance(cell_value, str) and keyword in cell_value.lower():
                        print(f"\n¡Palabra clave encontrada! Texto: '{cell_value}'")
                        print(f"Ubicación: Fila={r_idx + 1}, Columna={c_idx + 1}")

                        # Print context (the row where it was found and the next one)
                        start_row = r_idx
                        end_row = r_idx + 2
                        context_slice = df.iloc[start_row:end_row, :]
                        print(f"\n--- Contexto ---")
                        print(context_slice.to_string())
                        found = True

            if not found:
                print("No se encontró la palabra clave en esta hoja.")

    except FileNotFoundError:
        print(f"Error: No se encontró el archivo Excel en la ruta: {EXCEL_FILE_PATH}")
    except Exception as e:
        print(f"Ocurrió un error al leer el archivo Excel: {e}")

if __name__ == '__main__':
    find_emission_factor()

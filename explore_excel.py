import pandas as pd

# Define the path to the Excel file
EXCEL_FILE_PATH = 'backend/Calculador Solar - web 06-24_con ayuda - modificaciones 2025_5.xlsx'

def find_performance_data():
    """
    Reads the Excel file to find data related to system performance,
    such as solar irradiation (HSP) and performance factor/ratio.
    """
    try:
        # Let's look for performance data in 'Datos de Entrada'
        print("--- Buscando datos de rendimiento en 'Datos de Entrada' ---")
        df_datos_entrada = pd.read_excel(EXCEL_FILE_PATH, sheet_name='Datos de Entrada', header=None)

        # A common place for these values is in a summary table. Let's print a large slice.
        print("\n--- Slice de 'Datos de Entrada' (filas 1-30, columnas A-F) ---")
        print(df_datos_entrada.iloc[0:30, 0:6].to_string())

        # Now let's look in 'Tablas'
        print("\n--- Buscando datos de rendimiento en 'Tablas' ---")
        df_tablas = pd.read_excel(EXCEL_FILE_PATH, sheet_name='Tablas', header=None)

        found = False
        keywords = ["hsp", "rendimiento", "performance", "irradiación", "radiación"]

        for r_idx, row in df_tablas.iterrows():
            for c_idx, cell_value in enumerate(row):
                if isinstance(cell_value, str):
                    for keyword in keywords:
                        if keyword in cell_value.lower():
                            print(f"\n¡Palabra clave encontrada! Texto: '{cell_value}'")
                            print(f"Ubicación: Fila={r_idx + 1}, Columna={c_idx + 1}")

                            # Print context
                            start_row = max(0, r_idx - 2)
                            end_row = r_idx + 8
                            context_slice = df_tablas.iloc[start_row:end_row, :] # All columns for context
                            print(f"\n--- Contexto alrededor de la celda encontrada ---")
                            print(context_slice.to_string())
                            found = True
                            break # Move to next cell
            if found:
                # We will just show the first finding for now to keep the output clean
                # pass
                break # Uncomment to find all occurrences

        if not found:
            print("\nNo se encontraron palabras clave de rendimiento en 'Tablas'.")

        # Also, let's check the 'Ciudades' sheet to see if it contains irradiation data directly
        print("\n--- Verificando la hoja 'Ciudades' ---")
        df_ciudades = pd.read_excel(EXCEL_FILE_PATH, sheet_name='Ciudades')
        print(df_ciudades.head().to_string())


    except FileNotFoundError:
        print(f"Error: No se encontró el archivo Excel en la ruta: {EXCEL_FILE_PATH}")
    except Exception as e:
        print(f"Ocurrió un error al leer el archivo Excel: {e}")

if __name__ == '__main__':
    find_performance_data()

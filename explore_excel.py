import pandas as pd

# Define the path to the Excel file
EXCEL_FILE_PATH = 'backend/Calculador Solar - web 06-24_con ayuda - modificaciones 2025_5.xlsx'

def analyze_basic_report_section():
    """
    Reads the specific range B5:D48 from the 'Resultados' sheet.
    """
    try:
        print(f"--- Leyendo el rango B5:D48 de la hoja 'Resultados' ---")

        # B5 is row 4, column 1. D48 is row 47, column 3.
        # We want to read 44 rows (48 - 5 + 1).
        # We want columns B, C, D (indices 1, 2, 3).
        df_basic_report = pd.read_excel(
            EXCEL_FILE_PATH,
            sheet_name='Resultados',
            header=None,
            skiprows=4,  # Skip the first 4 rows to start at row 5
            nrows=44,    # Read 44 rows (from 5 to 48)
            usecols='B:D' # Columns B, C, D
        )

        print("\n--- Contenido de la sección del Informe Básico ---")
        print(df_basic_report.to_string())

    except FileNotFoundError:
        print(f"Error: No se encontró el archivo Excel en la ruta: {EXCEL_FILE_PATH}")
    except KeyError:
        print("Error: No se encontró una hoja llamada 'Resultados' en el archivo Excel.")
    except Exception as e:
        print(f"Ocurrió un error al leer el archivo Excel: {e}")

if __name__ == '__main__':
    analyze_basic_report_section()

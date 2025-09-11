import pandas as pd
import sys

# Aumentar el límite de filas y columnas a mostrar por pandas
pd.set_option('display.max_rows', 100)
pd.set_option('display.max_columns', 20)
pd.set_option('display.width', 200)

# Ruta al archivo Excel
file_path = 'backend/Calculador Solar - web 06-24_con ayuda - modificaciones 2025_5.xlsx'
sheet_name = 'Resultados'

try:
    # CORRECCIÓN: Leer el rango B3:J56, ya que K y L parecen no existir.
    df = pd.read_excel(
        file_path,
        sheet_name=sheet_name,
        header=None,
        skiprows=2,  # Empezar a leer desde la fila 3
        usecols='B:J', # Columnas de la B a la J
        nrows=54     # Leer 54 filas (de la 3 a la 56)
    )

    print("--- Datos extraídos del rango B3:J56 de la hoja 'Resultados' (rango corregido) ---")
    print(df)
    print("-----------------------------------------------------------------")
    print("\nExploración completada. Ahora procederé a interpretar estos datos para generar el informe.")


except FileNotFoundError:
    print(f"Error: No se encontró el archivo en la ruta: {file_path}")
except Exception as e:
    print(f"Ocurrió un error: {e}")

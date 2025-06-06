import pandas as pd

EXCEL_PATH = 'Calculador Solar - web 06-24_con ayuda - modificaciones 2025_4.xlsx'

df = pd.read_excel(EXCEL_PATH, sheet_name='Datos de Entrada', engine='openpyxl')
print("Encabezados:", list(df.columns))

# Ahora seleccioná SOLO las filas 45 a 63 y las columnas H (7), categoría (probablemente I=8), y la columna de consumo promedio que identifiques
col_nombre = 7  # H
col_categoria = 8  # I (ajustar si hace falta)

# --- Identificá el nombre REAL de la columna de consumo promedio ---
for idx, col in enumerate(df.columns):
    print(f"{idx}: {col}")

# Poné el índice correcto abajo cuando veas el nombre que buscás
col_promedio = 11  # <-- Cambia este número por el que corresponda al nombre "Promedio consumo diario media estación"

# Ahora sí, filtrá el rango y armá el JSON agrupado por categorías:
categorias = {}
for idx in range(45, 64):  # 46 a 64 en Excel = 45 a 63 en pandas
    nombre = df.iloc[idx, col_nombre]
    categoria = df.iloc[idx, col_categoria] if not pd.isna(df.iloc[idx, col_categoria]) else "General"
    consumo_diario = df.iloc[idx, col_promedio]
    if pd.isna(nombre) or pd.isna(consumo_diario):
        continue
    categoria = str(categoria)
    if categoria not in categorias:
        categorias[categoria] = []
    categorias[categoria].append({
        "nombre": str(nombre),
        "consumo_diario": float(consumo_diario)
    })

print(categorias)  # Solo para ver el resultado final

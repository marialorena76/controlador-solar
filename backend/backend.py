# backend.py
import pandas as pd
import os
import json

def generar_json_electrodomesticos():
    """
    Lee los datos de los electrodomésticos desde los archivos de origen (Excel y JSON de categorías),
    los procesa y genera un archivo JSON estático con la lista completa y categorizada.
    """
    # --- 1. Determinar la ruta de los archivos de origen ---

    # El script asume que se ejecuta desde la raíz del proyecto.
    base_dir = os.getcwd() # Asumimos que es la raíz del proyecto
    excel_file_path = os.path.join(base_dir, 'backend', 'Calculador Solar - web 06-24_con ayuda - modificaciones 2025_5.xlsx')
    category_json_path = os.path.join(base_dir, 'consumos_electrodomesticos.json')
    # El archivo de salida irá a una carpeta 'public' en la raíz para que el frontend lo pueda acceder fácilmente.
    output_json_path = os.path.join(base_dir, 'public', 'electrodomesticos.json')

    print(f"Ruta del archivo Excel: {excel_file_path}")
    print(f"Ruta del JSON de categorías: {category_json_path}")
    print(f"Ruta del JSON de salida: {output_json_path}")

    # --- 2. Cargar el mapeo de categorías desde consumos_electrodomesticos.json ---
    appliance_to_category_map = {}
    try:
        with open(category_json_path, 'r', encoding='utf-8') as f:
            consumos_data = json.load(f)
        for category, items in consumos_data.items():
            for item_detail in items:
                appliance_name = item_detail.get('name')
                if appliance_name:
                    appliance_to_category_map[appliance_name.strip().lower()] = category
        print(f"Se cargaron {len(appliance_to_category_map)} mapeos de categorías desde '{os.path.basename(category_json_path)}'.")
    except FileNotFoundError:
        print(f"ERROR: No se encontró el archivo de categorías en '{category_json_path}'. No se podrá categorizar.")
    except Exception as e:
        print(f"ERROR al leer el archivo de categorías: {e}")

    # --- 3. Leer los datos de electrodomésticos del archivo Excel ---
    try:
        df_tablas = pd.read_excel(excel_file_path, sheet_name='Tablas', engine='openpyxl', decimal=',')
        print(f"Se leyó correctamente la hoja 'Tablas' del archivo Excel.")

        col_nombre_idx = 0
        col_consumo_idx = 1
        col_watts_idx = 2
        fila_inicio_idx = 110

        categorized_appliances = {}
        max_filas_df = df_tablas.shape[0]

        for r_idx in range(fila_inicio_idx, max_filas_df):
            nombre = df_tablas.iloc[r_idx, col_nombre_idx]
            if pd.isna(nombre) or str(nombre).strip() == "":
                print(f"Se encontró una fila vacía en la fila {r_idx + 1}. Se asume el fin de la lista.")
                break

            consumo_kwh = df_tablas.iloc[r_idx, col_consumo_idx]
            watts_val = df_tablas.iloc[r_idx, col_watts_idx]

            consumo_kwh_float = 0.0
            try:
                if not pd.isna(consumo_kwh):
                    consumo_kwh_float = float(consumo_kwh)
            except (ValueError, TypeError):
                print(f"ADVERTENCIA: No se pudo convertir el consumo '{consumo_kwh}' a número para '{nombre}'. Se usará 0.")

            watts_float = 0.0
            try:
                if not pd.isna(watts_val):
                    watts_float = float(str(watts_val).replace(',', '.'))
            except (ValueError, TypeError):
                print(f"ADVERTENCIA: No se pudo convertir los watts '{watts_val}' a número para '{nombre}'. Se usará 0.")

            # Lógica de categorización
            appliance_name_lower = str(nombre).strip().lower()
            category = appliance_to_category_map.get(appliance_name_lower, "Artículos del Hogar")

            appliance_entry = {
                "name": str(nombre).strip(),
                "consumo_diario_kwh": consumo_kwh_float,
                "watts": watts_float
            }

            if category not in categorized_appliances:
                categorized_appliances[category] = []
            categorized_appliances[category].append(appliance_entry)

        total_read = sum(len(v) for v in categorized_appliances.values())
        print(f"Se leyeron y procesaron un total de {total_read} electrodomésticos.")

        # --- 4. Escribir el resultado en el archivo JSON de salida ---

        # Asegurarse de que el directorio de salida exista
        os.makedirs(os.path.dirname(output_json_path), exist_ok=True)

        # El objeto a guardar es el diccionario de categorías directamente.
        output_data = {"categorias": categorized_appliances}

        with open(output_json_path, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)

        print(f"¡Éxito! Se ha generado el archivo '{output_json_path}' con {total_read} electrodomésticos.")

    except FileNotFoundError:
        print(f"ERROR CRÍTICO: No se encontró el archivo Excel en '{excel_file_path}'. No se generó el archivo JSON.")
    except Exception as e:
        print(f"ERROR INESPERADO al procesar el archivo Excel o generar el JSON: {e}")
        import traceback
        print(traceback.format_exc())

if __name__ == '__main__':
    print("Iniciando script para generar el archivo JSON de electrodomésticos...")
    generar_json_electrodomesticos()
    print("Script finalizado.")

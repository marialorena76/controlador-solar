# backend.py
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import pandas as pd
import os
import json # Added import

app = Flask(__name__)
CORS(app) # Habilita CORS para permitir solicitudes desde el frontend

# Ruta donde estará tu archivo Excel en el servidor
EXCEL_FILE_PATH = 'Calculador Solar - web 06-24_con ayuda - modificaciones 2025_5.xlsx'

# --- NUEVA RUTA: Para obtener la lista de electrodomésticos y sus consumos ---
@app.route('/api/electrodomesticos', methods=['GET'])
def get_electrodomesticos_consumos():
    try:
        # Load consumos_electrodomesticos.json for category mapping
        appliance_to_category_map = {}
        try:
            # Path relative to backend.py if consumos_electrodomesticos.json is in the project root
            # app.root_path is the 'backend' directory in this structure.
            # os.path.dirname(app.root_path) gives the project root directory.
            json_file_path = os.path.join(os.path.dirname(app.root_path), 'consumos_electrodomesticos.json')

            print(f"DEBUG: Attempting to load JSON from: {json_file_path}")
            if not os.path.exists(json_file_path):
                print(f"ERROR: consumos_electrodomesticos.json not found at {json_file_path}")
                # Fallback: try direct name if relative path fails (e.g. if backend.py is run from root)
                # This is less likely given app.root_path but good for robustness during dev
                json_file_path_alt = 'consumos_electrodomesticos.json'
                if os.path.exists(json_file_path_alt):
                    json_file_path = json_file_path_alt
                    print(f"DEBUG: Found JSON at alternate path: {json_file_path}")
                else: # Try one level up from script __file__ as a common alternative
                    current_script_dir = os.path.dirname(__file__)
                    json_file_path_alt_2 = os.path.abspath(os.path.join(current_script_dir, '..', 'consumos_electrodomesticos.json'))
                    if os.path.exists(json_file_path_alt_2):
                         json_file_path = json_file_path_alt_2
                         print(f"DEBUG: Found JSON at path relative to script: {json_file_path}")
                    else:
                        print(f"ERROR: consumos_electrodomesticos.json also not found at {json_file_path_alt} or {json_file_path_alt_2}")
                        raise FileNotFoundError("consumos_electrodomesticos.json not found at primary or alternate paths.")

            with open(json_file_path, 'r', encoding='utf-8') as f:
                consumos_data = json.load(f) # This should be the root object (dictionary of categories)
            for category, items in consumos_data.items(): # Iterate through categories (e.g., "Cocina", "Iluminación")
                for item_detail in items: # Iterate through appliances in that category
                    appliance_name = item_detail.get('name')
                    if appliance_name: # Ensure 'name' key exists
                        appliance_to_category_map[appliance_name.strip().lower()] = category
            print(f"DEBUG: Loaded {len(appliance_to_category_map)} mappings from consumos_electrodomesticos.json")
        except FileNotFoundError:
            print(f"ERROR: consumos_electrodomesticos.json not found. Proceeding without categorization from JSON.")
        except json.JSONDecodeError as je:
            print(f"ERROR: Failed to decode consumos_electrodomesticos.json: {je}. Proceeding without categorization.")
        except Exception as e:
            print(f"ERROR: Unexpected error loading consumos_electrodomesticos.json: {e}. Proceeding without categorization.")

        print(f"DEBUG: Solicitud a /api/electrodomesticos. Leyendo de HOJA 'Tablas' desde: {EXCEL_FILE_PATH}")
        df_tablas = pd.read_excel(EXCEL_FILE_PATH, sheet_name='Tablas', engine='openpyxl', decimal=',')
        print("DEBUG: Hoja 'Tablas' leída para electrodomésticos.")

        col_nombre_idx = 0  # Columna A
        col_consumo_idx = 1 # Columna B
        col_watts_idx = 2   # Columna C (Potencia en Watts)
        fila_inicio_idx = 110 # Fila 111 en Excel (111 - 1)
        fila_fin_idx = 173  # Fila 174 en Excel (174 - 1)

        # electrodomesticos_lista = [] # Old list
        categorized_appliances = {} # New categorized dictionary
        max_filas_df = df_tablas.shape[0]

        for r_idx in range(fila_inicio_idx, fila_fin_idx + 1):
            if r_idx >= max_filas_df:
                print(f"WARN: Fila {r_idx+1} fuera de límites (hoja 'Tablas' tiene {max_filas_df} filas). Lectura detenida.")
                break
            if col_nombre_idx >= df_tablas.shape[1] or \
               col_consumo_idx >= df_tablas.shape[1] or \
               col_watts_idx >= df_tablas.shape[1]:
                print(f"WARN: Columna para nombre/consumo/watts fuera de límites (hoja 'Tablas' tiene {df_tablas.shape[1]} columnas).")
                break

            nombre = df_tablas.iloc[r_idx, col_nombre_idx]
            consumo_kwh = df_tablas.iloc[r_idx, col_consumo_idx]
            watts_val = df_tablas.iloc[r_idx, col_watts_idx]

            if pd.isna(nombre) or str(nombre).strip() == "":
                print(f"DEBUG: Fila {r_idx+1} omitida por nombre NaN o vacío.")
                continue

            consumo_kwh_float = 0.0
            if pd.isna(consumo_kwh):
                print(f"DEBUG: Consumo NaN para '{nombre}' en fila {r_idx+1}, usando 0.")
            else:
                try:
                    consumo_kwh_float = float(consumo_kwh)
                except ValueError:
                    print(f"WARN: No se pudo convertir consumo '{consumo_kwh}' a float para '{nombre}'. Usando 0.")

            watts_float = 0.0
            if pd.isna(watts_val):
                print(f"DEBUG: Watts NaN para '{nombre}' en fila {r_idx+1}, usando 0.0.")
            else:
                try:
                    watts_float = float(str(watts_val).replace(',', '.'))
                except ValueError:
                    print(f"WARN: No se pudo convertir watts '{watts_val}' a float para '{nombre}'. Usando 0.0.")

            # Categorization logic
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

        print(f"DEBUG: Total electrodomésticos (con watts) leídos y categorizados de 'Tablas' A{fila_inicio_idx+1}:C{fila_fin_idx+1}: {sum(len(v) for v in categorized_appliances.values())}")
        # categorias_respuesta = {"Electrodomésticos Disponibles": electrodomesticos_lista} # Old
        categorias_respuesta = categorized_appliances # New: directly use the categorized dictionary

        return jsonify({"categorias": categorias_respuesta})

    except FileNotFoundError:
        print(f"ERROR en /api/electrodomesticos: Archivo Excel no encontrado: {EXCEL_FILE_PATH}")
        return jsonify({"error": "Archivo Excel no encontrado."}), 404
    except KeyError as e:
        print(f"ERROR en /api/electrodomesticos: Hoja 'Tablas' no encontrada?: {e}")
        return jsonify({"error": f"Error de clave (¿nombre de hoja?): {e}"}), 500
    except IndexError as e:
        print(f"ERROR en /api/electrodomesticos: Rango celdas fuera de límites: {e}")
        return jsonify({"error": f"Rango celdas fuera de límites: {e}"}), 500
    except Exception as e:
        import traceback
        print(f"ERROR GENERAL en /api/electrodomesticos: {e}")
        print(traceback.format_exc())
        return jsonify({"error": f"Error interno del servidor: {str(e)}"}), 500

# --- Ruta para generar informe (EXISTENTE) ---
@app.route('/api/generar_informe', methods=['POST'])
def generar_informe():
    user_data = request.json
    print("DEBUG: Datos recibidos del frontend para informe:", user_data)

    if not user_data:
        return jsonify({"error": "No se recibieron datos"}), 400

    try:
        print(f"DEBUG: Leyendo Excel para informe: {EXCEL_FILE_PATH}")
        df_resultados = pd.read_excel(EXCEL_FILE_PATH, sheet_name='Resultados', engine='openpyxl', decimal=',')
        print("DEBUG: Hoja 'Resultados' leída.")
        df_area_trabajo = pd.read_excel(EXCEL_FILE_PATH, sheet_name='Area de trabajo', engine='openpyxl', decimal=',')
        print("DEBUG: Hoja 'Area de trabajo' leída.")

        # Acceder a los datos de electrodomésticos y consumo total
        electrodomesticos_seleccionados = user_data.get('electrodomesticos', {})
        consumo_mensual_kwh = user_data.get('totalMonthlyConsumption', 0)
        consumo_anual_kwh = user_data.get('totalAnnualConsumption', 0)
        latitud = user_data.get('location', {}).get('lat', -34.6037) # Valor por defecto si no se encuentra
        longitud = user_data.get('location', {}).get('lng', -58.3816) # Valor por defecto

        print(f"DEBUG: Electrodomésticos seleccionados (para informe): {electrodomesticos_seleccionados}")
        print(f"DEBUG: Consumo mensual estimado (kWh, para informe): {consumo_mensual_kwh}")
        print(f"DEBUG: Consumo anual estimado (kWh, para informe): {consumo_anual_kwh}")
        print(f"DEBUG: Latitud: {latitud}, Longitud: {longitud}")

        # Aquí es donde integrarías el consumo_mensual_kwh en tus cálculos para el informe
        # Ejemplo (muy simplificado, ajusta según tu lógica del Excel):
        # Necesitarás una lógica para mapear este consumo a la potencia del sistema o a los datos de las tablas.

        # Suponiendo que tu hoja 'Resultados' tiene alguna lógica basada en el consumo anual
        # Buscar la fila que corresponde al consumo anual o interpolar.
        # Esto es un placeholder; la lógica real dependerá de cómo tu Excel calcula los resultados.
        # Ejemplo simplificado de cómo podrías buscar un valor en el Excel:
        # Potencia nominal del sistema (kWp) - EJEMPLO DE CÓMO OBTENER UN DATO
        # Esta es la parte CLAVE donde tienes que vincular el consumo_anual_kwh
        # con los datos de tu Excel para obtener la potencia del sistema o el dimensionamiento.

        # Asumo que en la hoja 'Resultados' o 'Area de trabajo' tienes tablas para dimensionar.
        # Por ejemplo, si tienes una tabla que relaciona kWh/año con kWp necesarios:
        # df_dimensionamiento = df_area_trabajo[['Consumo Anual (kWh)', 'Potencia Sistema (kWp)']] # Nombres de columnas de tu Excel
        # potencia_sistema_kwp = df_dimensionamiento.loc[df_dimensionamiento['Consumo Anual (kWh)'] >= consumo_anual_kwh, 'Potencia Sistema (kWp)'].min()
        # if pd.isna(potencia_sistema_kwp):
        #     potencia_sistema_kwp = df_dimensionamiento['Potencia Sistema (kWp)'].max() # O un valor por defecto / error

        # Datos de ejemplo para el informe (AJUSTA ESTO CON TUS CÁLCULOS REALES)
        informe_final = {
            "potencia_sistema_kwp": 0, # <-- Debes calcular esto
            "energia_generada_anual": consumo_anual_kwh, # <-- Esto viene del frontend
            "area_paneles_m2": 0, # <-- Debes calcular esto
            "numero_paneles": 0, # <-- Debes calcular esto
            "tipo_inversor": user_data.get('inversor', {}).get('tipo', 'No Definido'),
            "potencia_inversor_kwa": user_data.get('inversor', {}).get('potenciaNominal', 0),
            "costo_actual": 0, # <-- Debes calcular esto
            "inversion_inicial": 0, # <-- Debes calcular esto
            "mantenimiento": 0, # <-- Debes calcular esto
            "costo_futuro": 0, # <-- Debes calcular esto
            "ingreso_red": 0, # <-- Debes calcular esto
            "resumen_economico": "Cálculo pendiente...", # <-- Debes generar un resumen
            "emisiones": 0, # <-- Debes calcular esto
            "moneda": user_data.get('selectedCurrency', 'Pesos argentinos')
        }

        # Ejemplo de cómo podrías obtener un valor de una celda específica (ej. A2 de la hoja Resultados)
        # Esto es solo un ejemplo, no copies y pegues sin entender su uso.
        # dato_ejemplo = df_resultados.iloc[1, 0] # Fila 2, Columna A

        # Asumo que la hoja 'Resultados' ya tiene los cálculos listos y solo necesitas
        # obtener los valores de celdas específicas después de algún tipo de "lookup"
        # o "simulación" que el Excel haría internamente.

        # Dada la estructura de tu Excel y la descripción, parece que necesitas
        # buscar los resultados finales en la hoja 'Resultados' o 'Area de trabajo'
        # basándose en el 'consumo_anual_kwh' y otros parámetros del usuario.

        # Aquí deberías implementar la lógica para leer las celdas adecuadas del Excel
        # que contienen los resultados finales (potencia del sistema, costos, etc.)
        # basándote en los datos recibidos del frontend (especialmente el consumo).

        # Placeholder: Rellenar con lógica real de Excel
        # Por ejemplo, si tienes una celda en 'Resultados' que te da la potencia en base al consumo:
        # informe_final['potencia_sistema_kwp'] = df_resultados.loc[df_resultados['columna_consumo'] >= consumo_anual_kwh, 'columna_potencia'].iloc[0]
        # o simplemente leer celdas fijas si tu Excel ya hace el cálculo complejo.

        # SI TU EXCEL YA TIENE TODA LA LÓGICA DE CÁLCULO
        # Y SÓLO NECESITAS BUSCAR VALORES EN CELDAS ESPECÍFICAS BASADO EN LA ENTRADA:
        # Tendrías que saber qué celdas leer y cómo se relacionan con los inputs.
        # Por ejemplo:
        # informe_final['potencia_sistema_kwp'] = df_resultados.at[fila_potencia, columna_potencia]
        # Esto es complejo sin saber la estructura exacta de tu Excel.
        # Por ahora, los valores del informe final serán 0 o N/A hasta que implementes la lectura del Excel.

        print(f"DEBUG: informe_final (simplificado) a punto de ser enviado: {informe_final}")
        return jsonify(informe_final)

    except FileNotFoundError:
        print(f"ERROR CRITICO: Archivo Excel NO ENCONTRADO: {EXCEL_FILE_PATH}")
        return jsonify({"error": "Archivo Excel no encontrado."}), 500
    except KeyError as e:
        print(f"Error de KeyError en backend (nombre de hoja?): {e}")
        return jsonify({"error": f"Error al leer hoja Excel: {e}. Asegúrese de que las hojas 'Resultados' y 'Area de trabajo' existan y las columnas sean correctas."}), 500
    except Exception as e:
        import traceback
        print(f"ERROR GENERAL en backend (generar_informe): {e}")
        print(traceback.format_exc())
        return jsonify({"error": f"Error interno del servidor al generar informe: {str(e)}"}), 500

# Opcional: Rutas para servir los archivos estáticos de tu frontend
@app.route('/')
def serve_calculador_html():
    return send_from_directory('.', 'calculador.html')

@app.route('/<path:path>')
def serve_static_files(path):
    # Asegúrate de que los archivos estén en la misma carpeta que 'backend.py'
    return send_from_directory('.', path)


# --- NUEVA RUTA: Para obtener opciones de superficie de instalación ---
@app.route('/api/superficie_options', methods=['GET'])
def get_superficie_options():
    try:
        print(f"DEBUG: Solicitud a /api/superficie_options. Leyendo de HOJA 'Tablas' desde: {EXCEL_FILE_PATH}")
        # Usamos decimal=',' por si los números en la hoja 'Tablas' usan coma decimal.
        # Si esta parte específica de la hoja usa punto decimal, se puede omitir.
        df_tablas = pd.read_excel(EXCEL_FILE_PATH, sheet_name='Tablas', engine='openpyxl', decimal=',')
        print("DEBUG: Hoja 'Tablas' leída para opciones de superficie.")

        # Column M (descripción) es índice 12, Column N (valor) es índice 13
        col_desc_idx = 12
        col_valor_idx = 13
        # Filas 58 a 79 en Excel son iloc 57 a 78 (porque iloc es [start, end-1] para end)
        # Para incluir la fila 79 (índice 78), el rango de iloc debe ir hasta 79.
        fila_inicio_idx = 57 # Fila 58 en Excel
        fila_fin_idx = 78    # Fila 79 en Excel

        superficie_options_lista = []
        max_filas_df = df_tablas.shape[0]
        max_cols_df = df_tablas.shape[1]

        if col_desc_idx >= max_cols_df or col_valor_idx >= max_cols_df:
            print(f"WARN: Columnas M ({col_desc_idx}) o N ({col_valor_idx}) fuera de límites (hoja 'Tablas' tiene {max_cols_df} columnas).")
            return jsonify({"error": "Definición de columnas fuera de los límites de la hoja."}), 500

        for r_idx in range(fila_inicio_idx, fila_fin_idx + 1): # +1 para incluir fila_fin_idx
            if r_idx >= max_filas_df:
                print(f"WARN: Fila {r_idx+1} fuera de límites (hoja 'Tablas' tiene {max_filas_df} filas). Lectura de opciones de superficie detenida.")
                break

            descripcion = df_tablas.iloc[r_idx, col_desc_idx]
            valor = df_tablas.iloc[r_idx, col_valor_idx]

            if pd.isna(descripcion) or str(descripcion).strip() == "":
                print(f"DEBUG: Fila {r_idx+1} omitida por descripción NaN o vacía para opciones de superficie.")
                continue

            valor_float = 0.0
            if pd.isna(valor):
                print(f"DEBUG: Valor NaN para superficie '{descripcion}' en fila {r_idx+1}, usando 0.0.")
            else:
                try:
                    # Si decimal=',' ya manejó la coma, esto debería ser directo.
                    # Si no, y los números pueden tener comas, necesitaríamos: str(valor).replace(',', '.')
                    valor_float = float(valor)
                except ValueError:
                    print(f"WARN: No se pudo convertir valor de superficie '{valor}' a float para '{descripcion}'. Usando 0.0.")

            superficie_options_lista.append({
                "descripcion": str(descripcion),
                "valor": valor_float
            })

        print(f"DEBUG: Total opciones de superficie leídas de 'Tablas' M{fila_inicio_idx+1}:N{fila_fin_idx+1}: {len(superficie_options_lista)}")
        return jsonify(superficie_options_lista)

    except FileNotFoundError:
        print(f"ERROR en /api/superficie_options: Archivo Excel no encontrado: {EXCEL_FILE_PATH}")
        return jsonify({"error": "Archivo Excel de configuración no encontrado."}), 404
    except KeyError as e:
        # Esto podría ocurrir si 'Tablas' no existe, o si las columnas M/N no existen (aunque ya chequeamos índices).
        print(f"ERROR en /api/superficie_options: Hoja 'Tablas' o columnas M/N no encontradas? Error: {e}")
        return jsonify({"error": f"Error de clave al leer la hoja de cálculo (¿nombre de hoja o columna incorrecto?): {e}"}), 500
    except IndexError as e:
        # Esto podría ocurrir si el rango de filas/columnas es incorrecto a pesar de las verificaciones.
        print(f"ERROR en /api/superficie_options: Rango de celdas fuera de límites: {e}")
        return jsonify({"error": f"Error de índice, rango de celdas fuera de límites: {e}"}), 500
    except Exception as e:
        import traceback
        print(f"ERROR GENERAL en /api/superficie_options: {e}")
        print(traceback.format_exc())
        return jsonify({"error": f"Error interno del servidor al obtener opciones de superficie: {str(e)}"}), 500


# --- NUEVA RUTA: Para obtener opciones de rugosidad ---
@app.route('/api/rugosidad_options', methods=['GET'])
def get_rugosidad_options():
    try:
        print(f"DEBUG: Solicitud a /api/rugosidad_options. Leyendo de HOJA 'Tablas' desde: {EXCEL_FILE_PATH}")
        df_tablas = pd.read_excel(EXCEL_FILE_PATH, sheet_name='Tablas', engine='openpyxl', decimal=',')
        print("DEBUG: Hoja 'Tablas' leída para opciones de rugosidad.")

        col_desc_idx = 12  # Columna M
        col_valor_idx = 13 # Columna N
        # Filas Excel 82 a 86 -> iloc 81 a 85
        fila_inicio_idx = 81 # Fila 82 en Excel
        fila_fin_idx = 85    # Fila 86 en Excel

        rugosidad_options_lista = []
        max_filas_df = df_tablas.shape[0]
        max_cols_df = df_tablas.shape[1]

        # Validar que las columnas existan en el DataFrame
        if col_desc_idx >= max_cols_df or col_valor_idx >= max_cols_df:
            print(f"WARN: Columnas M ({col_desc_idx}) o N ({col_valor_idx}) fuera de límites (hoja 'Tablas' tiene {max_cols_df} columnas).")
            return jsonify({"error": "Definición de columnas para rugosidad fuera de los límites de la hoja."}), 500

        for r_idx in range(fila_inicio_idx, fila_fin_idx + 1): # +1 para incluir fila_fin_idx
            # Validar que la fila exista
            if r_idx >= max_filas_df:
                print(f"WARN: Fila {r_idx+1} para rugosidad fuera de límites (hoja 'Tablas' tiene {max_filas_df} filas). Lectura detenida.")
                break

            descripcion = df_tablas.iloc[r_idx, col_desc_idx]
            valor = df_tablas.iloc[r_idx, col_valor_idx]

            if pd.isna(descripcion) or str(descripcion).strip() == "":
                print(f"DEBUG: Fila {r_idx+1} omitida por descripción NaN o vacía para opciones de rugosidad.")
                continue

            valor_float = 0.0
            if pd.isna(valor):
                print(f"DEBUG: Valor NaN para rugosidad '{descripcion}' en fila {r_idx+1}, usando 0.0.")
            else:
                try:
                    valor_float = float(valor)
                except ValueError:
                    print(f"WARN: No se pudo convertir valor de rugosidad '{valor}' a float para '{descripcion}'. Usando 0.0.")

            rugosidad_options_lista.append({
                "descripcion": str(descripcion),
                "valor": valor_float
            })

        print(f"DEBUG: Total opciones de rugosidad leídas de 'Tablas' M{fila_inicio_idx+1}:N{fila_fin_idx+1}: {len(rugosidad_options_lista)}")
        return jsonify(rugosidad_options_lista)

    except FileNotFoundError:
        print(f"ERROR en /api/rugosidad_options: Archivo Excel no encontrado: {EXCEL_FILE_PATH}")
        return jsonify({"error": "Archivo Excel de configuración no encontrado."}), 404
    except KeyError as e:
        print(f"ERROR en /api/rugosidad_options: Hoja 'Tablas' o columnas M/N no encontradas? Error: {e}")
        return jsonify({"error": f"Error de clave al leer la hoja de cálculo para rugosidad (¿nombre de hoja o columna incorrecto?): {e}"}), 500
    except IndexError as e:
        print(f"ERROR en /api/rugosidad_options: Rango de celdas fuera de límites para rugosidad: {e}")
        return jsonify({"error": f"Error de índice, rango de celdas fuera de límites para rugosidad: {e}"}), 500
    except Exception as e:
        import traceback
        print(f"ERROR GENERAL en /api/rugosidad_options: {e}")
        print(traceback.format_exc())
        return jsonify({"error": f"Error interno del servidor al obtener opciones de rugosidad: {str(e)}"}), 500


# --- NUEVA RUTA: Para obtener opciones de rotación ---
@app.route('/api/rotacion_options', methods=['GET'])
def get_rotacion_options():
    try:
        print(f"DEBUG: Solicitud a /api/rotacion_options. Leyendo de HOJA 'Tablas' desde: {EXCEL_FILE_PATH}")
        df_tablas = pd.read_excel(EXCEL_FILE_PATH, sheet_name='Tablas', engine='openpyxl', decimal=',')
        print("DEBUG: Hoja 'Tablas' leída para opciones de rotación.")

        col_desc_idx = 15  # Columna P
        col_valor_idx = 16 # Columna Q
        # Filas Excel 96 a 103 -> iloc 95 a 102
        fila_inicio_idx = 95 # Fila 96 en Excel
        fila_fin_idx = 102   # Fila 103 en Excel

        rotacion_options_lista = []
        max_filas_df = df_tablas.shape[0]
        max_cols_df = df_tablas.shape[1]

        if col_desc_idx >= max_cols_df or col_valor_idx >= max_cols_df:
            print(f"WARN: Columnas P ({col_desc_idx}) o Q ({col_valor_idx}) fuera de límites (hoja 'Tablas' tiene {max_cols_df} columnas).")
            return jsonify({"error": "Definición de columnas para rotación fuera de los límites de la hoja."}), 500

        for r_idx in range(fila_inicio_idx, fila_fin_idx + 1): # +1 para incluir fila_fin_idx
            if r_idx >= max_filas_df:
                print(f"WARN: Fila {r_idx+1} para rotación fuera de límites (hoja 'Tablas' tiene {max_filas_df} filas). Lectura detenida.")
                break

            descripcion = df_tablas.iloc[r_idx, col_desc_idx]
            valor = df_tablas.iloc[r_idx, col_valor_idx]

            if pd.isna(descripcion) or str(descripcion).strip() == "":
                print(f"DEBUG: Fila {r_idx+1} omitida por descripción NaN o vacía para opciones de rotación.")
                continue

            valor_float = 0.0
            if pd.isna(valor):
                print(f"DEBUG: Valor NaN para rotación '{descripcion}' en fila {r_idx+1}, usando 0.0.")
            else:
                try:
                    valor_float = float(valor)
                except ValueError:
                    print(f"WARN: No se pudo convertir valor de rotación '{valor}' a float para '{descripcion}'. Usando 0.0.")

            rotacion_options_lista.append({
                "descripcion": str(descripcion),
                "valor": valor_float
            })

        print(f"DEBUG: Total opciones de rotación leídas de 'Tablas' P{fila_inicio_idx+1}:Q{fila_fin_idx+1}: {len(rotacion_options_lista)}")
        return jsonify(rotacion_options_lista)

    except FileNotFoundError:
        print(f"ERROR en /api/rotacion_options: Archivo Excel no encontrado: {EXCEL_FILE_PATH}")
        return jsonify({"error": "Archivo Excel de configuración no encontrado."}), 404
    except KeyError as e:
        print(f"ERROR en /api/rotacion_options: Hoja 'Tablas' o columnas P/Q no encontradas? Error: {e}")
        return jsonify({"error": f"Error de clave al leer la hoja de cálculo para rotación (¿nombre de hoja o columna incorrecto?): {e}"}), 500
    except IndexError as e:
        print(f"ERROR en /api/rotacion_options: Rango de celdas fuera de límites para rotación: {e}")
        return jsonify({"error": f"Error de índice, rango de celdas fuera de límites para rotación: {e}"}), 500
    except Exception as e:
        import traceback
        print(f"ERROR GENERAL en /api/rotacion_options: {e}")
        print(traceback.format_exc())
        return jsonify({"error": f"Error interno del servidor al obtener opciones de rotación: {str(e)}"}), 500


# --- NUEVA RUTA: Para obtener opciones de Método de Cálculo ---
@app.route('/api/metodo_calculo_options', methods=['GET'])
def get_metodo_calculo_options():
    try:
        print(f"DEBUG: Solicitud a /api/metodo_calculo_options. Leyendo de HOJA 'Tablas' desde: {EXCEL_FILE_PATH}")
        # decimal=',' might not be strictly necessary if column I is purely text, but harmless.
        df_tablas = pd.read_excel(EXCEL_FILE_PATH, sheet_name='Tablas', engine='openpyxl')
        print("DEBUG: Hoja 'Tablas' leída para opciones de método de cálculo.")

        col_idx = 8  # Columna I
        # Filas Excel 18 a 19 -> iloc 17 a 18
        fila_inicio_idx = 17 # Fila 18 en Excel
        fila_fin_idx = 18    # Fila 19 en Excel

        metodo_options_lista = []
        max_filas_df = df_tablas.shape[0]
        max_cols_df = df_tablas.shape[1]

        if col_idx >= max_cols_df:
            print(f"WARN: Columna I ({col_idx}) fuera de límites (hoja 'Tablas' tiene {max_cols_df} columnas).")
            return jsonify({"error": "Definición de columna para método de cálculo fuera de los límites de la hoja."}), 500

        for r_idx in range(fila_inicio_idx, fila_fin_idx + 1): # +1 para incluir fila_fin_idx
            if r_idx >= max_filas_df:
                print(f"WARN: Fila {r_idx+1} para método de cálculo fuera de límites (hoja 'Tablas' tiene {max_filas_df} filas). Lectura detenida.")
                break

            valor_celda = df_tablas.iloc[r_idx, col_idx]

            if pd.isna(valor_celda) or str(valor_celda).strip() == "":
                print(f"DEBUG: Fila {r_idx+1}, Columna I omitida por valor NaN o vacío para método de cálculo.")
                continue

            metodo_options_lista.append(str(valor_celda).strip())

        print(f"DEBUG: Total opciones de método de cálculo leídas de 'Tablas' I{fila_inicio_idx+1}:I{fila_fin_idx+1}: {len(metodo_options_lista)}")
        return jsonify(metodo_options_lista)

    except FileNotFoundError:
        print(f"ERROR en /api/metodo_calculo_options: Archivo Excel no encontrado: {EXCEL_FILE_PATH}")
        return jsonify({"error": "Archivo Excel de configuración no encontrado."}), 404
    except KeyError as e:
        print(f"ERROR en /api/metodo_calculo_options: Hoja 'Tablas' o columna I no encontrada? Error: {e}")
        return jsonify({"error": f"Error de clave al leer la hoja de cálculo para método de cálculo (¿nombre de hoja o columna incorrecto?): {e}"}), 500
    except IndexError as e:
        print(f"ERROR en /api/metodo_calculo_options: Rango de celdas fuera de límites para método de cálculo: {e}")
        return jsonify({"error": f"Error de índice, rango de celdas fuera de límites para método de cálculo: {e}"}), 500
    except Exception as e:
        import traceback
        print(f"ERROR GENERAL en /api/metodo_calculo_options: {e}")
        print(traceback.format_exc())
        return jsonify({"error": f"Error interno del servidor al obtener opciones de método de cálculo: {str(e)}"}), 500


# --- NUEVA RUTA: Para obtener opciones de Modelo del Método ---
@app.route('/api/modelo_metodo_options', methods=['GET'])
def get_modelo_metodo_options():
    try:
        print(f"DEBUG: Solicitud a /api/modelo_metodo_options. Leyendo de HOJA 'Tablas' desde: {EXCEL_FILE_PATH}")
        df_tablas = pd.read_excel(EXCEL_FILE_PATH, sheet_name='Tablas', engine='openpyxl')
        print("DEBUG: Hoja 'Tablas' leída para opciones de modelo del método.")

        col_idx = 8  # Columna I
        # Filas Excel 20 a 23 -> iloc 19 a 22
        fila_inicio_idx = 19 # Fila 20 en Excel
        fila_fin_idx = 22    # Fila 23 en Excel

        modelo_options_lista = []
        max_filas_df = df_tablas.shape[0]
        max_cols_df = df_tablas.shape[1]

        if col_idx >= max_cols_df:
            print(f"WARN: Columna I ({col_idx}) fuera de límites para modelo del método (hoja 'Tablas' tiene {max_cols_df} columnas).")
            return jsonify({"error": "Definición de columna para modelo del método fuera de los límites de la hoja."}), 500

        for r_idx in range(fila_inicio_idx, fila_fin_idx + 1): # +1 para incluir fila_fin_idx
            if r_idx >= max_filas_df:
                print(f"WARN: Fila {r_idx+1} para modelo del método fuera de límites (hoja 'Tablas' tiene {max_filas_df} filas). Lectura detenida.")
                break

            valor_celda = df_tablas.iloc[r_idx, col_idx]

            if pd.isna(valor_celda) or str(valor_celda).strip() == "":
                print(f"DEBUG: Fila {r_idx+1}, Columna I omitida por valor NaN o vacío para modelo del método.")
                continue

            modelo_options_lista.append(str(valor_celda).strip())

        print(f"DEBUG: Total opciones de modelo del método leídas de 'Tablas' I{fila_inicio_idx+1}:I{fila_fin_idx+1}: {len(modelo_options_lista)}")
        return jsonify(modelo_options_lista)

    except FileNotFoundError:
        print(f"ERROR en /api/modelo_metodo_options: Archivo Excel no encontrado: {EXCEL_FILE_PATH}")
        return jsonify({"error": "Archivo Excel de configuración no encontrado."}), 404
    except KeyError as e:
        print(f"ERROR en /api/modelo_metodo_options: Hoja 'Tablas' o columna I no encontrada? Error: {e}")
        return jsonify({"error": f"Error de clave al leer la hoja de cálculo para modelo del método: {e}"}), 500
    except IndexError as e:
        print(f"ERROR en /api/modelo_metodo_options: Rango de celdas fuera de límites para modelo del método: {e}")
        return jsonify({"error": f"Error de índice, rango de celdas fuera de límites para modelo del método: {e}"}), 500
    except Exception as e:
        import traceback
        print(f"ERROR GENERAL en /api/modelo_metodo_options: {e}")
        print(traceback.format_exc())
        return jsonify({"error": f"Error interno del servidor al obtener opciones de modelo del método: {str(e)}"}), 500


# --- NUEVA RUTA: Para obtener opciones de Marca Panel ---
@app.route('/api/marca_panel_options', methods=['GET'])
def get_marca_panel_options():
    try:
        print(f"DEBUG: Solicitud a /api/marca_panel_options. Leyendo de HOJA 'Tablas' desde: {EXCEL_FILE_PATH}")
        df_tablas = pd.read_excel(EXCEL_FILE_PATH, sheet_name='Tablas', engine='openpyxl')
        print("DEBUG: Hoja 'Tablas' leída para opciones de marca de panel.")

        col_idx = 8  # Columna I
        # Filas Excel 38 a 42 -> iloc 37 a 41
        fila_inicio_idx = 37 # Fila 38 en Excel
        fila_fin_idx = 41    # Fila 42 en Excel

        options_lista = []
        max_filas_df = df_tablas.shape[0]
        max_cols_df = df_tablas.shape[1]

        if col_idx >= max_cols_df:
            print(f"WARN: Columna I ({col_idx}) fuera de límites para marca panel (hoja 'Tablas' tiene {max_cols_df} columnas).")
            return jsonify({"error": "Definición de columna para marca panel fuera de los límites de la hoja."}), 500

        for r_idx in range(fila_inicio_idx, fila_fin_idx + 1):
            if r_idx >= max_filas_df:
                print(f"WARN: Fila {r_idx+1} para marca panel fuera de límites (hoja 'Tablas' tiene {max_filas_df} filas). Lectura detenida.")
                break

            valor_celda = df_tablas.iloc[r_idx, col_idx]

            if pd.isna(valor_celda) or str(valor_celda).strip() == "":
                print(f"DEBUG: Fila {r_idx+1}, Columna I omitida por valor NaN o vacío para marca panel.")
                continue

            options_lista.append(str(valor_celda).strip())

        print(f"DEBUG: Total opciones de marca panel leídas de 'Tablas' I{fila_inicio_idx+1}:I{fila_fin_idx+1}: {len(options_lista)}")
        return jsonify(options_lista)

    except FileNotFoundError:
        print(f"ERROR en /api/marca_panel_options: Archivo Excel no encontrado: {EXCEL_FILE_PATH}")
        return jsonify({"error": "Archivo Excel de configuración no encontrado."}), 404
    except KeyError as e:
        print(f"ERROR en /api/marca_panel_options: Hoja 'Tablas' o columna I no encontrada? Error: {e}")
        return jsonify({"error": f"Error de clave al leer la hoja de cálculo para marca panel: {e}"}), 500
    except IndexError as e:
        print(f"ERROR en /api/marca_panel_options: Rango de celdas fuera de límites para marca panel: {e}")
        return jsonify({"error": f"Error de índice, rango de celdas fuera de límites para marca panel: {e}"}), 500
    except Exception as e:
        import traceback
        print(f"ERROR GENERAL en /api/marca_panel_options: {e}")
        print(traceback.format_exc())
        return jsonify({"error": f"Error interno del servidor al obtener opciones de marca panel: {str(e)}"}), 500

# --- NUEVA RUTA: Para obtener opciones de Modelo Temperatura Panel ---
@app.route('/api/modelo_temperatura_panel_options', methods=['GET'])
def get_modelo_temperatura_panel_options():
    try:
        print(f"DEBUG: Solicitud a /api/modelo_temperatura_panel_options. Leyendo de HOJA 'Tablas' desde: {EXCEL_FILE_PATH}")
        df_tablas = pd.read_excel(EXCEL_FILE_PATH, sheet_name='Tablas', engine='openpyxl')
        print("DEBUG: Hoja 'Tablas' leída para opciones de modelo temperatura panel.")

        col_idx = 8  # Columna I
        # Filas Excel 29 a 33 -> iloc 28 a 32
        fila_inicio_idx = 28 # Fila 29 en Excel
        fila_fin_idx = 32    # Fila 33 en Excel

        options_lista = []
        max_filas_df = df_tablas.shape[0]
        max_cols_df = df_tablas.shape[1]

        if col_idx >= max_cols_df:
            print(f"WARN: Columna I ({col_idx}) fuera de límites para modelo temperatura panel (hoja 'Tablas' tiene {max_cols_df} columnas).")
            return jsonify({"error": "Definición de columna para modelo temperatura panel fuera de los límites de la hoja."}), 500

        for r_idx in range(fila_inicio_idx, fila_fin_idx + 1):
            if r_idx >= max_filas_df:
                print(f"WARN: Fila {r_idx+1} para modelo temperatura panel fuera de límites (hoja 'Tablas' tiene {max_filas_df} filas). Lectura detenida.")
                break

            valor_celda = df_tablas.iloc[r_idx, col_idx]

            if pd.isna(valor_celda) or str(valor_celda).strip() == "":
                print(f"DEBUG: Fila {r_idx+1}, Columna I omitida por valor NaN o vacío para modelo temperatura panel.")
                continue

            options_lista.append(str(valor_celda).strip())

        print(f"DEBUG: Total opciones de modelo temperatura panel leídas de 'Tablas' I{fila_inicio_idx+1}:I{fila_fin_idx+1}: {len(options_lista)}")
        return jsonify(options_lista)

    except FileNotFoundError:
        print(f"ERROR en /api/modelo_temperatura_panel_options: Archivo Excel no encontrado: {EXCEL_FILE_PATH}")
        return jsonify({"error": "Archivo Excel de configuración no encontrado."}), 404
    except KeyError as e:
        print(f"ERROR en /api/modelo_temperatura_panel_options: Hoja 'Tablas' o columna I no encontrada? Error: {e}")
        return jsonify({"error": f"Error de clave al leer la hoja de cálculo para modelo temperatura panel: {e}"}), 500
    except IndexError as e:
        print(f"ERROR en /api/modelo_temperatura_panel_options: Rango de celdas fuera de límites para modelo temperatura panel: {e}")
        return jsonify({"error": f"Error de índice, rango de celdas fuera de límites para modelo temperatura panel: {e}"}), 500
    except Exception as e:
        import traceback
        print(f"ERROR GENERAL en /api/modelo_temperatura_panel_options: {e}")
        print(traceback.format_exc())
        return jsonify({"error": f"Error interno del servidor al obtener opciones de modelo temperatura panel: {str(e)}"}), 500


# --- NUEVA RUTA: Para obtener opciones de Frecuencia de Lluvias ---
@app.route('/api/frecuencia_lluvias_options', methods=['GET'])
def get_frecuencia_lluvias_options():
    try:
        print(f"DEBUG: Solicitud a /api/frecuencia_lluvias_options. Leyendo de HOJA 'Tablas' desde: {EXCEL_FILE_PATH}")
        df_tablas = pd.read_excel(EXCEL_FILE_PATH, sheet_name='Tablas', engine='openpyxl')
        print("DEBUG: Hoja 'Tablas' leída para opciones de frecuencia de lluvias.")

        col_data_idx = 12  # Column M
        fila_inicio_idx = 91 # Excel row 92 (92-1)
        fila_fin_idx = 94    # Excel row 95 (95-1)

        options_lista = []
        max_filas_df = df_tablas.shape[0]
        max_cols_df = df_tablas.shape[1]

        if col_data_idx >= max_cols_df:
            print(f"WARN: Columna M ({col_data_idx}) fuera de límites para frecuencia lluvias (hoja 'Tablas' tiene {max_cols_df} columnas).")
            return jsonify({"error": "Definición de columna para frecuencia lluvias fuera de los límites de la hoja."}), 500

        for r_idx in range(fila_inicio_idx, fila_fin_idx + 1):
            if r_idx >= max_filas_df:
                print(f"WARN: Fila {r_idx+1} para frecuencia lluvias fuera de límites (hoja 'Tablas' tiene {max_filas_df} filas). Lectura detenida.")
                break

            data_val = df_tablas.iloc[r_idx, col_data_idx]

            if pd.isna(data_val) or str(data_val).strip() == "":
                print(f"DEBUG: Fila {r_idx+1}, Columna M omitida por valor NaN o vacío para frecuencia lluvias.")
                continue

            options_lista.append(str(data_val).strip())

        print(f"DEBUG: Total opciones de frecuencia lluvias leídas de 'Tablas' M{fila_inicio_idx+1}:M{fila_fin_idx+1}: {len(options_lista)}")
        return jsonify(options_lista)

    except FileNotFoundError:
        print(f"ERROR en /api/frecuencia_lluvias_options: Archivo Excel no encontrado: {EXCEL_FILE_PATH}")
        return jsonify({"error": "Archivo Excel de configuración no encontrado."}), 404
    except KeyError as e:
        print(f"ERROR en /api/frecuencia_lluvias_options: Hoja 'Tablas' o columna M no encontrada? Error: {e}")
        return jsonify({"error": f"Error de clave al leer la hoja de cálculo para frecuencia lluvias: {e}"}), 500
    except IndexError as e:
        print(f"ERROR en /api/frecuencia_lluvias_options: Rango de celdas fuera de límites para frecuencia lluvias: {e}")
        return jsonify({"error": f"Error de índice, rango de celdas fuera de límites para frecuencia lluvias: {e}"}), 500
    except Exception as e:
        import traceback
        print(f"ERROR GENERAL en /api/frecuencia_lluvias_options: {e}")
        print(traceback.format_exc())
        return jsonify({"error": f"Error interno del servidor al obtener opciones de frecuencia lluvias: {str(e)}"}), 500

# --- Función de Normalización de Texto ---
def normalizar_texto(texto):
    if texto is None:
        return ""
    texto = texto.lower().strip()
    # Reemplazos para vocales acentuadas y diéresis comunes en español
    reemplazos = {
        'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
        'ä': 'a', 'ë': 'e', 'ï': 'i', 'ö': 'o', 'ü': 'u', # Considerar si 'ü' debe ser 'u' o 'ue'
        'à': 'a', 'è': 'e', 'ì': 'i', 'ò': 'o', 'ù': 'u'  # Acentos graves, menos comunes en español pero por si acaso
        # Podrían añadirse más reemplazos si es necesario (ej. ñ -> n, aunque esto es debatible)
    }
    for acentuada, sin_acento in reemplazos.items():
        texto = texto.replace(acentuada, sin_acento)
    return texto

# --- NUEVA RUTA: Para buscar ciudad y obtener código ---
@app.route('/api/buscar_ciudad', methods=['POST'])
def buscar_ciudad():
    data = request.json
    ciudad_buscada = data.get('ciudad')

    if not ciudad_buscada:
        return jsonify({"error": "Nombre de ciudad no proporcionado."}), 400

    try:
        print(f"DEBUG: Solicitud a /api/buscar_ciudad para: {ciudad_buscada}")
        # Leer la hoja 'Ciudades', columnas A (código) y B (nombre)
        # Column A is index 0, Column B is index 1
        # Filas Excel 2 a 1990 -> iloc 1 a 1989
        df_ciudades = pd.read_excel(EXCEL_FILE_PATH, sheet_name='Ciudades', usecols="A,B", header=None, skiprows=1, names=['codigo', 'ciudad_nombre'], engine='openpyxl')
        print(f"DEBUG: Hoja 'Ciudades' leída. Total filas: {len(df_ciudades)}")

        ciudad_buscada_normalizada = normalizar_texto(ciudad_buscada)

        # Iterar para encontrar la ciudad
        for index, row in df_ciudades.iterrows():
            nombre_excel_original = str(row['ciudad_nombre'])
            nombre_excel_normalizado = normalizar_texto(nombre_excel_original)

            # Log para depuración si se encuentra una ciudad que contenga la buscada (antes de la igualdad exacta)
            # Esto ayuda a ver si la normalización funciona o si hay otras diferencias.
            # if ciudad_buscada_normalizada in nombre_excel_normalizado or nombre_excel_normalizado in ciudad_buscada_normalizada :
            #     print(f"DEBUG Excel check: Original='{nombre_excel_original}', NormalizadoExcel='{nombre_excel_normalizado}', BuscadoNormalizado='{ciudad_buscada_normalizada}'")

            if nombre_excel_normalizado == ciudad_buscada_normalizada:
                codigo_encontrado = row['codigo']
                print(f"DEBUG: Ciudad '{ciudad_buscada}' (normalizada como '{ciudad_buscada_normalizada}') encontrada. Código: {codigo_encontrado}. Original Excel: '{nombre_excel_original}'")
                return jsonify({"codigo_ciudad": codigo_encontrado, "message": "Ciudad encontrada."}), 200

        print(f"WARN: Ciudad '{ciudad_buscada}' (normalizada como '{ciudad_buscada_normalizada}') no encontrada en la hoja 'Ciudades'.")
        # Devolver 200 OK, pero con codigo_ciudad: null para indicar que no se encontró
        return jsonify({"codigo_ciudad": None, "message": f"Ciudad '{ciudad_buscada}' no encontrada."}), 200

    except FileNotFoundError:
        print(f"ERROR en /api/buscar_ciudad: Archivo Excel no encontrado: {EXCEL_FILE_PATH}")
        return jsonify({"error": "Archivo Excel de configuración no encontrado."}), 500
    except KeyError as e:
        print(f"ERROR en /api/buscar_ciudad: Hoja 'Ciudades' o columnas A/B no encontradas? Error: {e}")
        return jsonify({"error": f"Error de clave al leer la hoja de cálculo para ciudades: {e}"}), 500
    except Exception as e:
        import traceback
        print(f"ERROR GENERAL en /api/buscar_ciudad: {e}")
        print(traceback.format_exc())
        return jsonify({"error": f"Error interno del servidor al buscar ciudad: {str(e)}"}), 500

# --- NUEVA RUTA: Para escribir un dato en una celda específica del Excel ---
@app.route('/api/escribir_dato_excel', methods=['POST'])
def escribir_dato_excel():
    data = request.json
    dato_a_escribir = data.get('dato')
    hoja_destino = data.get('hoja')
    celda_destino = data.get('celda') # Ej: "B7"

    if dato_a_escribir is None or not hoja_destino or not celda_destino: # None check for dato_a_escribir
        return jsonify({"error": "Faltan datos: 'dato', 'hoja' o 'celda' no proporcionados."}), 400

    try:
        print(f"DEBUG: Solicitud a /api/escribir_dato_excel. Dato: {dato_a_escribir}, Hoja: {hoja_destino}, Celda: {celda_destino}")

        # Usar openpyxl para leer y escribir para preservar el archivo existente tanto como sea posible
        import openpyxl

        # Verificar si el archivo existe
        if not os.path.exists(EXCEL_FILE_PATH):
            print(f"ERROR CRITICO: Archivo Excel NO ENCONTRADO para escritura: {EXCEL_FILE_PATH}")
            return jsonify({"error": f"Archivo Excel '{EXCEL_FILE_PATH}' no encontrado en el servidor."}), 500

        workbook = openpyxl.load_workbook(EXCEL_FILE_PATH)

        if hoja_destino not in workbook.sheetnames:
            print(f"ERROR: Hoja '{hoja_destino}' no encontrada en el archivo Excel.")
            return jsonify({"error": f"Hoja '{hoja_destino}' no encontrada."}), 400

        sheet = workbook[hoja_destino]

        # Validar la celda (simple validación de formato, openpyxl maneja errores de celda inválida)
        if not isinstance(celda_destino, str) or not celda_destino:
             print(f"ERROR: Formato de celda inválido: {celda_destino}")
             return jsonify({"error": "Formato de celda inválido."}), 400

        sheet[celda_destino] = dato_a_escribir

        workbook.save(EXCEL_FILE_PATH)
        print(f"DEBUG: Dato '{dato_a_escribir}' escrito en Hoja '{hoja_destino}', Celda '{celda_destino}' exitosamente.")

        return jsonify({"message": f"Dato '{dato_a_escribir}' escrito correctamente en {hoja_destino}!{celda_destino}."})

    except FileNotFoundError: # Aunque ya chequeamos arriba, por si acaso durante el load_workbook
        print(f"ERROR en /api/escribir_dato_excel: Archivo Excel no encontrado: {EXCEL_FILE_PATH}")
        return jsonify({"error": "Archivo Excel de configuración no encontrado durante la operación."}), 500
    except KeyError as e: # Podría ser por hoja_destino si el chequeo inicial falla de alguna forma
        print(f"ERROR en /api/escribir_dato_excel: Hoja '{hoja_destino}' no encontrada? Error: {e}")
        return jsonify({"error": f"Error de clave, Hoja '{hoja_destino}' no encontrada: {e}"}), 400
    except Exception as e:
        import traceback
        print(f"ERROR GENERAL en /api/escribir_dato_excel: {e}")
        print(traceback.format_exc())
        # Evitar exponer detalles internos en el mensaje de error al cliente
        return jsonify({"error": "Error interno del servidor al intentar escribir en el archivo Excel."}), 500

if __name__ == '__main__':
    app.run(debug=True)

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

# --- NUEVA RUTA: Para verificar la ciudad ---
@app.route('/api/verificar_ciudad', methods=['POST'])
def verificar_ciudad():
    try:
        data = request.get_json()
        if not data or 'ciudad' not in data:
            return jsonify({"error": "No se proporcionó el nombre de la ciudad."}), 400

        ciudad_recibida = data['ciudad']
        # Normalización simple: a minúsculas. Se pueden añadir más reglas (quitar acentos, etc.)
        ciudad_recibida_normalizada = str(ciudad_recibida).strip().lower()

        print(f"DEBUG: Solicitud a /api/verificar_ciudad. Ciudad recibida normalizada: '{ciudad_recibida_normalizada}'")

        # Construir la ruta completa al archivo Excel
        # __file__ es la ruta del script actual (backend.py)
        # os.path.dirname(__file__) es el directorio 'backend'
        # os.path.join(...) construye la ruta de forma segura
        excel_path_completa = os.path.join(os.path.dirname(__file__), EXCEL_FILE_PATH)
        
        if not os.path.exists(excel_path_completa):
            print(f"ERROR CRITICO: Archivo Excel NO ENCONTRADO en la ruta esperada: {excel_path_completa}")
            # Intentar una ruta alternativa si EXCEL_FILE_PATH ya es solo el nombre del archivo y está en 'backend/'
            if not os.path.dirname(EXCEL_FILE_PATH): # Si EXCEL_FILE_PATH es solo un nombre de archivo
                alt_excel_path = os.path.join(os.path.dirname(__file__), EXCEL_FILE_PATH)
                if os.path.exists(alt_excel_path):
                    excel_path_completa = alt_excel_path
                    print(f"DEBUG: Usando ruta alternativa para Excel: {excel_path_completa}")
                else: # Si EXCEL_FILE_PATH tiene una ruta, y esa no existe, probamos solo el nombre en el dir actual
                    alt_excel_path_2 = EXCEL_FILE_PATH 
                    if os.path.exists(alt_excel_path_2) and os.path.dirname(alt_excel_path_2) == os.path.dirname(__file__):
                         excel_path_completa = alt_excel_path_2
                         print(f"DEBUG: Usando ruta alternativa 2 (nombre archivo en dir backend) para Excel: {excel_path_completa}")
                    else:
                        print(f"ERROR CRITICO: Archivo Excel NO ENCONTRADO en {excel_path_completa} ni en {alt_excel_path} ni como {alt_excel_path_2} en el directorio del backend.")
                        return jsonify({"error": f"Archivo Excel de configuración no encontrado en el servidor. Ruta intentada: {excel_path_completa}"}), 500
            else: # Si EXCEL_FILE_PATH ya tenía una ruta pero no se encontró
                 print(f"ERROR CRITICO: Archivo Excel NO ENCONTRADO en la ruta especificada en EXCEL_FILE_PATH: {excel_path_completa}")
                 return jsonify({"error": f"Archivo Excel de configuración no encontrado en el servidor (ruta desde var). Ruta intentada: {excel_path_completa}"}), 500


        df_ciudades = pd.read_excel(excel_path_completa, sheet_name='Ciudades', engine='openpyxl')
        print(f"DEBUG: Hoja 'Ciudades' leída desde: {excel_path_completa}")

        # Asumir que la columna con nombres de ciudades se llama 'Nombre Ciudad' o 'Localidades'.
        # Necesitas confirmar el nombre exacto de la columna en tu archivo Excel.
        # Intentaremos con algunos nombres comunes.
        columna_ciudades_excel = None
        possible_column_names = ['Ciudad', 'Localidad', 'Nombre', 'Ciudades', 'NOMBRE CIUDAD', 'Localidades'] # Añade más si es necesario
        
        for col_name_candidate in possible_column_names:
            if col_name_candidate in df_ciudades.columns:
                columna_ciudades_excel = col_name_candidate
                break
        
        if columna_ciudades_excel is None:
            print(f"ERROR: No se encontró una columna de ciudades esperada en la hoja 'Ciudades'. Columnas disponibles: {list(df_ciudades.columns)}")
            return jsonify({"error": "No se pudo identificar la columna de ciudades en el archivo Excel."}), 500
            
        print(f"DEBUG: Usando columna '{columna_ciudades_excel}' para la lista de ciudades.")

        # Normalizar las ciudades del Excel y verificar existencia
        ciudades_en_excel_normalizadas = df_ciudades[columna_ciudades_excel].astype(str).str.strip().str.lower().tolist()
        
        ciudad_encontrada = ciudad_recibida_normalizada in ciudades_en_excel_normalizadas

        if ciudad_encontrada:
            print(f"DEBUG: Ciudad '{ciudad_recibida_normalizada}' ENCONTRADA en la lista del Excel.")
        else:
            print(f"DEBUG: Ciudad '{ciudad_recibida_normalizada}' NO ENCONTRADA en la lista del Excel.")
            # Opcional: Loguear algunas ciudades del Excel para depuración si no se encuentra
            # print(f"DEBUG: Primeras ciudades en Excel (normalizadas): {ciudades_en_excel_normalizadas[:5]}")


        return jsonify({
            "ciudad_encontrada": ciudad_encontrada,
            "ciudad_buscada": ciudad_recibida_normalizada
        })

    except FileNotFoundError:
        # Esto podría ser redundante si el chequeo de os.path.exists ya lo cubrió, pero es una salvaguarda.
        print(f"ERROR CRITICO (catch FileNotFoundError): Archivo Excel no encontrado. EXCEL_FILE_PATH='{EXCEL_FILE_PATH}', calculada='{excel_path_completa if 'excel_path_completa' in locals() else 'no_calculada'}'")
        return jsonify({"error": "Archivo Excel de configuración no encontrado en el servidor."}), 500
    except KeyError as e:
        # Esto puede ocurrir si la hoja 'Ciudades' no existe o la columna esperada no está.
        print(f"ERROR en /api/verificar_ciudad: Hoja 'Ciudades' o columna relevante no encontrada. Error: {e}")
        return jsonify({"error": f"Error de clave al leer la hoja de cálculo (¿nombre de hoja o columna incorrecto?): {e}"}), 500
    except Exception as e:
        import traceback
        print(f"ERROR GENERAL en /api/verificar_ciudad: {e}")
        print(traceback.format_exc())
        return jsonify({"error": f"Error interno del servidor al verificar la ciudad: {str(e)}"}), 500


if __name__ == '__main__':
    app.run(debug=True)

# --- NUEVO ENDPOINT PARA GEOCODIFICACIÓN ---
from geopy.geocoders import Nominatim
# Considerar añadir 'import openpyxl' si no está ya importado globalmente y es necesario para la escritura más adelante.
# import openpyxl 

@app.route('/api/geocode', methods=['POST'])
def geocode_address():
    try:
        data = request.get_json()
        if not data or 'direccion' not in data:
            return jsonify({"success": False, "error": "No se proporcionó la dirección."}), 400

        direccion_texto = data['direccion']
        print(f"DEBUG: Recibida solicitud a /api/geocode con dirección: '{direccion_texto}'")

        geolocator = Nominatim(user_agent="calculador_solar_app_v1", timeout=10)
        location = geolocator.geocode(direccion_texto, addressdetails=True) # addressdetails=True es crucial

        if location:
            print(f"DEBUG: Dirección encontrada por Nominatim: {location.address}")
            print(f"DEBUG: Raw data de Nominatim: {location.raw}")

            lat = location.latitude
            lng = location.longitude
            direccion_formateada = location.address
            
            ciudad_identificada = "No identificada"
            raw_address_components = location.raw.get('address', {})

            # Prioridad para extraer ciudad/localidad
            if 'city' in raw_address_components:
                ciudad_identificada = raw_address_components['city']
            elif 'town' in raw_address_components:
                ciudad_identificada = raw_address_components['town']
            elif 'village' in raw_address_components:
                ciudad_identificada = raw_address_components['village']
            elif 'county' in raw_address_components: # A veces el partido/county puede ser relevante si no hay ciudad
                ciudad_identificada = raw_address_components['county']
            # Podríamos añadir una lógica más sofisticada aquí si la ciudad viene en el 'display_name' o 'address'
            # y no en un componente específico. Por ejemplo, si el usuario ingresa "Calle Falsa 123, Springfield"
            # y Nominatim no lo desglosa bien, podríamos intentar parsear la entrada original.
            # Por ahora, nos basamos en los componentes de 'raw.address'.

            print(f"DEBUG: Ciudad identificada por el backend desde Nominatim: '{ciudad_identificada}'")

            return jsonify({
                "success": True,
                "lat": lat,
                "lng": lng,
                "direccion_formateada": direccion_formateada,
                "ciudad": ciudad_identificada,
                "raw_address_components": raw_address_components # Para depuración en frontend si es necesario
            })
        else:
            print(f"WARN: Dirección '{direccion_texto}' no encontrada por Nominatim.")
            return jsonify({"success": False, "error": "Dirección no encontrada por el servicio de geocodificación."}), 404

    except Exception as e:
        import traceback
        print(f"ERROR GENERAL en /api/geocode: {e}")
        print(traceback.format_exc())
        return jsonify({"success": False, "error": f"Error interno del servidor durante la geocodificación: {str(e)}"}), 500
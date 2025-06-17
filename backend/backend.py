# backend.py
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import pandas as pd
import os

app = Flask(__name__)
CORS(app) # Habilita CORS para permitir solicitudes desde el frontend

# Ruta donde estará tu archivo Excel en el servidor
EXCEL_FILE_PATH = 'Calculador Solar - web 06-24_con ayuda - modificaciones 2025_5.xlsx'

# --- NUEVA RUTA: Para obtener la lista de electrodomésticos y sus consumos ---
@app.route('/api/electrodomesticos', methods=['GET'])
def get_electrodomesticos_consumos():
    try:
        print(f"DEBUG: Solicitud a /api/electrodomesticos. Leyendo de HOJA 'Tablas' desde: {EXCEL_FILE_PATH}")
        # ¡¡¡IMPORTANTE!!! Reemplaza 'Tablas' con el nombre exacto de tu hoja si es diferente.
        df_tablas = pd.read_excel(EXCEL_FILE_PATH, sheet_name='Tablas', engine='openpyxl', decimal=',')
        print("DEBUG: Hoja 'Tablas' leída para electrodomésticos.")

        col_nombre_idx = 0  # Columna A
        col_consumo_idx = 1 # Columna B
        fila_inicio_idx = 110 # Fila 111 en Excel (111 - 1)
        fila_fin_idx = 173  # Fila 174 en Excel (174 - 1)

        electrodomesticos_lista = []
        max_filas_df = df_tablas.shape[0]

        for r_idx in range(fila_inicio_idx, fila_fin_idx + 1):
            if r_idx >= max_filas_df:
                print(f"WARN: Fila {r_idx+1} fuera de límites (hoja 'Tablas' tiene {max_filas_df} filas). Lectura detenida.")
                break
            if col_nombre_idx >= df_tablas.shape[1] or col_consumo_idx >= df_tablas.shape[1]:
                print(f"WARN: Columna para nombre/consumo fuera de límites (hoja 'Tablas' tiene {df_tablas.shape[1]} columnas).")
                break

            nombre = df_tablas.iloc[r_idx, col_nombre_idx]
            consumo_kwh = df_tablas.iloc[r_idx, col_consumo_idx]

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

            electrodomesticos_lista.append({
                "name": str(nombre),
                "consumo_diario_kwh": consumo_kwh_float
            })

        print(f"DEBUG: Total electrodomésticos leídos de 'Tablas' A{fila_inicio_idx+1}:B{fila_fin_idx+1}: {len(electrodomesticos_lista)}")
        categorias_respuesta = {"Electrodomésticos Disponibles": electrodomesticos_lista}

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

if __name__ == '__main__':
    app.run(debug=True)
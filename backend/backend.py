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
def get_electrodomesticos():
    try:
        print("DEBUG: Leyendo hoja 'Tablas' del Excel para electrodomésticos.")
        # Leer la hoja 'Tablas'
        df_tablas = pd.read_excel(EXCEL_FILE_PATH, sheet_name='Tablas', engine='openpyxl')

        # Extraer los datos del rango A111:B174 (considerando que pandas es 0-indexado)
        # Columna A (índice 0) para el nombre del electrodoméstico
        # Columna B (índice 1) para el consumo en kWh/día
        # Filas 110 a 173 (porque el rango es 111 a 174 en Excel, que es 110 a 173 en 0-indexado)
        electrodomesticos_df = df_tablas.iloc[110:174, 0:2]
        electrodomesticos_df.columns = ['nombre', 'consumo_kwh_diario'] # Renombrar columnas para claridad

        # Opcional: Si tienes una columna para la categoría en el Excel (ej. columna C), la agregarías aquí
        # Por ahora, si no hay una columna de categoría explícita, los agruparemos de forma simple.
        # Si la columna A contiene el nombre del electrodoméstico Y la categoría (ej. "Iluminación - LED"),
        # podríamos intentar parsear la categoría desde el nombre.
        # Para este ejemplo, asumiremos que todos son de una misma "categoría general" a menos que haya una columna explícita.
        # Si la primera columna contiene algo como "CATEGORIA: Electrodomésticos", podrías usar esa fila como separador.

        # Vamos a crear una estructura simple por ahora, asumiendo que los nombres son únicos
        # y no hay una columna de categoría específica en A:B
        # Si las categorías están en una columna separada (ej. columna C), ajustaríamos:
        # electrodomesticos_df = df_tablas.iloc[110:174, 0:3]
        # electrodomesticos_df.columns = ['nombre', 'consumo_kwh_diario', 'categoria']


        # Convertir a una lista de diccionarios para enviar como JSON
        electrodomesticos_list = []
        current_category = "Otros Electrodomésticos" # Categoría por defecto si no hay en Excel

        for index, row in electrodomesticos_df.iterrows():
            nombre = row['nombre']
            consumo_kwh_diario = row['consumo_kwh_diario']

            # Intentar determinar la categoría si el nombre del electrodoméstico incluye una (ej. "Electrodomésticos - Heladera")
            # O si hay filas específicas que marcan una categoría (ej. "ILUMINACION")
            # Aquí, asumo que cada electrodoméstico está en una fila.
            # Si tu Excel tiene títulos de categoría en las filas, necesitamos una lógica más sofisticada.
            # Por ahora, si el "nombre" parece una categoría (ej. todo mayúsculas o termina en ':'), lo usamos.

            if isinstance(nombre, str) and nombre.isupper() and "CONSUMO" not in nombre: # Heurística para categorías
                 current_category = nombre.strip()
            elif pd.notna(nombre) and pd.notna(consumo_kwh_diario):
                # Calcular potencia en Watts (asumiendo que 1 kWh_diario es un promedio)
                # La imagen tenía potencia en Watts y horas de uso diario. El Excel tiene consumo en kWh/día.
                # Para la interfaz, necesitamos potencia (W) y horas/día.
                # Podemos hacer una estimación inversa:
                # Potencia (W) * Horas/día / 1000 = Consumo_kWh/día
                # Si tenemos solo Consumo_kWh/día, podemos asumir una hora de uso estándar (ej. 1 hora) para derivar una "potencia efectiva"
                # o, si es más preciso, el consumo en kWh/día ya es suficiente para el cálculo final.
                # Para la visualización como en la imagen, necesitamos Potencia y Horas.
                # Sugerencia: el Excel debería tener Potencia y Horas, o podemos asumir horas y calcular potencia.
                # Por ahora, si el Excel da kWh/día, usaremos ese valor directamente para los cálculos,
                # y para la visualización, podríamos mostrar "Consumo: X kWh/día" o asumir un uso de 1 hora para derivar una potencia.

                # Si el consumo es en kWh/día, lo pasamos directamente. No tiene sentido derivar potencia y horas sin más datos.
                # Simplemente lo enviaremos como consumo_kwh_diario y el frontend lo usará.
                # Para que se parezca a la imagen (W y h/día), necesitaríamos esos datos en el Excel.
                # Por ahora, lo enviaré como "consumo_kwh_diario".
                # Si el excel tiene POTENCIA y HORAS, ajusta las columnas de lectura y este diccionario.

                electrodomesticos_list.append({
                    'nombre': nombre.strip(),
                    'consumo_kwh_diario': float(consumo_kwh_diario),
                    'categoria': current_category
                })

        # Agrupar por categoría para facilitar el manejo en el frontend
        grouped_electrodomesticos = {}
        for item in electrodomesticos_list:
            categoria = item['categoria']
            if categoria not in grouped_electrodomesticos:
                grouped_electrodomesticos[categoria] = []
            grouped_electrodomesticos[categoria].append({
                'nombre': item['nombre'],
                'consumo_kwh_diario': item['consumo_kwh_diario']
            })

        print(f"DEBUG: Electrodomésticos leídos y agrupados: {grouped_electrodomesticos}")
        return jsonify(grouped_electrodomesticos)

    except FileNotFoundError:
        print(f"ERROR CRITICO: Archivo Excel NO ENCONTRADO: {EXCEL_FILE_PATH}")
        return jsonify({"error": "Archivo Excel no encontrado."}), 500
    except KeyError as e:
        print(f"Error de KeyError en backend (hoja o columnas no encontradas): {e}")
        return jsonify({"error": f"Error al leer hoja Excel o columnas: {e}."}), 500
    except Exception as e:
        import traceback
        print(f"ERROR GENERAL en backend al obtener electrodomésticos: {e}")
        print(traceback.format_exc())
        return jsonify({"error": f"Error interno del servidor al obtener electrodomésticos: {str(e)}"}), 500

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

if __name__ == '__main__':
    app.run(debug=True)
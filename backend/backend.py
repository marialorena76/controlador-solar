# backend.py
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import pandas as pd
import os

app = Flask(__name__)
CORS(app) # Habilita CORS para permitir solicitudes desde el frontend

# Ruta donde estará tu archivo Excel en el servidor
# Asegúrate de que esta ruta sea correcta o que el archivo esté en la misma carpeta que 'backend.py'
EXCEL_FILE_PATH = 'Calculador Solar - web 06-24_con ayuda - modificaciones 2025_5.xlsx'

# --- Ruta para obtener los datos de electrodomésticos para el frontend ---
@app.route('/api/generar_informe', methods=['POST'])
def generar_informe():
    user_data = request.json
    print("DEBUG: Datos recibidos del frontend:", user_data)

    if not user_data:
        return jsonify({"error": "No se recibieron datos"}), 400

    try:
        print(f"DEBUG: Leyendo Excel: {EXCEL_FILE_PATH}")
        df_resultados = pd.read_excel(EXCEL_FILE_PATH, sheet_name='Resultados', engine='openpyxl', decimal=',') 
        print("DEBUG: Hoja 'Resultados' leída.")
        df_area_trabajo = pd.read_excel(EXCEL_FILE_PATH, sheet_name='Area de trabajo', engine='openpyxl', decimal=',')
        print("DEBUG: Hoja 'Area de trabajo' leída.")

        valor_b490 = df_area_trabajo.iloc[489, 1] if not pd.isna(df_area_trabajo.iloc[489, 1]) else 0 
        valor_p490 = df_area_trabajo.iloc[489, 15] if not pd.isna(df_area_trabajo.iloc[489, 15]) else 0 
        generacion_anual_calculada_backend = float(valor_b490) + float(valor_p490)
        print(f"DEBUG: Generacion anual (calculada B490+P490): {generacion_anual_calculada_backend}")

        consumo_anual_frontend = user_data.get('totalAnnualConsumption', 0)
        cantidad_paneles_frontend = user_data.get('panelesSolares', {}).get('cantidad', 0)
        potencia_paneles_frontend = user_data.get('panelesSolares', {}).get('potenciaNominal', 0)
        superficie_instalacion_frontend = user_data.get('panelesSolares', {}).get('superficie', 0)
        moneda = user_data.get('selectedCurrency', 'Pesos argentinos')
        paneles_data_from_frontend = user_data.get("panelesSolares", {})
        inversor_data_from_frontend = user_data.get("inversor", {})
        perdidas_data_from_frontend = user_data.get("perdidas", {})

        # --- ¡AQUÍ TU TRABAJO PRINCIPAL! ---
        # Revisa y corrige las siguientes lecturas de df_resultados.
        # Asegúrate que los .iloc[fila, columna] sean correctos para TU EXCEL.
        # Celdas mencionadas por ti: C7, C9, C10. Otras son de tu código anterior.
        
        # consumo_anual_a_usar = consumo_anual_frontend # Opción actual
        # Si quieres leer de Resultados C7 (fila 6, col 2):
        # consumo_anual_excel_c7 = df_resultados.iloc[6, 2] if not pd.isna(df_resultados.iloc[6, 2]) else 0
        # consumo_anual_a_usar = consumo_anual_excel_c7 
        consumo_anual_a_usar = consumo_anual_frontend # Decide cuál usar

        autoconsumo_kwh_excel = df_resultados.iloc[8, 2] if not pd.isna(df_resultados.iloc[8, 2]) else 0 # Para C9
        inyectada_red_kwh_excel = df_resultados.iloc[9, 2] if not pd.isna(df_resultados.iloc[9, 2]) else 0 # Para C10
        potencia_paneles_excel = df_resultados.iloc[4, 1] if not pd.isna(df_resultados.iloc[4, 1]) else 0 # Para B5
        superficie_excel = df_resultados.iloc[5, 1] if not pd.isna(df_resultados.iloc[5, 1]) else 0 # Para B6
        vida_util = 25
        costo_actual_excel = df_resultados.iloc[6, 1] if not pd.isna(df_resultados.iloc[6, 1]) else 0    # B7
        inversion_inicial_excel = df_resultados.iloc[7, 1] if not pd.isna(df_resultados.iloc[7, 1]) else 0 # B8
        mantenimiento_excel = df_resultados.iloc[8, 1] if not pd.isna(df_resultados.iloc[8, 1]) else 0 # B9
        costo_futuro_excel = df_resultados.iloc[9, 1] if not pd.isna(df_resultados.iloc[9, 1]) else 0   # B10
        ingreso_red_excel = df_resultados.iloc[10, 1] if not pd.isna(df_resultados.iloc[10, 1]) else 0 # B11
        resumen_economico_texto_excel = df_resultados.iloc[11, 1] if not pd.isna(df_resultados.iloc[11, 1]) else "N/A" # B12
        emisiones_evitadas_excel = df_resultados.iloc[12, 1] if not pd.isna(df_resultados.iloc[12, 1]) else 0 # B13

        informe_final = {
            "consumo_anual": consumo_anual_a_usar,
            "generacion_anual": generacion_anual_calculada_backend,
            "autoconsumo": autoconsumo_kwh_excel,
            "inyectada_red": inyectada_red_kwh_excel,
            "potencia_paneles": potencia_paneles_frontend if potencia_paneles_frontend != 0 else potencia_paneles_excel,
            "cantidad_paneles": cantidad_paneles_frontend,
            "superficie": superficie_instalacion_frontend if superficie_instalacion_frontend != 0 else superficie_excel,
            "vida_util": vida_util,
            "panelesSolares": paneles_data_from_frontend,
            "inversor": inversor_data_from_frontend,
            "perdidas": perdidas_data_from_frontend,
            "costo_actual": costo_actual_excel,
            "inversion_inicial": inversion_inicial_excel,
            "mantenimiento": mantenimiento_excel,
            "costo_futuro": costo_futuro_excel,
            "ingreso_red": ingreso_red_excel,
            "resumen_economico": resumen_economico_texto_excel,
            "emisiones": emisiones_evitadas_excel,
            "moneda": moneda
        }
        
        print(f"DEBUG: informe_final a punto de ser enviado: {informe_final}")
        return jsonify(informe_final)

    except FileNotFoundError:
        print(f"ERROR CRITICO: Archivo Excel NO ENCONTRADO: {EXCEL_FILE_PATH}")
        return jsonify({"error": "Archivo Excel no encontrado."}), 500
    except KeyError as e:
        print(f"Error de KeyError en backend: {e}")
        return jsonify({"error": f"Error al leer hoja/columna: {e}."}), 500
    except IndexError as e: 
        print(f"Error de IndexError en backend: {e}")
        return jsonify({"error": f"Error al acceder a celda: {e}."}), 500
    except Exception as e:
        import traceback
        print(f"ERROR GENERAL en backend: {e}")
        print(traceback.format_exc())
        return jsonify({"error": f"Error interno del servidor: {str(e)}"}), 500
    
# Opcional: Rutas para servir los archivos estáticos de tu frontend
# Si 'calculador.html', 'calculador.js', etc. están en la misma carpeta que 'backend.py'
@app.route('/')
def serve_calculador_html():
    return send_from_directory('.', 'calculador.html')

@app.route('/<path:path>')
def serve_static_files(path):
    # Reglas para servir archivos estáticos (HTML, JS, CSS, etc.)
    # Esto es importante para que el navegador pueda cargar todos los recursos.
    # Asegúrate de que los archivos estén en la misma carpeta que 'backend.py' o ajusta la ruta.
    return send_from_directory('.', path)

if __name__ == '__main__':
    app.run(debug=True) # debug=True permite recargar automáticamente en cambios y ver errores
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
@app.route('/api/electrodomesticos', methods=['GET'])
def get_electrodomesticos_consumos():
    try:
        df = pd.read_excel(EXCEL_FILE_PATH, sheet_name='Datos de Entrada', engine='openpyxl')

        # Asumo que los nombres de los electrodomésticos están en la columna H (índice 7)
        # y los consumos diarios (kWh/día) están en la columna Q (índice 16)
        # en el rango de filas 46 a 64 del Excel (índices 45 a 63 en pandas)
        col_nombre_electrodomestico_idx = 7  # Columna H
        col_consumo_diario_kwh_idx = 16 # Columna Q

        electrodomesticos_data = []
        for r_idx in range(45, 64): # Filas 46 a 64
            nombre = df.iloc[r_idx, col_nombre_electrodomestico_idx]
            consumo_diario = df.iloc[r_idx, col_consumo_diario_kwh_idx]

            if pd.isna(nombre) or pd.isna(consumo_diario):
                continue # Saltar filas con datos faltantes

            electrodomesticos_data.append({
                "name": str(nombre),
                # Asegúrate de que el consumo diario esté en el formato esperado (kWh/día)
                # Si tu Excel tiene watts y horas/día, deberías calcularlo aquí.
                "consumo_diario_kwh": float(consumo_diario)
            })

        # Agrupar por categoría si es necesario. Por ahora, envío una lista plana.
        # Si tu Excel tiene una columna de categoría, puedes adaptarlo.
        # Por simplicidad, si no hay columna de categoría, los agrupo en una categoría 'General'.
        categorias = {"General": electrodomesticos_data}
        # Si tienes una columna de categoría, podrías hacer algo como:
        # col_categoria_idx = 8 # Columna I, por ejemplo
        # for r_idx in range(45, 64):
        #     categoria = df.iloc[r_idx, col_categoria_idx] if not pd.isna(df.iloc[r_idx, col_categoria_idx]) else "General"
        #     # ... y luego organizar `electrodomesticos_data` por esa categoría.

        return jsonify({"categorias": categorias})

    except FileNotFoundError:
        return jsonify({"error": "Archivo Excel de electrodomésticos no encontrado en el servidor."}), 404
    except Exception as e:
        print(f"Error al cargar electrodomésticos: {e}")
        return jsonify({"error": f"Error interno del servidor al cargar electrodomésticos: {e}"}), 500

# --- Ruta para generar el informe ---
@app.route('/api/generar_informe', methods=['POST'])
def generar_informe():
    user_data = request.json
    print("Datos recibidos del frontend:", user_data)

    if not user_data:
        return jsonify({"error": "No se recibieron datos"}), 400

    try:
        df = pd.read_excel(EXCEL_FILE_PATH, sheet_name='Resultados', engine='openpyxl')

        # --- Extracción de datos del Excel ---
        # AQUI ES DONDE DEBERIAS LEER LAS CELDAS ESPECÍFICAS DE TU EXCEL
        # Reemplaza 'A1', 'B2', etc. con las referencias de celda reales de tu hoja 'Resultados'
        # o las celdas donde se encuentren los valores calculados.

        # Ejemplo de lectura de una celda específica (fila, columna)
        # Nota: pandas.read_excel usa índices base 0 para filas y columnas
        # Si en Excel es A1, en pandas es df.iloc[0,0]
        # Si en Excel es C5, en pandas es df.iloc[4,2]

        # Consumo Anual (Ejemplo: de user_data o de una celda específica)
        consumo_anual_calculado = user_data.get('totalAnnualConsumption', 0)

        # Generación Anual Estimada (debería venir del Excel o cálculo)
        # SUPONER que la generación anual está en la celda B2 (índice 1,1) de la hoja 'Resultados'
        generacion_anual = df.iloc[1,1] if not pd.isna(df.iloc[1,1]) else 0

        # Porcentaje de Autoconsumo (debería venir del Excel o cálculo)
        # SUPONER que el autoconsumo está en la celda B3 (índice 2,1)
        autoconsumo = df.iloc[2,1] if not pd.isna(df.iloc[2,1]) else 0

        # Energía Inyectada a la Red (debería venir del Excel o cálculo)
        # SUPONER que la energía inyectada está en la celda B4 (índice 3,1)
        inyectada_red = df.iloc[3,1] if not pd.isna(df.iloc[3,1]) else 0

        # Potencia Total de los Paneles (debería venir del Excel o cálculo)
        # SUPONER que la potencia paneles está en la celda B5 (índice 4,1)
        potencia_paneles = df.iloc[4,1] if not pd.isna(df.iloc[4,1]) else 0

        # Cantidad de Paneles (de user_data o de una celda específica)
        cantidad_paneles = user_data['panelesSolares']['cantidad'] if 'panelesSolares' in user_data else 0

        # Superficie de Instalación (debería venir del Excel o cálculo)
        # SUPONER que la superficie está en la celda B6 (índice 5,1)
        superficie = df.iloc[5,1] if not pd.isna(df.iloc[5,1]) else 0

        # Vida Útil Estimada del Sistema (debería venir del Excel o ser un valor fijo)
        vida_util = 25 # Suponemos 25 años, o lee de una celda del Excel

        # Análisis Económico
        # SUPONER que el costo actual está en la celda B7 (índice 6,1)
        costo_actual = df.iloc[6,1] if not pd.isna(df.iloc[6,1]) else 0
        # SUPONER que la inversión inicial está en la celda B8 (índice 7,1)
        inversion_inicial = df.iloc[7,1] if not pd.isna(df.iloc[7,1]) else 0
        # SUPONER que el mantenimiento anual está en la celda B9 (índice 8,1)
        mantenimiento = df.iloc[8,1] if not pd.isna(df.iloc[8,1]) else 0
        # SUPONER que el costo futuro de energía (ahorro) está en la celda B10 (índice 9,1)
        costo_futuro = df.iloc[9,1] if not pd.isna(df.iloc[9,1]) else 0
        # SUPONER que el ingreso por inyección a red está en la celda B11 (índice 10,1)
        ingreso_red = df.iloc[10,1] if not pd.isna(df.iloc[10,1]) else 0

        # Resumen económico (puede ser una celda de texto en Excel o generado aquí)
        # SUPONER que el resumen económico está en la celda B12 (índice 11,1)
        resumen_economico_texto = df.iloc[11,1] if not pd.isna(df.iloc[11,1]) else "Análisis económico no disponible."

        # Contribución al Cambio Climático
        # SUPONER que las emisiones evitadas están en la celda B13 (índice 12,1)
        emisiones_evitadas = df.iloc[12,1] if not pd.isna(df.iloc[12,1]) else 0

        # Moneda
        moneda = user_data.get('selectedCurrency', 'Pesos argentinos')

        # Construir el informe final con los datos extraídos o calculados
        informe_final = {
            "consumo_anual": consumo_anual_calculado,
            "generacion_anual": generacion_anual,
            "autoconsumo": autoconsumo,
            "inyectada_red": inyectada_red,

            "potencia_paneles": potencia_paneles,
            "cantidad_paneles": cantidad_paneles,
            "superficie": superficie,
            "vida_util": vida_util,

            # Datos de paneles, inversor y pérdidas que pasaste directamente
            "panelesSolares": user_data.get("panelesSolares", {}),
            "inversor": user_data.get("inversor", {}),
            "perdidas": user_data.get("perdidas", {}),

            "costo_actual": costo_actual,
            "inversion_inicial": inversion_inicial,
            "mantenimiento": mantenimiento,
            "costo_futuro": costo_futuro,
            "ingreso_red": ingreso_red,
            "resumen_economico": resumen_economico_texto,
            "emisiones": emisiones_evitadas,
            "moneda": moneda
        }

        return jsonify(informe_final)

    except FileNotFoundError:
        return jsonify({"error": "Archivo Excel de cálculos no encontrado en el servidor."}), 404
    except KeyError as e:
        return jsonify({"error": f"Error al leer hoja o columna en Excel: {e}. Revise los nombres de hoja y las referencias a columnas."}), 500
    except Exception as e:
        print(f"Error en el backend al generar informe: {e}")
        return jsonify({"error": f"Error interno del servidor al generar informe: {e}"}), 500

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
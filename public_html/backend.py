from flask import Flask, jsonify, request
from flask_cors import CORS
from openpyxl import load_workbook

app = Flask(__name__)
CORS(app)

EXCEL_PATH = '/home/calculadorsolar.soyloregonzalez.com/public_html/Calculador Solar - web 06-24_con ayuda - modificaciones 2025_5.xlsx'


@app.post('/api/guardar_ciudad')
def guardar_ciudad():
    """
    Guarda SOLO la ciudad en 'Datos de Entrada'!B7 y marca recálculo al abrir.
    No guarda lat/lng ni otras celdas.
    """
    data = request.get_json(silent=True) or {}
    ciudad = (data.get('ciudad') or '').strip()
    if not ciudad:
        return jsonify({'error': 'Falta el nombre de la ciudad'}), 400

    try:
        wb = load_workbook(EXCEL_PATH, data_only=False)
        if 'Datos de Entrada' not in wb.sheetnames:
            return jsonify({'error': "No existe la hoja 'Datos de Entrada'"}), 500
        ws = wb['Datos de Entrada']
        ws['B7'] = ciudad
        # Forzar recálculo cuando se abra en Excel/LibreOffice
        wb.calculation_properties.fullCalcOnLoad = True
        wb.save(EXCEL_PATH)
        return jsonify({'ok': True, 'ciudad': ciudad}), 200
    except Exception as e:
        return jsonify({'error': f'No se pudo escribir en Excel: {e}'}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

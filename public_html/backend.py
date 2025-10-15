from flask import Flask, jsonify, request
from flask_cors import CORS
from openpyxl import load_workbook

app = Flask(__name__)
CORS(app)

EXCEL_PATH = 'Calculador Solar - web 06-24_con ayuda - modificaciones 2025_5.xlsx'


@app.post('/api/guardar_ciudad')
def guardar_ciudad():
    """
    Guarda SOLO la ciudad en 'Datos de Entrada'!B7.
    No escribir lat/lng.
    """
    payload = request.get_json(silent=True) or {}
    ciudad = (payload.get('ciudad') or '').strip()

    if not ciudad:
        return jsonify({'error': 'Falta el nombre de la ciudad'}), 400

    try:
        wb = load_workbook(EXCEL_PATH, data_only=False)
        ws = wb['Datos de Entrada']
        ws['B7'] = ciudad  # <-- SOLO B7
        wb.save(EXCEL_PATH)
        return jsonify({'ok': True, 'ciudad': ciudad})
    except Exception as exc:
        return jsonify({'error': f'No se pudo escribir en Excel: {exc}'}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

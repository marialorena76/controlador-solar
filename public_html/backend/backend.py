from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import os, json
from threading import Lock
from utils_excel import escribir_datos_excel, leer_resultados_excel

BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # .../public_html/backend
PROJECT_ROOT = os.path.dirname(BASE_DIR)               # .../public_html

EXCEL_FILE_NAME = "Calculador Solar - web 06-24_con ayuda - modificaciones 2025_11.xlsx"
EXCEL_PATH = os.path.join(BASE_DIR, EXCEL_FILE_NAME)

CONSUMOS_JSON_PATH = os.path.join(PROJECT_ROOT, "consumos_electrodomesticos.json")

excel_lock = Lock()
app = Flask(__name__, static_folder=PROJECT_ROOT, static_url_path='')
CORS(app)


def fnum(x, d=2):
    try:
        return round(float(x), d)
    except Exception:
        return 0.0


@app.route("/api/health")
def health():
    return jsonify({"ok": True, "excel_path": EXCEL_PATH, "excel_exists": os.path.exists(EXCEL_PATH)}), 200


@app.route("/api/electrodomesticos")
def electrodomesticos():
    if not os.path.exists(CONSUMOS_JSON_PATH):
        return jsonify({"categorias": {}}), 200
    try:
        with open(CONSUMOS_JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        return jsonify({"categorias": data}), 200
    except Exception as e:
        return jsonify({"error": f"Error leyendo JSON: {e}"}), 500


@app.route("/api/ubicacion", methods=["POST"])
def guardar_ubicacion():
    try:
        data = request.get_json(force=True) or {}
        ciudad = (data.get("ciudad") or data.get("selectedCityName") or "").strip()
        loc = data.get("location") or {}
        lat = loc.get("lat")
        lng = loc.get("lng")

        if not ciudad and (lat is None or lng is None):
            return jsonify({"error": "Faltan datos de ubicación"}), 400

        with excel_lock:
            escribir_datos_excel(EXCEL_PATH, ciudad=ciudad or None, lat=lat, lng=lng)

        return jsonify({"ok": True}), 200
    except Exception as e:
        return jsonify({"error": f"Excepción en /api/ubicacion: {e}"}), 500


@app.route("/api/generar_informe", methods=["POST"])
def generar_informe():
    try:
        data = request.get_json(force=True) or {}
        ciudad  = data.get("ciudad")
        zona    = data.get("zonaInstalacionBasic")
        tipo    = data.get("installationType")
        mensual = data.get("totalMonthlyConsumption")
        anual   = data.get("totalAnnualConsumption")
        loc     = data.get("location") or {}
        lat     = loc.get("lat")
        lng     = loc.get("lng")

        with excel_lock:
            escribir_datos_excel(EXCEL_PATH, ciudad, zona, tipo, mensual, anual, lat, lng)

            # Recalcular si hay LibreOffice disponible (no bloquear si no)
            try:
                from excel_recalc import recalc_with_libreoffice, libreoffice_available
                if libreoffice_available():
                    recalc_with_libreoffice(EXCEL_PATH)
                else:
                    app.logger.warning("LibreOffice no disponible: se continúa sin recálculo.")
            except Exception as e:
                app.logger.error(f"Error recalculando Excel: {e}. Se continúa sin recálculo.")

            tabla = leer_resultados_excel(EXCEL_PATH, 3, 50, 2, 12)

        return jsonify({
            "status": "ok",
            "tabla_resultados": tabla
        }), 200

    except Exception as e:
        return jsonify({"error": f"Error al generar informe: {e}"}), 500


# Opcional: servir index si alguien entra a /
@app.route("/")
def root_index():
    return send_from_directory(PROJECT_ROOT, "index.html")


@app.route("/<path:p>")
def static_any(p):
    return send_from_directory(PROJECT_ROOT, p)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5001, debug=True)

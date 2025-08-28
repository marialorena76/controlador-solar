import openpyxl
import json

def generate_basic_report(file_path, output_path):
    # This mapping is based on my analysis of informe.html and informe.js
    # and the output from the excel file.
    KEY_MAPPING = {
        "Consumo anual de energía eléctrica": "consumo_anual_kwh",
        "Generación anual de energía eléctrica": "energia_generada_anual",
        "Energía para autoconsumo": "autoconsumo",
        "Energía inyectada a la red": "inyectada_red",
        "Potencia de paneles sugerida": "potencia_panel_sugerida",
        "Cantidad paneles necesarios": "numero_paneles",
        "Superficie necesaria": "area_paneles_m2",
        "Vida útil del proyecto (años)": "vida_util",
        "Costo actual anual en Energía Eléctrica (sin instalación fotovoltaica)": "costo_actual",
        "Inversión inicial a realizar en año cero": "inversion_inicial",
        "Costo de mantenimiento anual": "mantenimiento",
        "Costo futuro de energía eléctrica consumida de la red": "costo_futuro",
        "Ingreso anual por inyección de energía a la red": "ingreso_red",
        "Emisiones de gases de efecto invernadero evitadas con la instalación": "emisiones",
    }

    try:
        workbook = openpyxl.load_workbook(file_path, data_only=True) # data_only=True to get cell values
        sheet = workbook['Resultados']

        excel_data = {}
        for row in range(5, 49): # B5:C48
            label_cell = f'B{row}'
            value_cell = f'C{row}'
            label = sheet[label_cell].value
            value = sheet[value_cell].value
            if label:
                excel_data[label.strip()] = value

        report_data = {}
        for excel_label, json_key in KEY_MAPPING.items():
            if excel_label in excel_data:
                value = excel_data[excel_label]
                # The frontend expects numbers, not error strings.
                if isinstance(value, str) and ('#N/A' in value or '#VALUE!' in value):
                    report_data[json_key] = None # Or some other sensible default
                else:
                    report_data[json_key] = value

        # Add other required fields that might not be in the B/C range
        # but are expected by informe.js
        report_data['userType'] = 'basico'
        # I'm guessing the currency, will need to confirm
        report_data['moneda'] = 'Pesos'

        # This is needed by the frontend JS
        if 'Marca seleccionada' in excel_data:
            report_data['panel_seleccionado'] = {
                "Marca": excel_data.get("Marca seleccionada"),
                "Pmax[W]": excel_data.get("Potencia de paneles sugerida"),
                "Modelo": excel_data.get("Modelo de panel"),
            }
        else:
            report_data['panel_seleccionado'] = {}

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(report_data, f, ensure_ascii=False, indent=4)

        print(f"Report data successfully generated at {output_path}")

    except FileNotFoundError:
        print(f"Error: El archivo '{file_path}' no fue encontrado.")
    except KeyError:
        print("Error: No se encontró la hoja 'Resultados' en el archivo Excel.")

if __name__ == "__main__":
    EXCEL_FILE = 'backend/Calculador Solar - web 06-24_con ayuda - modificaciones 2025_5.xlsx'
    OUTPUT_FILE = 'basic_report_output.json'
    generate_basic_report(EXCEL_FILE, OUTPUT_FILE)

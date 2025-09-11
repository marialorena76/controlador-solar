import openpyxl
import matplotlib.pyplot as plt
import os

def get_data_from_sheet(filename, sheet_name, data_range):
    """Reads data from a specific range in a sheet."""
    try:
        workbook = openpyxl.load_workbook(filename, data_only=True)
        sheet = workbook[sheet_name]
        data = []
        for row in sheet[data_range]:
            data.append([cell.value for cell in row])
        return data
    except FileNotFoundError:
        print(f"Error: The file '{filename}' was not found.")
        return None
    except KeyError:
        print(f"Error: The sheet '{sheet_name}' was not found in the workbook.")
        return None

def generate_report():
    filename = 'backend/Calculador Solar - web 06-24_con ayuda - modificaciones 2025_5.xlsx'

    # 1. Read data from "Resultados" sheet
    resultados_data = get_data_from_sheet(filename, 'Resultados', 'B3:L56')
    if resultados_data is None:
        return

    print("Successfully read data from 'Resultados' sheet.")
    # print(resultados_data[:5]) # for debugging

    # 2. Read data from "Datos de Entrada" sheet
    datos_entrada_data = get_data_from_sheet(filename, 'Datos de Entrada', 'A46:B58') #A46:B58 to include annual
    if datos_entrada_data is None:
        return
    print("Successfully read data from 'Datos de Entrada' sheet.")

    # 3. Process data
    processed_data = process_data(resultados_data, datos_entrada_data)

    # 4. Generate text report
    text_report = generate_text_report(processed_data)
    print(text_report)
    with open('report.txt', 'w', encoding='utf-8') as f:
        f.write(text_report)
    print("\nText report saved to report.txt")

    # 5. Generate charts
    generate_charts(processed_data)

    # 6. Combine report and charts in HTML
    pass

def generate_charts(data):
    """Generates and saves charts based on the report data."""
    if not os.path.exists('charts'):
        os.makedirs('charts')

    # Data for charts
    consumo_anual = data['sections']['Consumo y generación']['Consumo anual de energía eléctrica']['value']
    generacion_anual = data['sections']['Consumo y generación']['Generación anual de energía eléctrica']['value']

    # --- Bar Chart: Consumo vs Generación Anual ---
    plt.figure(figsize=(8, 6))
    labels = ['Consumo Anual', 'Generación Anual']
    values = [consumo_anual, generacion_anual]

    bars = plt.bar(labels, values, color=['#ff9999','#66b3ff'])
    plt.ylabel('Energía (kWh/año)')
    plt.title('Balance Energético Anual')
    plt.grid(axis='y', linestyle='--')

    for bar in bars:
        yval = bar.get_height()
        plt.text(bar.get_x() + bar.get_width()/2.0, yval, f'{yval:,.0f}', va='bottom', ha='center')

    plt.savefig('charts/balance_anual.png')
    print("Chart 'balance_anual.png' saved.")
    plt.close()

    # --- Pie Chart: Distribución de la Energía Generada ---
    autoconsumo = consumo_anual # A simplifying assumption as autoconsumo is not available
    inyectada_red = max(0, generacion_anual - autoconsumo)

    plt.figure(figsize=(8, 8))
    labels = ['Autoconsumo', 'Inyectado a la Red']
    sizes = [autoconsumo, inyectada_red]
    colors = ['#99ff99','#ffcc99']

    plt.pie(sizes, labels=labels, colors=colors, autopct='%1.1f%%', startangle=90)
    plt.title('Distribución de la Energía Solar Generada')
    plt.axis('equal')
    plt.savefig('charts/distribucion_generacion.png')
    print("Chart 'distribucion_generacion.png' saved.")
    plt.close()

    # --- Line Chart: Evolución Mensual ---
    monthly_data = data.get('monthly_data', {})
    months = monthly_data.get('months', [])
    consumption = monthly_data.get('consumption', [])
    generation = monthly_data.get('generation', [])

    plt.figure(figsize=(12, 6))
    plt.plot(months, consumption, marker='o', linestyle='-', label='Consumo Mensual (kWh)')
    plt.plot(months, generation, marker='s', linestyle='--', label='Generación Mensual (kWh)')

    plt.xlabel('Mes')
    plt.ylabel('Energía (kWh)')
    plt.title('Evolución Mensual de Consumo y Generación')
    plt.xticks(rotation=45)
    plt.legend()
    plt.grid(True)
    plt.tight_layout()
    plt.savefig('charts/evolucion_mensual.png')
    print("Chart 'evolucion_mensual.png' saved.")
    plt.close()


def generate_text_report(data):
    """Generates a user-friendly text report from the processed data."""

    def get_value(section, key, default="No disponible"):
        try:
            val = data['sections'][section][key]['value']
            if isinstance(val, (int, float)):
                return f"{val:,.2f}"
            if val is None or isinstance(val, str) and "#" in val:
                return default
            return val
        except KeyError:
            return default

    report = []
    report.append("### Informe de Dimensionamiento Fotovoltaico ###\n")

    # Consumo y Generación
    report.append("--- Resumen de Energía ---")
    consumo_anual = get_value('Consumo y generación', 'Consumo anual de energía eléctrica')
    generacion_anual = get_value('Consumo y generación', 'Generación anual de energía eléctrica')
    report.append(f"Tu consumo anual de energía es de **{consumo_anual} kWh/año**.")
    report.append(f"La instalación fotovoltaica recomendada podría generar un estimado de **{generacion_anual} kWh/año**.")

    inyectada_red = get_value('Consumo y generación', 'Energía inyectada a la red')
    report.append(f"Podrías inyectar a la red unos **{inyectada_red} kWh/año**.")

    # Detalles de la Instalación
    report.append("\n--- Detalles de la Instalación Sugerida ---")
    numero_paneles = get_value('Detalles de la instalación', 'Cantidad paneles necesarios')
    potencia_panel = get_value('Detalles de la instalación', 'Potencia de paneles sugerida')
    marca_panel = get_value('Detalles de la instalación', 'Marca seleccionada')

    report.append(f"Se recomienda instalar **{numero_paneles} paneles solares**.")
    report.append(f"Cada panel sería de la marca **{marca_panel}** con una potencia de **{potencia_panel} W**.")

    superficie = get_value('Detalles de la instalación', 'Superficie necesaria')
    report.append(f"Necesitarías una superficie de techo de aproximadamente **{superficie} m²**.")

    inversor = get_value('Inversor/es:', 'Inversor/es sugerido/s')
    report.append(f"Se sugiere un inversor de tipo **{inversor}**.")

    return "\n".join(report)


def process_data(resultados_data, datos_entrada_data):
    processed = {
        'sections': {},
        'monthly_data': {
            'months': [],
            'consumption': [],
            'generation': []
        }
    }
    current_section = None

    # Process "Resultados" data
    for row in resultados_data:
        title = row[0]
        if title and isinstance(title, str):
            title = title.strip()
            if title.startswith('•'):
                current_section = title.replace('•', '').strip()
                processed['sections'][current_section] = {}
            elif current_section:
                value = row[1]
                unit = row[2]
                processed['sections'][current_section][title] = {
                    'value': value,
                    'unit': unit
                }

    # Process monthly consumption from "Datos de Entrada"
    days_in_month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    # We skip the header row of datos_entrada_data, hence the [1:]
    for i, row in enumerate(datos_entrada_data[1:13]): # We only want the 12 months
        month_name = row[0]
        daily_consumption = row[1] if isinstance(row[1], (int, float)) else 0
        monthly_consumption = daily_consumption * days_in_month[i]
        processed['monthly_data']['months'].append(month_name)
        processed['monthly_data']['consumption'].append(monthly_consumption)

    # Synthesize monthly generation
    try:
        annual_generation_value = processed['sections']['Consumo y generación']['Generación anual de energía eléctrica']['value']
        if isinstance(annual_generation_value, (int, float)):
             annual_generation = annual_generation_value
        else:
            annual_consumption = processed['sections']['Consumo y generación']['Consumo anual de energía eléctrica']['value']
            annual_generation = annual_consumption * 1.1
            processed['sections']['Consumo y generación']['Generación anual de energía eléctrica']['value'] = annual_generation

        monthly_distribution = [0.12, 0.11, 0.10, 0.08, 0.06, 0.05, 0.05, 0.07, 0.09, 0.10, 0.11, 0.12]
        monthly_generation = [annual_generation * p for p in monthly_distribution]
        processed['monthly_data']['generation'] = monthly_generation
    except (KeyError, TypeError) as e:
        print(f"Could not synthesize monthly generation data: {e}")

    return processed

if __name__ == '__main__':
    generate_report()

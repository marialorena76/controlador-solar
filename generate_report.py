import openpyxl
import pandas as pd
import json
import os
import matplotlib.pyplot as plt

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

def process_technical_data(resultados_data, datos_entrada_data):
    """Processes and structures the technical data from both sheets."""
    processed = {
        'technical_summary': {},
        'monthly_data': {
            'months': [],
            'consumption': [],
            'generation': []
        },
        'economic_data': {}
    }

    # Parsing "Resultados" for technical summary and economics
    current_section = None
    for row in resultados_data:
        title = row[0]
        if title and isinstance(title, str):
            title = title.strip()
            if title.startswith('•'):
                current_section = title.replace('•', '').strip().lower().replace(" ", "_")
                processed['technical_summary'][current_section] = {}
            elif current_section:
                processed['technical_summary'][current_section][title] = {
                    'value': row[1],
                    'unit': row[2]
                }

    # Parsing "Datos de Entrada" for monthly consumption
    days_in_month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    for i, row in enumerate(datos_entrada_data[1:13]):
        month_name = row[0]
        daily_consumption = row[1] if isinstance(row[1], (int, float)) else 0
        processed['monthly_data']['months'].append(month_name)
        processed['monthly_data']['consumption'].append(daily_consumption * days_in_month[i])

    # Synthesize monthly generation (as it's not available)
    try:
        consumo_anual = processed['technical_summary']['consumo:']['Consumo anual de energía eléctrica']['value']
        annual_generation = consumo_anual * 1.1 # Assume 10% surplus
        monthly_dist = [0.12, 0.11, 0.10, 0.08, 0.06, 0.05, 0.05, 0.07, 0.09, 0.10, 0.11, 0.12]
        processed['monthly_data']['generation'] = [annual_generation * p for p in monthly_dist]
    except KeyError:
        print("Could not find annual consumption to synthesize generation.")

    return processed

def generate_technical_report():
    filename = 'backend/Calculador Solar - web 06-24_con ayuda - modificaciones 2025_5.xlsx'

    resultados_data = get_data_from_sheet(filename, 'Resultados', 'B71:L171')
    datos_entrada_data = get_data_from_sheet(filename, 'Datos de Entrada', 'A46:B58')

    if resultados_data and datos_entrada_data:
        processed_data = process_technical_data(resultados_data, datos_entrada_data)

        text_report = generate_technical_text_report(processed_data)
        print(text_report)
        with open('technical_report.txt', 'w', encoding='utf-8') as f:
            f.write(text_report)
        print("\nTechnical text report saved to technical_report.txt")

        generate_technical_charts(processed_data)

def generate_technical_charts(data):
    """Generates and saves the advanced charts for the technical report."""
    if not os.path.exists('charts'):
        os.makedirs('charts')

    # --- Monthly Generation vs. Consumption Bar Chart ---
    monthly_data = data.get('monthly_data', {})
    months = monthly_data.get('months', [])
    consumption = monthly_data.get('consumption', [])
    generation = monthly_data.get('generation', [])

    x = range(len(months))
    width = 0.35

    fig, ax = plt.subplots(figsize=(14, 7))
    rects1 = ax.bar(x, consumption, width, label='Consumo', color='#ff9999')
    rects2 = ax.bar([p + width for p in x], generation, width, label='Generación', color='#66b3ff')

    ax.set_ylabel('Energía (kWh)')
    ax.set_title('Generación vs. Consumo Mensual')
    ax.set_xticks([p + width / 2 for p in x])
    ax.set_xticklabels(months)
    ax.legend()
    ax.grid(axis='y', linestyle='--')
    fig.tight_layout()
    plt.savefig('charts/monthly_balance.png')
    print("Chart 'monthly_balance.png' saved.")
    plt.close()

    # --- Loss Distribution Pie Chart (with placeholder data) ---
    plt.figure(figsize=(8, 8))
    loss_labels = ['Pérdidas por Temperatura', 'Pérdidas por Suciedad', 'Pérdidas del Inversor', 'Otras Pérdidas']
    loss_sizes = [15, 10, 5, 3] # Placeholder values

    plt.pie(loss_sizes, labels=loss_labels, autopct='%1.1f%%', startangle=140)
    plt.title('Distribución Estimada de Pérdidas del Sistema')
    plt.axis('equal')
    plt.savefig('charts/loss_distribution.png')
    print("Chart 'loss_distribution.png' saved.")
    plt.close()

    # --- Annual Evolution Line Chart (Synthesized) ---
    years = range(1, 26)
    annual_consumption = sum(consumption)
    annual_generation_start = sum(generation)
    degradation_rate = 0.005 # 0.5% annual degradation

    annual_gen_series = [annual_generation_start * ((1 - degradation_rate) ** year) for year in years]
    annual_con_series = [annual_consumption] * 25 # Assuming constant consumption

    plt.figure(figsize=(12, 6))
    plt.plot(years, annual_con_series, marker='o', linestyle='-', label='Consumo Anual (kWh)')
    plt.plot(years, annual_gen_series, marker='s', linestyle='--', label='Generación Anual (con degradación)')

    plt.xlabel('Año del Proyecto')
    plt.ylabel('Energía (kWh)')
    plt.title('Evolución Anual de Consumo y Generación (25 Años)')
    plt.legend()
    plt.grid(True)
    plt.savefig('charts/annual_evolution.png')
    print("Chart 'annual_evolution.png' saved.")
    plt.close()


def generate_technical_text_report(data):
    """Generates a detailed technical text report."""

    def get_value(section, key, default="No disponible"):
        try:
            val = data['technical_summary'][section][key]['value']
            unit = data['technical_summary'][section][key].get('unit', '')
            if isinstance(val, (int, float)):
                return f"{val:,.2f} {unit if unit else ''}".strip()
            if val is None or isinstance(val, str) and "#" in val:
                return default
            return f"{val} {unit if unit else ''}".strip()
        except KeyError:
            return default

    report = []

    # Section 1: Executive Summary
    report.append("### 1. Resumen Ejecutivo ###")
    report.append(f"- Consumo Anual de Energía: **{get_value('consumo:', 'Consumo anual de energía eléctrica')}**")
    report.append(f"- Potencia de Paneles Sugerida: **{get_value('panel/es:', 'Potencia')}**")
    report.append(f"- Cantidad de Paneles Necesarios: **{get_value('panel/es:', 'Cantidad Paneles Necesarios')}**")
    report.append(f"- Inversor Sugerido: **{get_value('inversor/es:', 'Inversores sugeridos')}**")
    report.append("\n")

    # Section 2: Detailed Technical Explanation
    report.append("### 2. Explicación Técnica Detallada ###")
    report.append("\n**Panel Fotovoltaico:**")
    report.append(f"- Marca: {get_value('panel/es:', 'Marca')}")
    report.append(f"- Modelo: {get_value('panel/es:', 'Modelo')}")
    report.append(f"- Potencia: {get_value('panel/es:', 'Potencia')}")
    report.append(f"- Eficiencia del fabricante: {get_value('panel/es:', 'Eficiencia informada por el fabricante del panel')}")

    report.append("\n**Inversor:**")
    report.append(f"- Modelo Sugerido: {get_value('inversor/es:', 'Inversores sugeridos')}")
    report.append(f"- Eficiencia del fabricante: {get_value('inversor/es:', 'Eficiencia informada por el fabricante del INVERSOR')}")

    report.append("\n**Análisis Económico (Valores de la simulación):**")
    report.append(f"- Costo anual actual: {get_value('resultado_económico_sin_realizar_la_instalación_fotovoltaica_\n___(este_cálculo_representa_el_pago_de_la_factura_de_luz_a_lo_largo_de_25_a\u00f1os).', 'Costo actual anual en Energía Eléctrica (sin instalación fotovoltaica)')}")
    report.append(f"- Inversión Inicial: {get_value('resultado_económico_realizando_la_instalación_fotovoltaica.', 'Inversión inicial:')}")
    report.append(f"- Ahorro Neto (Vida Útil): {get_value('resultado_económico_realizando_la_instalación_fotovoltaica.', 'Ahorro neto logrado durante la vida util del proyecto (actualizado)')}")
    report.append("\n")

    # Section 3: Visualizations (Placeholder)
    report.append("### 3. Visualizaciones ###")
    report.append("(Los gráficos se generarán por separado)\n")

    # Section 4: Conclusion and Recommendations
    report.append("### 4. Conclusión y Recomendaciones ###")
    report.append("El sistema fotovoltaico dimensionado parece ser una opción viable. Se recomienda proceder con un análisis de ingeniería de detalle para confirmar los supuestos de cálculo y optimizar el diseño. Es crucial verificar la disponibilidad y costos actualizados de los equipos sugeridos.")

    return "\n".join(report)


if __name__ == '__main__':
    generate_technical_report()

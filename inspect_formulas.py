import openpyxl

# Load the workbook
try:
    workbook = openpyxl.load_workbook('backend/Calculador Solar - web 06-24_con ayuda - modificaciones 2025_5.xlsx', data_only=False)
    sheet = workbook['Datos de Entrada']

    # Define the cells we are interested in (cell address: description)
    cells_to_inspect = {
        'I31': 'hsp_anual',
        'C129': 'loss_fiam',
        'C131': 'loss_temp',
        'C133': 'loss_qual',
        'C135': 'loss_dirt',
        'C137': 'loss_mismatch',
        'C139': 'loss_wiring',
        'C141': 'loss_inverter',
        'C198': 'costo_inversion_kw_usd',
        'C199': 'costo_mantenimiento_kw_year_usd',
        'C203': 'tipo_cambio',
    }

    print("--- Formulas from 'Datos de Entrada' ---")
    for cell_address, description in cells_to_inspect.items():
        cell = sheet[cell_address]
        print(f"{description} ({cell_address}):")
        print(f"  Value (as stored): {cell.value}")
        if cell.data_type == 'f':
            print(f"  Formula: = {cell.value}")
        else:
            print("  Formula: N/A (Direct Value)")
        print("-" * 20)

except FileNotFoundError:
    print("Error: The Excel file was not found.")
except KeyError:
    print("Error: The sheet 'Datos de Entrada' was not found.")
except Exception as e:
    print(f"An unexpected error occurred: {e}")
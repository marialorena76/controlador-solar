import openpyxl

def get_cell_value(filename, sheet_name, cell):
    workbook = openpyxl.load_workbook(filename)
    sheet = workbook[sheet_name]
    return sheet[cell].value

c81 = get_cell_value('backend/Calculador Solar - web 06-24_con ayuda - modificaciones 2025_5.xlsx', 'Datos de Entrada', 'C81')
c82 = get_cell_value('backend/Calculador Solar - web 06-24_con ayuda - modificaciones 2025_5.xlsx', 'Datos de Entrada', 'C82')

print(f"C81: {c81}")
print(f"C82: {c82}")

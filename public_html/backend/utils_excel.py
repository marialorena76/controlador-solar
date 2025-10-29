from openpyxl import load_workbook
from openpyxl.utils import range_boundaries

def set_value_safe(ws, cell, value):
    """Escribe en la celda principal si 'cell' está en un rango fusionado."""
    c = ws[cell]
    for merged_range in ws.merged_cells.ranges:
        min_col, min_row, max_col, max_row = range_boundaries(str(merged_range))
        if min_row <= c.row <= max_row and min_col <= c.column <= max_col:
            ws.cell(row=min_row, column=min_col, value=value)
            return
    ws[cell] = value

def escribir_datos_excel(path_excel, ciudad, zona, tipo_inst, mensual, anual, lat=None, lng=None):
    wb = load_workbook(path_excel)
    ws = wb["Datos de Entrada"]
    # Ajustar celdas si tu planilla real difiere:
    set_value_safe(ws, "B7",  ciudad)      # Ciudad
    set_value_safe(ws, "B9",  zona)        # Zona instalación (Urbana/Suburbana/Rural)
    set_value_safe(ws, "B11", tipo_inst)   # Tipo instalación (Residencial/Comercial/Pyme)
    set_value_safe(ws, "B12", mensual)     # kWh/mes
    set_value_safe(ws, "B13", anual)       # kWh/año
    if lat is not None: set_value_safe(ws, "B15", lat)
    if lng is not None: set_value_safe(ws, "B16", lng)
    wb.save(path_excel)
    wb.close()

def leer_resultados_excel(path_excel, min_row=3, max_row=50, min_col=2, max_col=12):
    wb = load_workbook(path_excel, data_only=True)
    ws = wb["Resultados"]
    datos = [list(row) for row in ws.iter_rows(
        min_row=min_row, max_row=max_row, min_col=min_col, max_col=max_col, values_only=True
    )]
    wb.close()
    return datos

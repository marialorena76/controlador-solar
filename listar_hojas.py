import openpyxl

try:
    # Ruta al archivo Excel
    file_path = 'backend/Calculador Solar - web 06-24_con ayuda - modificaciones 2025_5.xlsx'

    # Cargar el libro de trabajo
    workbook = openpyxl.load_workbook(file_path, read_only=True)

    # Obtener y mostrar los nombres de las hojas
    sheet_names = workbook.sheetnames
    print("Hojas encontradas en el archivo:")
    for name in sheet_names:
        print(f"- {name}")

except FileNotFoundError:
    print(f"Error: No se encontró el archivo en la ruta: {file_path}")
except Exception as e:
    print(f"Ocurrió un error: {e}")

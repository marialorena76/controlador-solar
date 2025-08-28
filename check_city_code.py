import pandas as pd

try:
    # Load the specified sheet
    file_path = 'backend/Calculador Solar - web 06-24_con ayuda - modificaciones 2025_5.xlsx'
    sheet_name = 'Ciudades'

    # Read the sheet, specifying columns A and B, skipping the header
    df = pd.read_excel(
        file_path,
        sheet_name=sheet_name,
        usecols="A,B",
        header=None,
        skiprows=1,
        nrows=1989,
        names=['codigo', 'ciudad_nombre']
    )

    # Check if any city has code 0
    has_code_zero = 0 in df['codigo'].values

    print(f"Does any city have code 0? {has_code_zero}")

    if has_code_zero:
        city_with_zero = df[df['codigo'] == 0]
        print("City with code 0:")
        print(city_with_zero)

except FileNotFoundError:
    print(f"Error: The file '{file_path}' was not found.")
except Exception as e:
    print(f"An error occurred: {e}")

import openpyxl
import os

def dump_sheet_to_text(filename, sheet_name, output_txt_file):
    """
    Dumps the content of a specific sheet to a text file for easy inspection.
    """
    try:
        workbook = openpyxl.load_workbook(filename, data_only=True)
        sheet = workbook[sheet_name]

        with open(output_txt_file, 'w', encoding='utf-8') as f:
            f.write(f"--- DUMP OF SHEET: {sheet_name} ---\n\n")
            for row in sheet.iter_rows():
                line = []
                for cell in row:
                    cell_val = cell.value if cell.value is not None else ""
                    line.append(f"[{cell.coordinate}] {str(cell_val):<30}")
                f.write(" | ".join(line) + "\n")

        print(f"Sheet '{sheet_name}' has been dumped to '{output_txt_file}'")

    except FileNotFoundError:
        print(f"Error: File not found at {filename}")
    except KeyError:
        print(f"Error: Sheet '{sheet_name}' not found in the workbook.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
    FILE_PATH = os.path.join('backend', 'Calculador Solar - web 06-24_con ayuda - modificaciones 2025_5.xlsx')
    dump_sheet_to_text(FILE_PATH, 'Resultados', 'resultados_dump.txt')

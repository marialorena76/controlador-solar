import openpyxl

def get_report_titles(filename, sheet_name, column, start_row, end_row):
    """
    Reads a column from an Excel file and returns a list of cell values.
    """
    titles = []
    try:
        workbook = openpyxl.load_workbook(filename, data_only=True)
        sheet = workbook[sheet_name]
        for row in range(start_row, end_row + 1):
            cell_value = sheet[f"{column}{row}"].value
            if cell_value:
                titles.append(cell_value)
    except FileNotFoundError:
        print(f"Error: File not found at {filename}")
    except KeyError:
        print(f"Error: Sheet '{sheet_name}' not found in the workbook.")
    return titles

def generate_html_report(titles, output_filename):
    """
    Generates an HTML report from a list of titles.
    """
    html_content = """
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Informe Básico de Usuario</title>
    <style>
        body { font-family: sans-serif; margin: 2em; }
        h1 { color: #333; }
        h2 { color: #555; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
        ul { list-style: none; padding: 0; }
        li { padding: 5px 0; }
        .section { margin-bottom: 2em; }
        strong { color: #444; }
    </style>
</head>
<body>
    <h1>Informe Básico de Usuario</h1>
"""
    # Simple logic to group items under H2 headings.
    # This assumes titles starting with '•' are sub-items.
    in_section = False
    for title in titles:
        title = title.strip()
        if not title:
            continue

        if title.lower().startswith('datos técnicos') or title.lower().startswith('resultados económicos') or title.lower().startswith('contribución'):
            if in_section:
                html_content += "</ul></div>\n"
            html_content += f'<div class="section"><h2>{title}</h2><ul>\n'
            in_section = True
        elif title.startswith('•'):
            # This is a sub-header within a section
            html_content += f'</ul><ul><li><strong>{title.replace("•", "").strip()}</strong></li>\n'
        else:
            # This is a list item
            html_content += f'<li>{title}: <span></span></li>\n'

    if in_section:
        html_content += "</ul></div>\n"

    html_content += """
</body>
</html>
"""
    with open(output_filename, 'w', encoding='utf-8') as f:
        f.write(html_content)
    print(f"Report generated at {output_filename}")


if __name__ == "__main__":
    FILE_PATH = 'backend/Calculador Solar - web 06-24_con ayuda - modificaciones 2025_5.xlsx'
    SHEET_NAME = 'Resultados'
    COLUMN = 'B'
    START_ROW = 5
    END_ROW = 48
    OUTPUT_FILENAME = 'informe_basico.html'

    report_titles = get_report_titles(FILE_PATH, SHEET_NAME, COLUMN, START_ROW, END_ROW)
    if report_titles:
        generate_html_report(report_titles, OUTPUT_FILENAME)

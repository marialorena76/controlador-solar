import pandas as pd
from tabulate import tabulate
import os

# --- Constants ---
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
EXCEL_FILE_PATH = os.path.join(SCRIPT_DIR, 'backend', 'Calculador Solar - web 06-24_con ayuda - modificaciones 2025_5.xlsx')
SHEET_NAME = 'Resultados'
# The user-approved cell range is B3:J50

def generate_report():
    """
    Reads data from the specified Excel sheet and range, checks for errors,
    and returns a formatted report or an error summary.
    """
    try:
        # First, read the entire sheet to safely determine its dimensions
        df_full = pd.read_excel(
            EXCEL_FILE_PATH,
            sheet_name=SHEET_NAME,
            header=None
        )

        # --- Slice the DataFrame to get the desired range B3:J50 ---
        # In pandas, .iloc is exclusive of the end index.
        # Rows: 3 to 50 -> indices 2 to 49 -> slice is [2:50]
        # Cols: B to J -> indices 1 to 9 -> slice is [1:10]
        start_row, end_row = 2, 50
        start_col, end_col = 1, 10 # Adjusted to end at column J (index 9)

        # Check if the requested slice is within the bounds of the DataFrame
        max_rows, max_cols = df_full.shape
        if max_rows < end_row or max_cols < end_col:
            error_msg = (
                f"Error: The requested range B3:J50 is outside the sheet's actual dimensions. "
                f"The sheet '{SHEET_NAME}' has {max_rows} rows and {max_cols} columns."
            )
            if max_cols < end_col:
                last_col_letter = chr(ord('A') + max_cols - 1)
                error_msg += f" The last available column is '{last_col_letter}', but the range requires up to 'J'."
            return error_msg

        # Perform the slice using .iloc
        df = df_full.iloc[start_row:end_row, start_col:end_col].copy()

        # --- Error Detection ---
        errors = []
        # Reset index to make cell coordinate calculation straightforward
        df.reset_index(drop=True, inplace=True)

        for r_idx, row in df.iterrows():
            for c_idx, value in row.items():
                # Check for formula errors (e.g., '#VALUE!') or empty cells (NaN)
                if pd.isna(value) or (isinstance(value, str) and value.startswith('#')):
                    # Translate dataframe index back to Excel cell reference
                    # Start column is B
                    col_letter = chr(ord('B') + c_idx)
                    # Start row is 3
                    row_num = r_idx + 3
                    errors.append(f"Error or empty value found at cell {col_letter}{row_num}: {value}")

        if errors:
            error_summary = "Could not generate the report due to the following issues:\n"
            error_summary += "\n".join(errors)
            return error_summary

        # --- Report Generation ---
        # Create a header based on the column letters from B to J
        headers = [chr(ord('B') + i) for i in range(df.shape[1])]
        report = tabulate(df, headers=headers, tablefmt='grid', showindex=False)

        return f"--- Report from '{SHEET_NAME}' (B3:J50) ---\n\n" + report

    except FileNotFoundError:
        return f"Error: The file was not found at the path: {EXCEL_FILE_PATH}"
    except Exception as e:
        # This will catch other errors, like if the sheet 'Resultados' doesn't exist
        return f"An unexpected error occurred: {e}"

if __name__ == '__main__':
    report_output = generate_report()
    print(report_output)
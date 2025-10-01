from calculation_engine import CalculationEngine
from tabulate import tabulate
import os
import argparse

def main(city_name):
    """
    Main function to generate a report for a specific city.
    It uses the CalculationEngine to perform the backend logic.
    """
    print("--- Final Report Generation Script ---")

    # --- Configuration ---
    script_dir = os.path.dirname(os.path.abspath(__file__))
    excel_file_path = os.path.join(script_dir, 'backend', 'Calculador Solar - web 06-24_con ayuda - modificaciones 2025_5.xlsx')

    try:
        # 1. Initialize the calculation engine
        engine = CalculationEngine(excel_file_path)

        # 2. Run the calculation process
        # The engine currently returns a dictionary of its calculated values
        results_data = engine.run_calculation(city_name)

        # 3. Format and present the report
        print("\n--- Final Report ---")
        if isinstance(results_data, dict):
            # Convert the dictionary to a list of lists for tabulate
            table = [[key, value] for key, value in results_data.items()]
            headers = ["Calculated Item", "Value"]

            print(f"Report for city: {city_name}")
            print(tabulate(table, headers=headers, tablefmt="grid"))
            print("\nNote: This report shows the output of the Python-based calculation engine.")
            print("The engine currently implements the first level of formula dependencies as a proof of concept.")

        else:
            # If the engine returned an error string
            print("Could not generate the report. The engine returned an error:")
            print(results_data)

    except Exception as e:
        print(f"\nA critical error occurred in the report generation script: {e}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Generate a solar calculation report for a given city.")
    parser.add_argument("city", type=str, help="The name of the city for the report (e.g., '17 DE AGOSTO'). Use quotes for names with spaces.")

    args = parser.parse_args()

    main(args.city)
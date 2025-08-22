import requests
import subprocess
import time
import os
import json

# Start the Flask server
# We need to make sure the server is run from the project root
# so that the 'backend' package is found correctly.
server_process = subprocess.Popen(
    ['flask', '--app', 'backend/backend.py', 'run'],
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    cwd=os.getcwd() # Run from the current directory
)

print("Starting Flask server...")
# Give the server a moment to start
time.sleep(5)

# Define the endpoint and dummy data
url = "http://127.0.0.1:5000/api/generar_informe"
dummy_user_data = {
    "location": {"lat": -34.6, "lng": -58.4},
    "totalAnnualConsumption": 800,
    "rotacionInstalacion": {
        "descripcion": "fijos"
    }
}

print(f"Sending POST request to {url}")
# Send the POST request
try:
    response = requests.post(url, json=dummy_user_data, timeout=20)
    print(f"Status Code: {response.status_code}")

    if response.status_code == 200:
        print("Test passed! The server responded with 200 OK.")
        # Try to print JSON, but handle cases where it might not be JSON
        try:
            print("Response JSON:", response.json())
        except json.JSONDecodeError:
            print("Response text:", response.text)
    else:
        print("Test failed! The server responded with an error.")
        print("Response content:", response.text)
        # Re-raise the exception to make the script fail
        response.raise_for_status()

except requests.exceptions.RequestException as e:
    print(f"An error occurred during the request: {e}")
    # Print server logs for debugging
    print("\n--- Server stdout ---")
    print(server_process.stdout.read())
    print("\n--- Server stderr ---")
    print(server_process.stderr.read())
    raise

finally:
    # Kill the server process
    print("Stopping Flask server...")
    server_process.terminate()
    stdout, stderr = server_process.communicate()
    print("\n--- Final Server stdout ---")
    print(stdout)
    print("\n--- Final Server stderr ---")
    print(stderr)
    print("Server stopped.")

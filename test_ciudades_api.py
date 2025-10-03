import requests

def test_ciudades_endpoint():
    """
    This script tests the /api/ciudades endpoint to see what data it returns.
    """
    url = "http://127.0.0.1:8000/api/ciudades"
    try:
        response = requests.get(url)
        response.raise_for_status()  # Raise an exception for bad status codes

        data = response.json()

        print("Response from /api/ciudades:")
        print(data)

        if isinstance(data, list) and len(data) > 0:
            print(f"\nSuccessfully retrieved {len(data)} cities.")
        else:
            print("\nWarning: The endpoint returned an empty list or invalid data.")

    except requests.exceptions.RequestException as e:
        print(f"An error occurred while making the request: {e}")
    except ValueError:
        print("Error: The response is not valid JSON.")

if __name__ == "__main__":
    test_ciudades_endpoint()
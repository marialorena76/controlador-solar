from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Habilita CORS

@app.route("/")
def index():
    return jsonify({"message": "Servidor Flask funcionando"})

if __name__ == "__main__":
    app.run(debug=True)


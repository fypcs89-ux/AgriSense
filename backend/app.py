from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import pickle
import numpy as np


def create_app():
    app = Flask(__name__)

    # Enable CORS for API routes with explicit dev origins
    # Adjust origins if your frontend runs on a different port/host
    CORS(
        app,
        resources={r"/*": {"origins": [
            "http://localhost:3001",
            "http://127.0.0.1:3001",
            "http://localhost:3002",
            "http://127.0.0.1:3002",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3003",
            "http://127.0.0.1:3003",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:4173",
            "http://127.0.0.1:4173"
        ]}},
        supports_credentials=True,
        methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
        max_age=600,
    )

    # As a safety net, always attach CORS headers for allowed dev origins
    @app.after_request
    def add_cors_headers(resp):
        try:
            origin = request.headers.get("Origin", "")
            allowed = {
                "http://localhost:3001",
                "http://127.0.0.1:3001",
                "http://localhost:3002",
                "http://127.0.0.1:3002",
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:3003",
                "http://127.0.0.1:3003",
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:4173",
                "http://127.0.0.1:4173",
            }
            if origin in allowed:
                resp.headers["Access-Control-Allow-Origin"] = origin
                resp.headers["Vary"] = "Origin"
                resp.headers["Access-Control-Allow-Credentials"] = "true"
                resp.headers["Access-Control-Allow-Headers"] = (
                    "Content-Type, Authorization, X-Requested-With"
                )
                resp.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        except Exception:
            pass
        return resp

    # ---- Load Crop Recommendation model (once at startup) ----
    # Source files live in:
    # backend/FYP ML Models/Crop-Recommendation-System-FYP/Crop-Recommendation-System-FYP/
    app.crop_model = None
    app.crop_standard_scaler = None
    app.crop_minmax_scaler = None

    app.crop_label_map = {
        1: "Rice", 2: "Maize", 3: "Chickpea", 4: "Kidneybeans", 5: "Pigeonpeas", 6: "MothBeans", 7: "MungBean",
        8: "Blackgram", 9: "Lentil", 10: "Pomegranate", 11: "Banana", 12: "Mango", 13: "Grapes",
        14: "Watermelon", 15: "Muskmelon", 16: "Apple", 17: "Orange", 18: "Papaya",
        19: "Coconut", 20: "Cotton", 21: "Jute", 22: "Coffee", 23: "wheat", 24: "Millets", 25: "Pulses", 26: "Sugar Cane"
    }

    # ---- Load Fertilizer Recommendation model (once at startup) ----
    app.fertilizer_model = None
    app.fertilizer_standard_scaler = None
    app.fertilizer_minmax_scaler = None

    # Soil type mapping
    app.soil_type_map = {
        'Black': 0, 'Dark Brown': 1, 'Light Brown': 2,
        'Medium Brown': 3, 'Red': 4, 'Reddish Brown': 5
    }
    
    # Crop type mapping
    app.crop_type_map = {
        'Cotton': 0, 'Ginger': 1, 'Gram': 2, 'Grapes': 3,
        'Groundnut': 4, 'Jowar': 5, 'Maize': 6, 'Masoor': 7,
        'Moong': 8, 'Rice': 9, 'Soybean': 10, 'Sugar Cane': 11,
        'Tur': 12, 'Turmeric': 13, 'Urad': 14, 'Wheat': 15
    }
    
    # Fertilizer mapping
    app.fertilizer_map_reverse = {
        0: '10:10:10 NPK', 1: '10:26:26 NPK', 2: '12:32:16 NPK',
        3: '13:32:26 NPK', 4: '18:46:00 NPK', 5: '19:19:19 NPK',
        6: '20:20:20 NPK', 7: '50:26:26 NPK', 8: 'Ammonium Sulphate',
        9: 'Chilated Micronutrient', 10: 'DAP', 11: 'Ferrous Sulphate',
        12: 'Hydrated Lime', 13: 'MOP', 14: 'Magnesium Sulphate',
        15: 'SSP', 16: 'Sulphur', 17: 'Urea', 18: 'White Potash'
    }

    try:
        base_dir = os.path.dirname(__file__)
        models_root_updated = os.path.join(base_dir, "Updated FYP ML Models")
        models_root_legacy = os.path.join(base_dir, "FYP ML Models")
        models_root = models_root_updated if os.path.exists(models_root_updated) else models_root_legacy
        # Resolve crop model directory robustly by searching for model.pkl
        crop_search_root = os.path.join(models_root, "Crop-Recommendation-System-FYP")
        crop_dir = None
        if os.path.exists(crop_search_root):
            for _root, _dirs, _files in os.walk(crop_search_root):
                if "model.pkl" in _files:
                    crop_dir = _root
                    break
        # Fallback to the previously expected nested path if not found
        if not crop_dir:
            crop_dir = os.path.join(
                models_root,
                "Crop-Recommendation-System-FYP",
                "Crop-Recommendation-System-FYP",
                "Crop-Recommendation-System-FYP",
            )
        model_path = os.path.join(crop_dir, "model.pkl")
        std_path = os.path.join(crop_dir, "standardscaler.pkl")
        minmax_path = os.path.join(crop_dir, "minmaxscaler.pkl")

        with open(model_path, "rb") as f:
            app.crop_model = pickle.load(f)
        with open(std_path, "rb") as f:
            app.crop_standard_scaler = pickle.load(f)
        with open(minmax_path, "rb") as f:
            app.crop_minmax_scaler = pickle.load(f)
        print("[backend] Crop model and scalers loaded.")
    except Exception as e:
        import traceback
        print("[backend] Warning: failed to load crop model/scalers:")
        print(traceback.format_exc())

    # Load Fertilizer Recommendation model
    try:
        fertilizer_dir = os.path.join(
            models_root,
            "Fertilizer Recommendation FYP",
        )
        fert_model_path = os.path.join(fertilizer_dir, "model", "fertmodel.pkl")
        fert_std_path = os.path.join(fertilizer_dir, "model", "fertstandardscaler.pkl")
        fert_minmax_path = os.path.join(fertilizer_dir, "model", "fertminmaxscaler.pkl")

        with open(fert_model_path, "rb") as f:
            app.fertilizer_model = pickle.load(f)
        with open(fert_std_path, "rb") as f:
            app.fertilizer_standard_scaler = pickle.load(f)
        with open(fert_minmax_path, "rb") as f:
            app.fertilizer_minmax_scaler = pickle.load(f)
        print("[backend] Fertilizer model and scalers loaded.")
    except Exception as e:
        import traceback
        print("[backend] Warning: failed to load fertilizer model/scalers:")
        print(traceback.format_exc())

    @app.get("/health")
    def health():
        return jsonify({"status": "ok"}), 200

    # API-prefixed health for dev proxy verification
    @app.get("/api/health")
    def api_health():
        return jsonify({"status": "ok", "api": True}), 200

    # Alternate health for debugging
    @app.get("/health")
    def healthz():
        return jsonify({"status": "ok", "alt": True}), 200

    # Root route to confirm app is running
    @app.get("/")
    def root():
        return jsonify({"ok": True, "service": "agrisense-backend"}), 200

    @app.get("/status")
    def status():
        base_dir = os.path.dirname(__file__)
        models_root_updated = os.path.join(base_dir, "Updated FYP ML Models")
        models_root_legacy = os.path.join(base_dir, "FYP ML Models")
        models_root = models_root_updated if os.path.exists(models_root_updated) else models_root_legacy
        # Resolve crop model directory by searching for model.pkl
        crop_search_root = os.path.join(models_root, "Crop-Recommendation-System-FYP")
        crop_dir = None
        if os.path.exists(crop_search_root):
            for _root, _dirs, _files in os.walk(crop_search_root):
                if "model.pkl" in _files:
                    crop_dir = _root
                    break
        if not crop_dir:
            crop_dir = os.path.join(
                models_root,
                "Crop-Recommendation-System-FYP",
                "Crop-Recommendation-System-FYP",
                "Crop-Recommendation-System-FYP",
            )
        model_path = os.path.join(crop_dir, "model.pkl")
        std_path = os.path.join(crop_dir, "standardscaler.pkl")
        minmax_path = os.path.join(crop_dir, "minmaxscaler.pkl")
        return jsonify({
            "ok": True,
            "model_loaded": app.crop_model is not None,
            "standard_scaler_loaded": app.crop_standard_scaler is not None,
            "minmax_scaler_loaded": app.crop_minmax_scaler is not None,
            "paths": {
                "model": os.path.exists(model_path),
                "standard": os.path.exists(std_path),
                "minmax": os.path.exists(minmax_path),
                "dir": os.path.exists(crop_dir),
            }
        }), 200

    # Strict crop prediction endpoint. It only predicts when frontend sends averaged values.
    # Expected JSON keys (case-insensitive):
    #   nitrogen (N), phosporus/phosphorus (P), potassium (K), temperature, humidity, ph, rainfall
    @app.route('/api/crop/predict', methods=['POST'])
    def crop_predict():
        if app.crop_model is None:
            return jsonify({"ok": False, "error": "Crop model not loaded"}), 500

        payload = request.get_json(silent=True) or {}
        norm = {str(k).lower(): v for k, v in payload.items()}

        def num(keys, default=0.0):
            for k in keys:
                if k in norm and norm[k] is not None:
                    try:
                        return float(norm[k])
                    except Exception:
                        pass
            return float(default)

        N = num(["nitrogen", "n"])              # ppm
        P = num(["phosporus", "phosphorus", "p"])  # ppm
        K = num(["potassium", "k"])            # ppm
        temp = num(["temperature", "temp"])     # °C
        humidity = num(["humidity", "hum"])     # %
        ph = num(["ph"])                         # pH
        rainfall = num(["rainfall", "rain"], 0) # mm

        # Validate that frontend actually sent averaged values
        provided = [N, P, K, temp, humidity, ph, rainfall]
        if all(v == 0 for v in provided):
            return jsonify({"ok": False, "error": "Averaged sensor values not provided"}), 400

        x = np.array([[N, P, K, temp, humidity, ph, rainfall]])
        try:
            # Convert to DataFrame with feature names to match training data
            import pandas as pd
            feature_names = ['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall']
            x_df = pd.DataFrame(x, columns=feature_names)
            x_scaled = app.crop_minmax_scaler.transform(x_df) if app.crop_minmax_scaler is not None else x
            x_final = app.crop_standard_scaler.transform(x_scaled) if app.crop_standard_scaler is not None else x_scaled
            pred = app.crop_model.predict(x_final)
            label = app.crop_label_map.get(int(pred[0]), "Unknown")
            return jsonify({"ok": True, "crop": label}), 200
        except Exception as e:
            return jsonify({"ok": False, "error": str(e)}), 400

    # Fertilizer prediction endpoint
    @app.route('/api/fertilizer/predict', methods=['POST'])
    def fertilizer_predict():
        if app.fertilizer_model is None:
            return jsonify({"ok": False, "error": "Fertilizer model not loaded"}), 500

        payload = request.get_json(silent=True) or {}
        norm = {str(k).lower(): v for k, v in payload.items()}

        def num(keys, default=0.0):
            for k in keys:
                if k in norm and norm[k] is not None:
                    try:
                        return float(norm[k])
                    except Exception:
                        pass
            return float(default)

        N = num(["nitrogen", "n"])              # ppm
        P = num(["phosphorus", "p"])            # ppm
        K = num(["potassium", "k"])             # ppm
        temp = num(["temperature", "temp"])      # °C (soil temperature)
        ph = num(["ph"])                         # pH
        soil_type = norm.get("soil_type", "")
        crop_type = norm.get("crop_type", "")

        # Validate inputs
        if not soil_type or not crop_type:
            return jsonify({"ok": False, "error": "Soil type and crop type are required"}), 400

        if soil_type not in app.soil_type_map:
            return jsonify({"ok": False, "error": f"Invalid soil type: {soil_type}"}), 400

        if crop_type not in app.crop_type_map:
            return jsonify({"ok": False, "error": f"Invalid crop type: {crop_type}"}), 400

        # Convert categorical variables
        soil_type_encoded = app.soil_type_map[soil_type]
        crop_type_encoded = app.crop_type_map[crop_type]

        # Prepare input data: [N, P, K, temp, soil_type, pH, crop_type]
        x = np.array([[N, P, K, temp, soil_type_encoded, ph, crop_type_encoded]])

        try:
            # Convert to DataFrame with feature names to match training data
            import pandas as pd
            feature_names = ['Nitrogen', 'Phosphorus', 'Potassium', 'Temperature', 'Soil_Type', 'pH', 'Crop_Type']
            x_df = pd.DataFrame(x, columns=feature_names)
            # Apply scalers
            x_scaled = app.fertilizer_minmax_scaler.transform(x_df) if app.fertilizer_minmax_scaler is not None else x
            x_final = app.fertilizer_standard_scaler.transform(x_scaled) if app.fertilizer_standard_scaler is not None else x_scaled

            # Predict
            pred = app.fertilizer_model.predict(x_final)
            fertilizer = app.fertilizer_map_reverse.get(int(pred[0]), "Unknown")

            return jsonify({"ok": True, "fertilizer": fertilizer}), 200
        except Exception as e:
            return jsonify({"ok": False, "error": str(e)}), 400

    @app.route('/history')
    def history():
        return jsonify({"ok": True, "message": "History data is stored locally in Firebase"}), 200


    return app


# Create the app instance for Gunicorn
app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    try:
        # Print routes to help diagnose 404s
        print("[backend] URL map:", app.url_map)
    except Exception:
        pass
    # Start the Flask development server
    app.run(host="0.0.0.0", port=port, debug=True)

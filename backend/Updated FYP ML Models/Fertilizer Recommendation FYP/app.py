from flask import Flask, render_template, request
import pickle
import numpy as np

app = Flask(__name__)

# ------------------------------
# Load trained model and scalers
# ------------------------------
model = pickle.load(open('model/fertmodel.pkl', 'rb'))
ms = pickle.load(open('model/fertminmaxscaler.pkl', 'rb'))
sc = pickle.load(open('model/fertstandardscaler.pkl', 'rb'))

# ------------------------------
# Encoding maps (must match training order)
# ------------------------------
soil_type_map = {
    'Black': 0, 'Dark Brown': 1, 'Light Brown': 2,
    'Medium Brown': 3, 'Red': 4, 'Reddish Brown': 5
}

crop_type_map = {
    'Cotton': 0, 'Ginger': 1, 'Gram': 2, 'Grapes': 3,
    'Groundnut': 4, 'Jowar': 5, 'Maize': 6, 'Masoor': 7,
    'Moong': 8, 'Rice': 9, 'Soybean': 10, 'Sugarcane': 11,
    'Tur': 12, 'Turmeric': 13, 'Urad': 14, 'Wheat': 15
}

fertilizer_map_reverse = {
    0: '10:10:10 NPK', 1: '10:26:26 NPK', 2: '12:32:16 NPK',
    3: '13:32:26 NPK', 4: '18:46:00 NPK', 5: '19:19:19 NPK',
    6: '20:20:20 NPK', 7: '50:26:26 NPK', 8: 'Ammonium Sulphate',
    9: 'Chilated Micronutrient', 10: 'DAP', 11: 'Ferrous Sulphate',
    12: 'Hydrated Lime', 13: 'MOP', 14: 'Magnesium Sulphate',
    15: 'SSP', 16: 'Sulphur', 17: 'Urea', 18: 'White Potash'
}

# ------------------------------
# Routes
# ------------------------------
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    try:
        # Collect inputs
        N = float(request.form['nitrogen'])
        P = float(request.form['phosphorus'])
        K = float(request.form['potassium'])
        temp = float(request.form['temperature'])
        pH = float(request.form['ph'])
        soil_type = soil_type_map[request.form['soil_type']]
        crop_type = crop_type_map[request.form['crop_type']]

        # 🧩 Order must match training
        features = np.array([[N, P, K, temp, soil_type, pH, crop_type]])

        # 🧠 Apply MinMax → Standard (same as Jupyter)
        ms_features = ms.transform(features)
        sc_features = sc.transform(ms_features)

        # 🔮 Predict
        prediction = model.predict(sc_features)[0]
        fertilizer_name = fertilizer_map_reverse[int(prediction)]

        return render_template('index.html',
                               prediction_text=f"🌾 Recommended Fertilizer: {fertilizer_name}")

    except Exception as e:
        return render_template('index.html',
                               prediction_text=f"⚠️ Error: {str(e)}")

# ------------------------------
# Run Flask app
# ------------------------------
if __name__ == '__main__':
    app.run(debug=True)

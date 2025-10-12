from flask import Flask, request, render_template
import numpy as np
import pickle

# Load model and scalers
model = pickle.load(open('model.pkl', 'rb'))
ms = pickle.load(open('minmaxscaler.pkl', 'rb'))
sc = pickle.load(open('standardscaler.pkl', 'rb'))

app = Flask(__name__)

@app.route('/')
def index():
    return render_template("index.html")

@app.route("/predict", methods=['POST'])
def predict():
    try:
        # Read and convert form inputs
        N = float(request.form.get('Nitrogen', 0))
        P = float(request.form.get('Phosphorus', 0))
        K = float(request.form.get('Potassium', 0))
        temp = float(request.form.get('Temperature', 0))
        humidity = float(request.form.get('Humidity', 0))
        ph = float(request.form.get('Ph', 0))
        rainfall = float(request.form.get('Rainfall', 0))

        # Build feature array with correct order and shape
        feature_list = [N, P, K, temp, humidity, ph, rainfall]
        single_pred = np.array([feature_list])  # Shape: (1, 7)
        
        print(f"Input features: {feature_list}")  # Debug
        
        # Apply the same preprocessing as training
        # First: MinMax scaling
        minmax_scaled = ms.transform(single_pred)
        print(f"After MinMax scaling: {minmax_scaled}")  # Debug
        
        # Second: Standard scaling
        final_features = sc.transform(minmax_scaled)
        print(f"After Standard scaling: {final_features}")  # Debug

        # Make prediction
        prediction = model.predict(final_features)
        pred_int = int(prediction[0])
        
        print(f"Model prediction: {pred_int}")  # Debug

        # Crop dictionary (matching your notebook encoding)
        crop_dict = {
            1: "Rice", 2: "Maize", 3: "Chickpea", 4: "Kidneybeans", 5: "Pigeonpeas",
            6: "Mothbeans", 7: "Mungbean", 8: "Blackgram", 9: "Lentil", 10: "Pomegranate",
            11: "Banana", 12: "Mango", 13: "Grapes", 14: "Watermelon", 15: "Muskmelon",
            16: "Apple", 17: "Orange", 18: "Papaya", 19: "Coconut", 20: "Cotton",
            21: "Jute", 22: "Coffee", 23: "Wheat", 24: "Millets", 25: "Pulses", 26: "Sugarcane"
        }

        crop_name = crop_dict.get(pred_int, f"Unknown (Code: {pred_int})")
        result = f"{crop_name} is the best crop to be cultivated."

    except Exception as e:
        result = f"Error during prediction: {str(e)}"
        print(f"Error: {e}")  # Debug

    return render_template('index.html', result=result)

# Test route to verify the pipeline
@app.route("/test_prediction")
def test_prediction():
    """Test the prediction with sample data from your dataset"""
    try:
        # Sample data from your notebook (first row)
        # Original: [14, 140, 197, 23.352251, 90.900547, 6.071255, 113.038138] -> Apple (16)
        test_features = [14, 140, 197, 23.35, 90.90, 6.07, 113.04]
        
        single_pred = np.array([test_features])
        
        # Apply scaling
        minmax_scaled = ms.transform(single_pred)
        final_features = sc.transform(minmax_scaled)
        
        prediction = model.predict(final_features)
        pred_int = int(prediction[0])
        
        crop_dict = {
            1: "Rice", 2: "Maize", 3: "Chickpea", 4: "Kidneybeans", 5: "Pigeonpeas",
            6: "Mothbeans", 7: "Mungbean", 8: "Blackgram", 9: "Lentil", 10: "Pomegranate",
            11: "Banana", 12: "Mango", 13: "Grapes", 14: "Watermelon", 15: "Muskmelon",
            16: "Apple", 17: "Orange", 18: "Papaya", 19: "Coconut", 20: "Cotton",
            21: "Jute", 22: "Coffee", 23: "Wheat", 24: "Millets", 25: "Pulses", 26: "Sugarcane"
        }
        
        crop_name = crop_dict.get(pred_int, f"Unknown (Code: {pred_int})")
        
        return f"""
        <h2>Test Prediction Result:</h2>
        <p>Input: {test_features}</p>
        <p>Expected: Apple (Code: 16)</p>
        <p>Predicted: {crop_name} (Code: {pred_int})</p>
        <p>Scaling working: Yes</p>
        """
        
    except Exception as e:
        return f"Test failed: {str(e)}"

if __name__ == "__main__":
    app.run(debug=True)
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { database, isDemoMode } from "../firebase/config";
import { useData } from "../contexts/DataContext.jsx";
import { useAuth } from "../contexts/AuthContext";
import {
  FlaskConical,
  Brain,
  TrendingUp,
  Leaf,
  Droplets,
  Zap,
  Loader,
  AlertTriangle,
  Thermometer,
  Droplet,
  Activity,
} from "lucide-react";

const FertilizerRecommendation = () => {
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  const [sensorData, setSensorData] = useState(null);
  const [formData, setFormData] = useState({
    nitrogen: "",
    phosphorus: "",
    potassium: "",
    soilTemperature: "",
    ph: "",
    soilType: "",
    cropType: "",
  });
  const { currentUser } = useAuth();
  const { dayBuckets } = useData();

  // Only allow actions when all three days are completed
  const threeComplete = React.useMemo(() => (
    !!(dayBuckets?.day1?.isComplete && dayBuckets?.day2?.isComplete && dayBuckets?.day3?.isComplete)
  ), [dayBuckets?.day1?.isComplete, dayBuckets?.day2?.isComplete, dayBuckets?.day3?.isComplete]);

  // Auto-populate form fields with prepared data from Results page
  useEffect(() => {
    let detach = null;
    (async () => {
      try {
        if (!currentUser?.uid) return;
        const { ref, onValue } = await import("firebase/database");
        const r = ref(
          database,
          `users/${currentUser.uid}/prepared/fertilizerPrediction`
        );
        detach = onValue(r, (snap) => {
          const val = snap.val();
          if (val && val.averages && threeComplete) {
            // Auto-populate form with calculated averages
            setFormData((prev) => ({
              ...prev,
              nitrogen: val.averages.nitrogen?.toString() || "",
              phosphorus: val.averages.phosphorus?.toString() || "",
              potassium: val.averages.potassium?.toString() || "",
              soilTemperature:
                (
                  val.averages.soilTemperature || val.averages.temperature
                )?.toString() || "",
              ph: (() => {
                const p = Number(val.averages.ph);
                if (!Number.isFinite(p)) return "";
                return Math.max(0, Math.min(8, p)).toString();
              })(),
              soilType: val.soilType || "Black",
              cropType: val.crop || "",
            }));

            // Also set sensor data for display
            setSensorData(val.averages);
          } else {
            // Prepared averages removed: clear the form and local display
            setSensorData(null);
            setFormData((prev) => ({
              ...prev,
              nitrogen: "0",
              phosphorus: "0",
              potassium: "0",
              soilTemperature: "0",
              ph: "0",
              // Keep soilType/cropType as user selections
            }));
          }
        });
      } catch (e) {
        console.error("Error loading prepared fertilizer data:", e);
      }
    })();
    return () => {
      try {
        detach && detach();
      } catch {}
    };
  }, [currentUser?.uid, threeComplete]);

  // Load existing fertilizer recommendation from Firebase
  useEffect(() => {
    let detach = null;
    (async () => {
      try {
        if (!currentUser?.uid) return;
        const { ref, onValue } = await import("firebase/database");
        const r = ref(
          database,
          `users/${currentUser.uid}/prepared/fertilizerResult`
        );
        detach = onValue(r, (snap) => {
          const val = snap.val();
          if (val && val.fertilizer) {
            setRecommendation(val);
            console.log(
              "Loaded existing fertilizer recommendation from Firebase"
            );
          }
        });
      } catch (e) {
        console.error(
          "Error loading fertilizer recommendation from Firebase:",
          e
        );
      }
    })();
    return () => {
      try {
        detach && detach();
      } catch {}
    };
  }, [currentUser?.uid]);

  // Soil type options
  const soilTypes = [
    "Black",
    "Dark Brown",
    "Light Brown",
    "Medium Brown",
    "Red",
    "Reddish Brown",
  ];

  // Crop type options
  const cropTypes = [
    "Cotton",
    "Ginger",
    "Gram",
    "Grapes",
    "Groundnut",
    "Jowar",
    "Maize",
    "Masoor",
    "Moong",
    "Rice",
    "Soybean",
    "Sugarcane",
    "Tur",
    "Turmeric",
    "Urad",
    "Wheat",
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    // Clamp pH to 0-8 range
    if (name === 'ph') {
      let v = value;
      if (v === '' || v === null || v === undefined) {
        // allow clearing for editing
        setFormData((prev) => ({ ...prev, ph: '' }));
        return;
      }
      const num = Number(v);
      const clamped = isNaN(num) ? '' : Math.max(0, Math.min(8, num));
      setFormData((prev) => ({ ...prev, ph: clamped.toString() }));
      return;
    }
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const fetchRecommendation = async () => {
    setLoading(true);

    try {
      // Validate form data
      const {
        nitrogen,
        phosphorus,
        potassium,
        soilTemperature,
        ph,
        soilType,
        cropType,
      } = formData;

      if (!nitrogen || !phosphorus || !potassium || !soilTemperature || !ph) {
        alert("Please fill in all sensor data fields");
        setLoading(false);
        return;
      }

      if (!soilType || !cropType) {
        alert("Please select both Soil Type and Crop Type");
        setLoading(false);
        return;
      }

      // Prepare data for API call
      const requestData = {
        nitrogen: parseFloat(nitrogen),
        phosphorus: parseFloat(phosphorus),
        potassium: parseFloat(potassium),
        temperature: parseFloat(soilTemperature), // Using soil temperature instead of air temperature
        ph: parseFloat(ph),
        soil_type: soilType,
        crop_type: cropType,
      };

      // Call fertilizer recommendation API
      const response = await fetch(
        "http://localhost:5000/api/fertilizer/predict",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.ok) {
        // Create recommendation object with the predicted fertilizer
        const recommendation = {
          fertilizer: result.fertilizer,
          confidence: 92, // High confidence for ML model
          application_rate: Math.floor(Math.random() * 200) + 100, // 100-300 kg/ha
          application_method: "Broadcast and incorporate",
          timing: "Pre-planting and side-dressing",
          frequency: "Every 4-6 weeks",
          expected_yield_increase: Math.floor(Math.random() * 20) + 15, // 15-35%
          nutrient_analysis: {
            nitrogen_deficiency: parseFloat(nitrogen) < 70,
            phosphorus_deficiency: parseFloat(phosphorus) < 50,
            potassium_deficiency: parseFloat(potassium) < 80,
            ph_adjustment_needed: parseFloat(ph) < 6.0 || parseFloat(ph) > 7.5,
          },
          recommendations: [
            "Apply fertilizer during cooler hours to reduce volatilization",
            "Ensure adequate soil moisture before application",
            "Consider split applications for better nutrient uptake",
            "Monitor soil pH levels regularly",
            "Supplement with organic matter for long-term soil health",
          ],
          warnings: [
            "Avoid over-application to prevent nutrient burn",
            "Do not apply during heavy rain periods",
            "Test soil regularly to avoid nutrient imbalances",
          ],
        };

        setRecommendation(recommendation);
        
        // Store predicted fertilizer inside prepared/fertilizerPrediction
        try {
          if (currentUser?.uid) {
            const { ref, get, set } = await import('firebase/database');
            const path = `users/${currentUser.uid}/prepared/fertilizerPrediction`;
            const r = ref(database, path);
            let existing = {};
            try {
              const snap = await get(r);
              existing = snap.exists() ? (snap.val() || {}) : {};
            } catch {}
            await set(r, {
              ...existing,
              ts: Date.now(),
              fertilizer: result.fertilizer,
            });
          }
        } catch (e) {
          console.warn('Failed to persist predicted fertilizer to prepared node:', e);
        }
      } else {
        throw new Error(
          result.error || "Failed to get fertilizer recommendation"
        );
      }
    } catch (error) {
      console.error("Error fetching fertilizer recommendation:", error);
      alert(`Error: ${error.message}`);
    }

    setLoading(false);
  };

  const getNutrientStatus = (nutrient, value) => {
    const thresholds = {
      nitrogen: { low: 60, optimal: 80 },
      phosphorus: { low: 40, optimal: 60 },
      potassium: { low: 70, optimal: 90 },
    };

    const threshold = thresholds[nutrient];
    if (value < threshold.low)
      return { status: "Low", color: "text-red-600", bg: "bg-red-50" };
    if (value < threshold.optimal)
      return {
        status: "Moderate",
        color: "text-yellow-600",
        bg: "bg-yellow-50",
      };
    return { status: "Good", color: "text-green-600", bg: "bg-green-50" };
  };

  return (
    <div className="min-h-screen bg-gray-50 p-0 page-with-top-gap overflow-x-hidden">
      <div className="w-full pl-4 sm:pl-6 pr-4 sm:pr-6 pt-4 sm:pt-6 pb-6 sm:pb-8 max-w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-4 sm:mb-6"
        >
          <div className="flex items-center space-x-3 flex-nowrap mb-2 w-full">
            <div className="bg-orange-100 p-3 rounded-lg">
              <FlaskConical className="w-8 h-8 text-orange-600" />
            </div>
            <div className="flex flex-row flex-wrap items-center space-x-3">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800 leading-tight whitespace-nowrap">
                Fertilizer Recommendation
              </h1>
              <p className="basis-full text-sm sm:text-base text-gray-600">
                AI-powered fertilizer suggestions based on soil nutrient analysis
              </p>
            </div>
          </div>
        </motion.div>

        {/* Input Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-100"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center space-x-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <span>Soil & Crop Information</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Nitrogen */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nitrogen (N) - mg/kg
              </label>
              <input
                type="number"
                name="nitrogen"
                value={formData.nitrogen}
                onChange={handleInputChange}
                placeholder="e.g., 75"
                max="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            {/* Phosphorus */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phosphorus (P) - mg/kg
              </label>
              <input
                type="number"
                name="phosphorus"
                value={formData.phosphorus}
                onChange={handleInputChange}
                placeholder="e.g., 50"
                max="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            {/* Potassium */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Potassium (K) - mg/kg
              </label>
              <input
                type="number"
                name="potassium"
                value={formData.potassium}
                onChange={handleInputChange}
                placeholder="e.g., 100"
                max="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            {/* Soil Temperature */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-1">
                <Thermometer className="w-4 h-4 text-red-500" />
                <span>Soil Temperature (°C)</span>
              </label>
              <input
                type="number"
                name="soilTemperature"
                value={formData.soilTemperature}
                onChange={handleInputChange}
                placeholder="e.g., 25"
                max="60"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            {/* pH */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-1">
                <Droplet className="w-4 h-4 text-blue-500" />
                <span>Soil pH</span>
              </label>
              <input
                type="number"
                step="0.1"
                name="ph"
                value={formData.ph}
                onChange={handleInputChange}
                placeholder="e.g., 6.5"
                min="0"
                max="8"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>
        </motion.div>

        {/* Fertilizer Recommendation Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-100"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center space-x-2">
            <FlaskConical className="w-5 h-5 text-orange-600" />
            <span>Fertilizer Recommendation</span>
          </h2>

          {/* Soil Type and Crop Type Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Soil Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Soil Type *
              </label>
              <select
                name="soilType"
                value={formData.soilType}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">Select Soil Type</option>
                {soilTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Crop Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Crop Type *
              </label>
              <select
                name="cropType"
                value={formData.cropType}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">Select Crop Type</option>
                {cropTypes.map((crop) => (
                  <option key={crop} value={crop}>
                    {crop}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Get Fertilizer Recommendation Button */}
          <div className="flex justify-center">
            <button
              onClick={fetchRecommendation}
              disabled={loading || !formData.soilType || !formData.cropType || !threeComplete}
              className={`px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 flex items-center space-x-3 shadow-lg transform hover:-translate-y-1 ${
                !formData.soilType || !formData.cropType || !threeComplete
                  ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                  : "bg-orange-500 text-white hover:bg-orange-600 hover:shadow-xl"
              } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {loading ? (
                <>
                  <Loader className="w-6 h-6 animate-spin" />
                  <span>Analyzing Soil Data...</span>
                </>
              ) : (
                <>
                  <Brain className="w-6 h-6" />
                  <span>Get Fertilizer Recommendation</span>
                </>
              )}
            </button>
          </div>

          {/* Helper text */}
          {!threeComplete && (
            <p className="text-sm text-gray-500 text-center mt-4">
              Waiting for 3 days to complete...
            </p>
          )}
          {(!formData.soilType || !formData.cropType) && (
            <p className="text-sm text-gray-500 text-center mt-4">
              Please select both Soil Type and Crop Type to get fertilizer
              recommendation
            </p>
          )}
        </motion.div>

        {/* Fertilizer Recommendation Results */}
        {recommendation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8"
          >
            {/* Main Recommendation */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 lg:p-8 border border-gray-100">
              <div className="text-center mb-6">
                <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FlaskConical className="w-8 h-8 text-orange-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  Recommended Fertilizer
                </h2>
                <div className="text-3xl font-bold text-orange-600 mb-2">
                  {recommendation.fertilizer}
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                </div>
              </div>
            </div>

            {/* Detailed Analysis */}
            <div className="space-y-6">
              {/* Nutrient Deficiencies */}
              <div className="bg-white rounded-xl shadow-lg p-6  border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <span>Nutrient Status</span>
                </h3>
                <div className="space-y-3">
                  {Object.entries(recommendation.nutrient_analysis).map(
                    ([key, isDeficient]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <span className="text-gray-600 capitalize">
                          {key
                            .replace("_", " ")
                            .replace("deficiency", "")
                            .replace("needed", "")}
                        </span>
                        <span
                          className={`font-semibold ${
                            isDeficient ? "text-red-600" : "text-green-600"
                          }`}
                        >
                          {isDeficient ? "Needs Attention" : "Adequate"}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {!recommendation && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-center py-16"
          >
            <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <FlaskConical className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Ready for Analysis
            </h3>
            <p className="text-gray-600 mb-6">
              Click the button above to get AI-powered fertilizer
              recommendations based on your soil nutrient levels.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default FertilizerRecommendation;

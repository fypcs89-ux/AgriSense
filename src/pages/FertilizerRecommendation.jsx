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
    soilType: "Light Brown",
    cropType: "",
  });
  const [touched, setTouched] = useState({ soilType: false, cropType: false });
  const [formError, setFormError] = useState("");
  const [lastCropTs, setLastCropTs] = useState(0);
  const { currentUser } = useAuth();
  const { dayBuckets, computeThreeDayAverage } = useData();

  // Only allow actions when all three days are completed
  const threeComplete = React.useMemo(
    () =>
      !!(
        dayBuckets?.day1?.isComplete &&
        dayBuckets?.day2?.isComplete &&
        dayBuckets?.day3?.isComplete
      ),
    [
      dayBuckets?.day1?.isComplete,
      dayBuckets?.day2?.isComplete,
      dayBuckets?.day3?.isComplete,
    ]
  );

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
          try { console.log('[Fertilizer] prepared/fertilizerPrediction snapshot:', val); } catch {}
          if (val && val.averages) {
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
              // Only set soilType/cropType from prepared data if user hasn't manually chosen
              soilType: touched.soilType ? prev.soilType : (val.soilType || "Light Brown"),
              cropType: touched.cropType ? prev.cropType : (val.crop || ""),
            }));

            // Also set sensor data for display
            setSensorData(val.averages);
          } else {
            // Prepared averages removed: clear the form and local display
            setSensorData(null);
            setFormData((prev) => ({
              ...prev,
              nitrogen: "",
              phosphorus: "",
              potassium: "",
              soilTemperature: "",
              ph: "",
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

  // Also subscribe to crop recommendation pointer to auto-fill cropType from CropRecommendation
  useEffect(() => {
    let detach = null;
    let detachHist = null;
    (async () => {
      try {
        if (!currentUser?.uid) return;
        const { ref, onValue, query, limitToLast } = await import("firebase/database");
        const r = ref(database, `users/${currentUser.uid}/prepared/cropPrediction`);
        detach = onValue(r, (snap) => {
          const val = snap.val();
          const crop = val?.crop;
          if (!crop) return;
          // Only auto-fill if crop exists in allowed options
          const exists = (opts) => opts.some(o => String(o).toLowerCase() === String(crop).toLowerCase());
          setCropOptions((opts) => {
            if (!exists(opts)) {
              return [...opts, crop];
            }
            return opts;
          });
          setFormData((prev) => ({ ...prev, cropType: crop }));

          // If averages are present on the crop pointer, hydrate sensor fields too
          const avg = val?.averages || {};
          if (avg && Object.keys(avg).length) {
            setFormData((prev) => ({
              ...prev,
              nitrogen: (!prev.nitrogen || Number(prev.nitrogen) <= 0) && avg.nitrogen != null ? String(avg.nitrogen) : prev.nitrogen,
              phosphorus: (!prev.phosphorus || Number(prev.phosphorus) <= 0) && avg.phosphorus != null ? String(avg.phosphorus) : prev.phosphorus,
              potassium: (!prev.potassium || Number(prev.potassium) <= 0) && avg.potassium != null ? String(avg.potassium) : prev.potassium,
              soilTemperature: (!prev.soilTemperature || Number(prev.soilTemperature) <= 0)
                ? (avg.soilTemperature != null ? String(avg.soilTemperature) : (avg.temperature != null ? String(avg.temperature) : prev.soilTemperature))
                : prev.soilTemperature,
              ph: (!prev.ph || Number(prev.ph) <= 0) && avg.ph != null ? String(Math.max(0, Math.min(8, Number(avg.ph)))) : prev.ph,
            }));
          }
        });

        // Fallback: also watch the latest item from cropPredictions history in case pointer isn't present
        const q = query(ref(database, `users/${currentUser.uid}/prepared/cropPredictions`), limitToLast(1));
        detachHist = onValue(q, (snap) => {
          const obj = snap.val();
          const latest = obj && typeof obj === 'object' ? Object.values(obj)[0] : null;
          const crop = latest?.crop;
          if (!crop) return;
          const exists = (opts) => opts.some(o => String(o).toLowerCase() === String(crop).toLowerCase());
          setCropOptions((opts) => {
            if (!exists(opts)) {
              return [...opts, crop];
            }
            return opts;
          });
          setFormData((prev) => ({ ...prev, cropType: crop }));
        });
      } catch {}
    })();
    return () => { try { detach && detach(); } catch {} try { detachHist && detachHist(); } catch {} };
  }, [currentUser?.uid]);

  // Fallback: if three days are complete but no prepared averages have arrived,
  // compute 3-day averages locally from dayBuckets to auto-fill inputs quickly.
  useEffect(() => {
    const d1 = dayBuckets?.day1; const d2 = dayBuckets?.day2; const d3 = dayBuckets?.day3;
    const allDone = !!(d1?.isComplete && d2?.isComplete && d3?.isComplete);
    if (!allDone) return;
    if (sensorData && Object.keys(sensorData || {}).length) return; // already hydrated
    try {
      const avg = computeThreeDayAverage([
        d1?.average || {},
        d2?.average || {},
        d3?.average || {},
      ]);
      if (!avg) return;
      setSensorData(avg);
      setFormData((prev) => ({
        ...prev,
        nitrogen: (!prev.nitrogen || Number(prev.nitrogen) <= 0) && avg.nitrogen != null ? String(avg.nitrogen) : prev.nitrogen,
        phosphorus: (!prev.phosphorus || Number(prev.phosphorus) <= 0) && avg.phosphorus != null ? String(avg.phosphorus) : prev.phosphorus,
        potassium: (!prev.potassium || Number(prev.potassium) <= 0) && avg.potassium != null ? String(avg.potassium) : prev.potassium,
        soilTemperature: (!prev.soilTemperature || Number(prev.soilTemperature) <= 0)
          ? (avg.soilTemperature != null ? String(avg.soilTemperature) : (avg.temperature != null ? String(avg.temperature) : prev.soilTemperature))
          : prev.soilTemperature,
        ph: (!prev.ph || Number(prev.ph) <= 0) && avg.ph != null ? String(Math.max(0, Math.min(8, Number(avg.ph)))) : prev.ph,
      }));
    } catch {}
  }, [dayBuckets?.day1?.isComplete, dayBuckets?.day2?.isComplete, dayBuckets?.day3?.isComplete, sensorData]);

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

  // Crop type options (as state so we can include predicted crops dynamically)
  const [cropOptions, setCropOptions] = useState([
    "Cotton",
    "Ginger",
    "Gram",
    "Grapes",
    "Groundnut",
    "Jute",
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
  ]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    // Clamp pH to 0-8 range
    if (name === "ph") {
      let v = value;
      if (v === "" || v === null || v === undefined) {
        // allow clearing for editing
        setFormData((prev) => ({ ...prev, ph: "" }));
        return;
      }
      const num = Number(v);
      const clamped = isNaN(num) ? "" : Math.max(0, Math.min(8, num));
      setFormData((prev) => ({ ...prev, ph: clamped.toString() }));
      return;
    }
    if (name === "soilType" || name === "cropType") {
      setTouched((t) => ({ ...t, [name]: true }));
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
      setFormError("");
      // Do NOT mark as manual edit when only selecting soil/crop
      return;
    }
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setFormError("");
  };

  const fetchRecommendation = async () => {
    setLoading(true);

    try {
      setFormError("");
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
        setFormError("Please fill in all sensor data fields");
        setLoading(false);
        return;
      }

      const nNum = Number(nitrogen);
      const pNum = Number(phosphorus);
      const kNum = Number(potassium);
      const tNum = Number(soilTemperature);
      const phNum = Number(ph);
      const invalid = [nNum, pNum, kNum, tNum, phNum].some((v) => !Number.isFinite(v));
      if (invalid) {
        setFormError("Sensor values must be valid numbers.");
        setLoading(false);
        return;
      }
      if (nNum <= 0 || pNum <= 0 || kNum <= 0 || tNum <= 0 || phNum <= 0) {
        setFormError("Sensor values must be greater than 0.");
        setLoading(false);
        return;
      }

      if (!soilType || !cropType) {
        setFormError("Please select both Soil Type and Crop Type");
        setLoading(false);
        return;
      }

      // Validate crop against allowed options
      const isAllowedCrop = (opts, c) => opts.some(o => String(o).toLowerCase() === String(c).toLowerCase());
      if (!isAllowedCrop(cropOptions, cropType)) {
        setFormError(`Crop "${cropType}" is not supported for fertilizer. Please choose another crop from the list.`);
        setLoading(false);
        return;
      }

      // Validate soil type against allowed options
      const isAllowedSoil = (opts, s) => opts.some(o => String(o).toLowerCase() === String(s).toLowerCase());
      if (!isAllowedSoil(soilTypes, soilType)) {
        setFormError(`Soil type "${soilType}" is not supported. Please choose one from the list.`);
        setLoading(false);
        return;
      }

      // Match exact-cased crop and soil values to backend maps
      const matchFrom = (options, val) => {
        const found = options.find(o => String(o).toLowerCase() === String(val).toLowerCase());
        return found || val;
      };
      const matchedCrop = matchFrom(cropOptions, cropType); // e.g., "Wheat"
      const matchedSoil = matchFrom(soilTypes, soilType);   // e.g., "Light Brown"

      // Prepare data for API call
      const requestData = {
        nitrogen: nNum,
        phosphorus: pNum,
        potassium: kNum,
        temperature: tNum, // Using soil temperature instead of air temperature
        ph: Math.max(0, Math.min(8, phNum)),
        soil_type: matchedSoil,
        crop_type: matchedCrop,
      };
      // Debug: log payload being sent
      try { console.log("[Fertilizer] request payload:", requestData); } catch {}

      // Call fertilizer recommendation API (via Vite proxy in dev or API_BASE in prod)
      const API_BASE = (import.meta.env.VITE_API_BASE && String(import.meta.env.VITE_API_BASE).trim()) ||
        'https://agrisense-t12d.onrender.com';
      const API_FALLBACK = 'https://agrisense-t12d.onrender.com';
      let response = await fetch(`${API_BASE}/api/fertilizer/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });
      if ((!API_BASE || API_BASE === '') && (!response.ok || response.status >= 500)) {
        try {
          response = await fetch(`${API_FALLBACK}/api/fertilizer/predict`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestData),
          });
        } catch {}
      }

      const raw = await response.text();
      let result = {};
      try { result = raw ? JSON.parse(raw) : {}; } catch {}

      if (!response.ok || !result?.ok) {
        const msg = result?.error || raw || `HTTP ${response.status}`;
        try { console.error("[Fertilizer] server error:", { status: response.status, raw, json: result }); } catch {}
        throw new Error(msg);
      }

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

        // Persist: always write to prepared/fertilizerPrediction on click and also append to history list
        try {
          if (currentUser?.uid) {
            const { ref, set, push } = await import("firebase/database");
            const targetPath = `users/${currentUser.uid}/prepared/fertilizerPrediction`;
            const nodeRef = ref(database, targetPath);
            await set(nodeRef, {
              ts: Date.now(),
              via: "form",
              fertilizer: result.fertilizer,
              inputs: {
                nitrogen: parseFloat(formData.nitrogen),
                phosphorus: parseFloat(formData.phosphorus),
                potassium: parseFloat(formData.potassium),
                soilTemperature: parseFloat(formData.soilTemperature),
                ph: parseFloat(formData.ph),
              },
              selections: {
                soilType: formData.soilType || "",
                cropType: formData.cropType || "",
              },
            });
            // Also append to fertilizerPredictions history
            const base = `users/${currentUser.uid}/prepared`;
            const listRef = ref(database, `${base}/fertilizerPredictions`);
            const newItemRef = push(listRef);
            await set(newItemRef, {
              ts: Date.now(),
              fertilizer: result.fertilizer,
              inputs: {
                nitrogen: parseFloat(formData.nitrogen),
                phosphorus: parseFloat(formData.phosphorus),
                potassium: parseFloat(formData.potassium),
                soilTemperature: parseFloat(formData.soilTemperature),
                ph: parseFloat(formData.ph),
              },
              selections: {
                soilType: formData.soilType || "",
                cropType: formData.cropType || "",
              },
            });
          }
        } catch (e) {
          console.warn("Failed to persist user fertilizer prediction:", e);
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
                AI-powered fertilizer suggestions based on soil nutrient
                analysis
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
                {cropOptions.map((crop) => (
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
              disabled={
                loading ||
                !formData.soilType ||
                !formData.cropType
              }
              className={`px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 flex items-center space-x-3 shadow-lg transform hover:-translate-y-1 ${
                !formData.soilType || !formData.cropType
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

import React, { useState } from "react";
import { motion } from "framer-motion";
import { database, isDemoMode } from "../firebase/config";
import { useData } from "../contexts/DataContext.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import {
  Sprout,
  Brain,
  TrendingUp,
  MapPin,
  Calendar,
  Thermometer,
  Droplets,
  Leaf,
  FlaskConical,
  Loader,
} from "lucide-react";

const CropRecommendation = () => {
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  const [sensorData, setSensorData] = useState(null); // 3-day averaged values snapshot
  const [errorMsg, setErrorMsg] = useState("");
  const [predictionReady, setPredictionReady] = useState(false);
  const [cachedPrediction, setCachedPrediction] = useState(null); // { crop, payload, ts }
  const [lockTs, setLockTs] = useState(() => {
    try { return Number(localStorage.getItem('agrisense:lock_ts') || 0); } catch { return 0; }
  });
  const { hourlyData, dayBuckets, computeThreeDayAverage } = useData();
  const { currentUser } = useAuth();
  // Use Vite dev proxy; call relative API path in development
  const [rainfall, setRainfall] = useState("");

  // Memoized lock state used by effects and JSX; must be initialized early
  const isLocked = React.useMemo(() => {
    return !!lockTs; // authoritative lock until explicitly cleared by newer prediction path
  }, [lockTs]);

  // Compute latest NEW readings since lockTs, like Results.jsx
  const latestNewReadings = React.useMemo(() => {
    if (!hourlyData || hourlyData.length === 0) return [];
    const lts = Number(lockTs || 0);
    return hourlyData.filter((r) => {
      const t = new Date(r?.timestamp || r?.date || Date.now()).getTime();
      return !lts || t > lts;
    });
  }, [hourlyData, lockTs]);

  // Use 3-day averages coming from Results prepared node for UI
  const uiAverages = React.useMemo(() => sensorData || null, [sensorData]);

  // Only show 3-day card when all 3 days are complete
  const threeComplete = React.useMemo(() => (
    !!(dayBuckets?.day1?.isComplete && dayBuckets?.day2?.isComplete && dayBuckets?.day3?.isComplete)
  ), [dayBuckets?.day1?.isComplete, dayBuckets?.day2?.isComplete, dayBuckets?.day3?.isComplete]);

  // Subscribe to prepared prediction written by Results page
  React.useEffect(() => {
    let detach = null;
    (async () => {
      try {
        if (!currentUser?.uid) return;
        const { ref, onValue } = await import("firebase/database");
        const r = ref(database, `users/${currentUser.uid}/prepared/cropPrediction`);
        detach = onValue(r, (snap) => {
          const val = snap.val();
          if (val && val.crop && val.averages) {
            const ts = Number(val.ts || 0);
            const locked = lockTs && ts <= lockTs;
            // Normalize averages: collapse 'phosporus' -> 'phosphorus'
            const normalized = { ...(val.averages || {}) };
            if (normalized.phosporus != null && normalized.phosphorus == null) {
              normalized.phosphorus = normalized.phosporus;
            }
            if (Object.prototype.hasOwnProperty.call(normalized, 'phosporus')) {
              delete normalized.phosporus;
            }
            // Do not show rainfall in the averaged card; it is provided by the user separately
            if (Object.prototype.hasOwnProperty.call(normalized, 'rainfall')) {
              delete normalized.rainfall;
            }
            if (locked) {
              // Treat as absent until a newer prediction arrives
              setCachedPrediction(null);
              setSensorData(null);
              setPredictionReady(false);
            } else {
              setCachedPrediction({ crop: val.crop, payload: normalized, ts });
              setSensorData(normalized); // this is 3-day averages
              setPredictionReady(true);
              // Newer prediction arrived; clear lock everywhere
              if (lockTs && ts > lockTs) {
                try {
                  localStorage.removeItem('agrisense:lock_ts');
                } catch {}
                setLockTs(0);
                try {
                  import('firebase/database').then(({ ref, remove }) => {
                    const r = ref(database, `users/${currentUser.uid}/prepared/lockTs`);
                    remove(r);
                  });
                } catch {}
              }
            }
            setErrorMsg("");
          } else {
            setCachedPrediction(null);
            setSensorData(null);
            setPredictionReady(false);
            // Also clear any previously revealed recommendation from UI
            setRecommendation(null);
          }
        });
      } catch (e) {
        console.warn("Failed to subscribe prepared prediction:", e);
      }
    })();
    return () => { try { detach && detach(); } catch {} };
  }, [currentUser?.uid]);

  // Fallback: if three days are complete but prepared pointer hasn't arrived yet,
  // compute 3-day averages locally from dayBuckets to unblock the UI immediately.
  React.useEffect(() => {
    const d1 = dayBuckets?.day1; const d2 = dayBuckets?.day2; const d3 = dayBuckets?.day3;
    const allDone = !!(d1?.isComplete && d2?.isComplete && d3?.isComplete);
    if (!allDone) return;
    // If already have prepared-driven sensorData or lock is active, skip
    if (predictionReady || !!lockTs) return;
    try {
      const avg = computeThreeDayAverage([
        d1?.average || {},
        d2?.average || {},
        d3?.average || {},
      ]);
      // Normalize like prepared path
      const normalized = { ...(avg || {}) };
      if (Object.prototype.hasOwnProperty.call(normalized, 'rainfall')) delete normalized.rainfall;
      setSensorData(normalized);
      setPredictionReady(true);
      setErrorMsg("");
    } catch {}
  }, [dayBuckets?.day1?.isComplete, dayBuckets?.day2?.isComplete, dayBuckets?.day3?.isComplete, predictionReady, lockTs]);

  // Subscribe to server-side lock timestamp so lock persists across refreshes
  React.useEffect(() => {
    let detach = null;
    (async () => {
      try {
        if (!currentUser?.uid) return;
        const { ref, onValue } = await import("firebase/database");
        const r = ref(database, `users/${currentUser.uid}/prepared/lockTs`);
        detach = onValue(r, (snap) => {
          const v = Number(snap.val() || 0);
          if (v) setLockTs(v);
        });
      } catch (e) {
        console.warn("Failed to subscribe lockTs:", e);
      }
    })();
    return () => { try { detach && detach(); } catch {} };
  }, [currentUser?.uid]);

  // Enforce lock immediately: hide UI and remove any stale prepared node
  React.useEffect(() => {
    if (!lockTs) return;
    // Hide everything in UI
    setRecommendation(null);
    setSensorData(null);
    setPredictionReady(false);
    setErrorMsg("");
    // Proactively delete any prepared node that might still exist
    (async () => {
      try {
        if (!currentUser?.uid) return;
        const { ref, remove } = await import("firebase/database");
        const r = ref(database, `users/${currentUser.uid}/prepared/cropPrediction`);
        await remove(r);
      } catch {}
    })();
  }, [lockTs, currentUser?.uid]);

  // Immediately reset UI when other components announce prepared prediction was cleared
  React.useEffect(() => {
    const reset = () => {
      setCachedPrediction(null);
      setSensorData(null);
      setPredictionReady(false);
      setRecommendation(null);
      setErrorMsg("");
    };
    const uiOnlyReset = () => {
      setRecommendation(null);
      setSensorData(null);
      setPredictionReady(false);
      setErrorMsg("");
    };
    const onLock = () => {
      try { setLockTs(Number(localStorage.getItem('agrisense:lock_ts') || 0)); } catch {}
      // hide current prepared values until newer arrives
      setSensorData(null);
      setPredictionReady(false);
    };
    window.addEventListener('agrisense:cleared-prepared', reset);
    window.addEventListener('agrisense:reset-recommendation-ui', uiOnlyReset);
    window.addEventListener('agrisense:lock-recommendation', onLock);
    const hideAverages = () => { setSensorData(null); setPredictionReady(false); };
    window.addEventListener('agrisense:hide-averages', hideAverages);
    return () => {
      window.removeEventListener('agrisense:cleared-prepared', reset);
      window.removeEventListener('agrisense:reset-recommendation-ui', uiOnlyReset);
      window.removeEventListener('agrisense:lock-recommendation', onLock);
      window.removeEventListener('agrisense:hide-averages', hideAverages);
    };
  }, []);


  // Compute recommendation by calling backend using 3-day averaged values + rainfall
  const revealRecommendation = async () => {
    if (!predictionReady || !sensorData) return;
    const r = Number(rainfall);
    if (!Number.isFinite(r) || r <= 0) return;
    setLoading(true);
    try {
      const API_BASE = (import.meta.env.VITE_API_BASE && String(import.meta.env.VITE_API_BASE).trim()) ||
        'https://agrisense-t12d.onrender.com';
      const API_FALLBACK = 'https://agrisense-t12d.onrender.com';
      const url = `${API_BASE}/api/crop/predict`;
      const tempToUse = Number(
        sensorData.soilTemperature != null && !isNaN(Number(sensorData.soilTemperature))
          ? sensorData.soilTemperature
          : sensorData.temperature
      );
      const humidityForModel = Number(sensorData?.moisture ?? sensorData?.humidity ?? 0);
      const phClamped = (() => {
        const p = Number(sensorData.ph);
        if (!Number.isFinite(p)) return 0;
        return Math.max(0, Math.min(9, p));
      })();
      const payload = {
        nitrogen: Number(sensorData.nitrogen),
        phosphorus: Number(sensorData.phosphorus),
        potassium: Number(sensorData.potassium),
        temperature: tempToUse,
        humidity: humidityForModel, // use Moisture average in place of Humidity
        ph: phClamped,
        rainfall: r,
        soilTemperature: Number(sensorData.soilTemperature || 0),
      };
      try { console.log('[Crop] request payload:', payload); } catch {}
      let res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      // If running locally (no API_BASE) and the proxy target is down or returned an error, retry against Render
      if ((!API_BASE || API_BASE === '') && (!res.ok || res.status >= 500)) {
        try {
          const retryUrl = `${API_FALLBACK}/api/crop/predict`;
          res = await fetch(retryUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        } catch {}
      }
      const raw = await res.text();
      let data = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch {}
      if (!res.ok || !data?.ok || !data?.crop) {
        const msg = (typeof data?.error === 'string' && data.error) || raw || `HTTP ${res.status}`;
        try { console.error('[Crop] server error:', { status: res.status, raw, json: data }); } catch {}
        setErrorMsg(msg || 'Prediction failed');
        setRecommendation(null);
        return;
      }
      const uiRecommendation = {
        crop: data.crop,
        confidence: 90,
        yield_prediction: 75,
        growing_season: 105,
        water_requirement: 800,
        best_planting_time: "March - April",
        reasons: [
          "3-Day average soil conditions",
          `N=${payload.nitrogen}, P=${payload.phosphorus}, K=${payload.potassium}`,
          `${sensorData.soilTemperature != null ? `Soil Temp=${payload.temperature}°C` : `Temp=${payload.temperature}°C`}, Moisture=${payload.humidity}%`,
          `pH=${payload.ph}, Rainfall=${payload.rainfall}mm`,
        ],
      };
      setRecommendation(uiRecommendation);
      setErrorMsg("");

      // Persist prepared nodes with real rainfall and without soilTemperature
      try {
        if (currentUser?.uid) {
          const { ref, set, push } = await import('firebase/database');
          const base = `users/${currentUser.uid}/prepared`;
          const storageAverages = {
            nitrogen: Number(sensorData.nitrogen),
            phosphorus: Number(sensorData.phosphorus),
            potassium: Number(sensorData.potassium),
            temperature: tempToUse,
            humidity: humidityForModel,
            moisture: Number(sensorData?.moisture ?? 0),
            ph: Number(sensorData.ph),
            rainfall: r,
          };
          const latest = {
            ts: Date.now(),
            crop: data.crop,
            averages: storageAverages,
          };
          // Latest pointer (for compatibility with subscribers)
          await set(ref(database, `${base}/cropPrediction`), latest);
          // Also append to history list to create a new entry every time
          const listRef = ref(database, `${base}/cropPredictions`);
          const newItemRef = push(listRef);
          await set(newItemRef, latest);
        }
      } catch (e) {
        // Non-fatal: UI already shows recommendation; log for debugging
        console.warn('Failed to persist prepared nodes with user rainfall:', e);
      }
    } catch (e) {
      setErrorMsg('Prediction failed');
      setRecommendation(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 page-with-top-gap overflow-x-hidden">
      <div className="max-w-6xl mx-auto w-full max-w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center space-x-3 flex-nowrap mb-4">
            <div className="bg-primary-100 p-3 rounded-lg">
              <Leaf className="w-6 h-6 text-primary-600" />
            </div>
            <div className="flex flex-row flex-wrap items-center space-x-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 whitespace-nowrap">Crop Recommendation</h1>
              <p className="basis-full text-sm sm:text-base text-gray-600">
                AI-powered crop suggestions based on your soil conditions
              </p>
            </div>
          </div>
        </motion.div>

        {/* Get Recommendation Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8"
        >
          {/* Rainfall input */}
          <div className="mb-4 max-w-sm">
            <label className="block text-sm font-medium text-gray-700 mb-1">Rainfall (mm)</label>
            <input
              type="number"
              min="1"
              step="1"
              value={rainfall}
              onChange={(e) => setRainfall(e.target.value)}
              placeholder="Enter rainfall in mm"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
            {rainfall !== "" && (!Number.isFinite(Number(rainfall)) || Number(rainfall) <= 0) && (
              <p className="text-sm text-red-600 mt-1">Please enter a valid rainfall value &gt; 0</p>
            )}
          </div>

          <button
            onClick={revealRecommendation}
            disabled={loading || !predictionReady || isLocked || !threeComplete || !(Number.isFinite(Number(rainfall)) && Number(rainfall) > 0)}
            className="bg-primary-500 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold text-base sm:text-lg hover:bg-primary-600 transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader className="w-6 h-6 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Brain className="w-6 h-6" />
                <span>{(predictionReady && !isLocked) ? (Number(rainfall) > 0 ? "Get Crop Recommendation" : "Enter rainfall to continue") : (threeComplete ? "Loading 3-day averages..." : "Waiting for 3 days to complete...")}</span>
              </>
            )}
          </button>
        </motion.div>

        {/* 3-Day Average Values */}
        {uiAverages && !isLocked && threeComplete && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-100"
          >
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center space-x-2">
              <FlaskConical className="w-5 h-5 text-primary-600" />
              <span>3-Day Average Values</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              {[
                'soilTemperature',
                'moisture',
                'nitrogen',
                'phosphorus',
                'potassium',
                'ph',
              ].map((key) => {
                if (!(key in uiAverages)) return null;
                const value = uiAverages[key];
                const labelMap = {
                  soilTemperature: 'Soil Temp',
                  ph: 'pH',
                };
                const label = labelMap[key] || key.charAt(0).toUpperCase() + key.slice(1);
                return (
                  <div key={key} className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600 capitalize mb-1">{label}</div>
                    <div className="text-lg font-semibold text-gray-800">
                      {typeof value === 'number' ? Number(key === 'ph' ? Math.min(Number(value), 9) : value).toFixed(1) : value}
                      {(key === 'soilTemperature') && '°C'}
                      {(key === 'moisture') && '%'}
                      {key === 'ph' && ' pH'}
                      {(key === 'nitrogen' || key === 'phosphorus' || key === 'potassium') && ' mg/kg'}
                    </div>
                  </div>
                );
              })}
              {Number.isFinite(Number(rainfall)) && Number(rainfall) > 0 && (
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 capitalize mb-1">Rainfall</div>
                  <div className="text-lg font-semibold text-gray-800">
                    {Number(rainfall).toFixed(1)} mm
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Recommendation Results */}
        {recommendation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8"
          >
            {/* Recommended Crop Card */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 lg:p-8 border border-gray-100">
              <div className="text-center mb-6">
                <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sprout className="w-8 h-8 text-primary-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  Recommended Crop
                </h2>
                <div className="text-4xl font-bold text-primary-600 mb-2">
                  {recommendation.crop}
                </div>
                <div className="flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
              </div>

            </div>

            {/* Analysis Details */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 lg:p-8 border border-gray-100">
              <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center space-x-2">
                <Brain className="w-5 h-5 text-primary-600" />
                <span>AI Analysis</span>
              </h3>

              <div className="mb-6">
                <h4 className="text-lg font-medium text-gray-800 mb-3">
                  Why {recommendation.crop}?
                </h4>
                <ul className="space-y-3">
                  {recommendation.reasons.map((reason, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-600">{reason}</span>
                    </li>
                  ))}
                </ul>
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
              <Sprout className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Ready for Analysis
            </h3>
            <p className="text-gray-600 mb-6">
              Click the button above to get AI-powered crop recommendations
              based on your current soil conditions.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default CropRecommendation;



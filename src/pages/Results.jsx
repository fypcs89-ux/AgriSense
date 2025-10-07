import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useData } from "../contexts/DataContext.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { database } from "../firebase/config";
import {
  Download,
  TrendingUp,
  Droplets,
  Thermometer,
  Beaker,
  Leaf,
  FlaskConical,
  FileText,
  Calendar,
  Trash2,
} from "lucide-react";

const Results = () => {
  const [results, setResults] = useState([]);
  const [sensorData, setSensorData] = useState([]);
  const { dailySummaries, loading, clearHistory, hourlyData } = useData();
  const [lockTs, setLockTs] = useState(() => {
    try {
      return Number(localStorage.getItem("agrisense:lock_ts") || 0);
    } catch {
      return 0;
    }
  });
  const { currentUser } = useAuth();
  const [prefetching, setPrefetching] = useState(false);
  const [prefetchError, setPrefetchError] = useState("");
  const [prefetchLocked, setPrefetchLocked] = useState(false);
  // Use Vite dev proxy; call relative API path in development

  useEffect(() => {
    // No demo data. If you have results stored in Firebase, we can wire them here.
    setResults([]);
    setSensorData([]);
  }, []);

  // Listen for cross-page clear event (from History page)
  useEffect(() => {
    const handler = () => setResults([]);
    window.addEventListener("clear-results", handler);
    return () => window.removeEventListener("clear-results", handler);
  }, []);

  // Calculate overall averages from daily summaries
  const calculateAverage = (parameter) => {
    if (sensorData.length === 0) return 0;
    const sum = sensorData.reduce(
      (acc, reading) => acc + reading[parameter],
      0
    );
    return (sum / sensorData.length).toFixed(1);
  };

  // New readings since lockTs
  const latestNewReadings = useMemo(() => {
    if (!hourlyData || hourlyData.length === 0) return [];
    const lts = Number(lockTs || 0);
    return hourlyData.filter((r) => {
      const t = new Date(r?.timestamp || r?.date || Date.now()).getTime();
      return !lts || t > lts;
    });
  }, [hourlyData, lockTs]);

  // Latest 5 readings average (computed from hourlyData newer than lock)
  const last5Average = useMemo(() => {
    if (!latestNewReadings || latestNewReadings.length < 5) return null;
    const latest = latestNewReadings.slice(0, 5); // sorted desc by timestamp already
    const sum = (k) => latest.reduce((acc, r) => acc + Number(r?.[k] ?? 0), 0);
    const avg = (k) => (sum(k) / latest.length).toFixed(1);
    return {
      count: latest.length,
      temperature: avg("temperature"),
      soilTemperature: avg("soilTemperature"),
      humidity: avg("humidity"),
      moisture: avg("moisture"),
      nitrogen: avg("nitrogen"),
      phosphorus: avg("phosphorus"),
      potassium: avg("potassium"),
      ph: avg("ph"),
    };
  }, [latestNewReadings]);

  const hasFiveReadings = !!(
    latestNewReadings && latestNewReadings.length >= 5
  );

  // Prefetch real crop prediction using latest NEW averages and store in Firebase
  useEffect(() => {
    const run = async () => {
      if (
        !hasFiveReadings ||
        !last5Average ||
        !currentUser?.uid ||
        prefetching ||
        prefetchLocked
      )
        return;
      setPrefetchError("");
      setPrefetching(true);
      try {
        const tempToUse = Number(
          last5Average.soilTemperature != null &&
            !isNaN(Number(last5Average.soilTemperature))
            ? last5Average.soilTemperature
            : last5Average.temperature
        );
        const payload = {
          nitrogen: Number(last5Average.nitrogen),
          phosphorus: Number(last5Average.phosphorus),
          potassium: Number(last5Average.potassium),
          temperature: tempToUse,
          humidity: Number(last5Average.humidity),
          moisture: Number(last5Average.moisture),
          ph: Number(last5Average.ph),
          rainfall: 494,
          soilTemperature: Number(last5Average.soilTemperature || 0),
        };
        const url = "/api/crop/predict";
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        let raw = "";
        try {
          raw = await res.clone().text();
        } catch {}
        let data = {};
        try {
          data = await res.json();
        } catch {}
        if (!res.ok || !data?.ok || !data?.crop) {
          console.error("[Results] predict failed", {
            url,
            status: res.status,
            raw,
            data,
          });
          throw new Error(data?.error || `Prediction failed (${res.status})`);
        }

        const { ref, set } = await import("firebase/database");
        const path = `users/${currentUser.uid}/prepared/cropPrediction`;
        await set(ref(database, path), {
          ts: Date.now(),
          crop: data.crop,
          averages: payload,
        });

        // Also store fertilizer prediction data
        const fertilizerPath = `users/${currentUser.uid}/prepared/fertilizerPrediction`;
        await set(ref(database, fertilizerPath), {
          ts: Date.now(),
          crop: data.crop, // Use the predicted crop as crop type
          soilType: "Black", // Default soil type - can be made configurable
          averages: payload,
        });
      } catch (e) {
        console.error("[Results] Prefetch crop prediction error:", e);
        setPrefetchError(
          typeof e?.message === "string" ? e.message : "Prefetch failed"
        );
      } finally {
        // Keep prefetching true for a short debounce to avoid spamming on rapid renders
        setTimeout(() => setPrefetching(false), 1000);
      }
    };
    run();
  }, [
    hasFiveReadings,
    last5Average,
    currentUser?.uid,
    prefetching,
    prefetchLocked,
  ]);

  // Listen for lockTs changes from Firebase so this page respects the lock too
  useEffect(() => {
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
      } catch {}
    })();
    return () => {
      try {
        detach && detach();
      } catch {}
    };
  }, [currentUser?.uid]);

  // Unlock prefetch when history is actually below 5 (after clear), so we only prefetch again when it reaches 5 anew
  useEffect(() => {
    const len = hourlyData?.length || 0;
    if (len < 5 && prefetchLocked) {
      setPrefetchLocked(false);
    }
  }, [hourlyData?.length, prefetchLocked]);

  const clearResults = async () => {
    const ok = window.confirm(
      "Clear all recorded results and history? This will remove local results and delete history from Firebase."
    );
    if (!ok) return;
    try {
      // Clear local results
      setResults([]);
      // Clear history from Firebase
      await clearHistory();
      // Always reset CropRecommendation UI locally (without touching Firebase)
      try {
        window.dispatchEvent(new Event("agrisense:reset-recommendation-ui"));
      } catch {}
      // Explicitly request hiding the Averaged card as well
      try {
        window.dispatchEvent(new Event("agrisense:hide-averages"));
      } catch {}

      // Lock Crop Recommendation until a NEW prepared prediction is written
      try {
        const ts = Date.now();
        localStorage.setItem("agrisense:lock_ts", String(ts));
        window.dispatchEvent(new Event("agrisense:lock-recommendation"));
        // Persist lock to Firebase so it survives hard refresh and origin/port changes
        if (currentUser?.uid) {
          const { ref, set } = await import("firebase/database");
          await set(
            ref(database, `users/${currentUser.uid}/prepared/lockTs`),
            ts
          );
        }
      } catch {}

      // Prevent immediate re-prefetch from current in-memory hourlyData until readings drop below 5 then reach 5 again
      setPrefetchLocked(true);

      // Always clear any existing prepared crop prediction to prevent reuse of previous averages
      if (currentUser?.uid) {
        const { ref, remove } = await import("firebase/database");
        const cropPath = `users/${currentUser.uid}/prepared/cropPrediction`;
        const fertilizerPath = `users/${currentUser.uid}/prepared/fertilizerPrediction`;
        const fertilizerResultPath = `users/${currentUser.uid}/prepared/fertilizerResult`;
        await remove(ref(database, cropPath));
        await remove(ref(database, fertilizerPath));
        await remove(ref(database, fertilizerResultPath));
      }
      // Notify other tabs/components immediately
      try {
        window.dispatchEvent(new Event("agrisense:cleared-prepared"));
      } catch {}
    } catch (e) {
      console.error("Failed to clear results/history:", e);
      alert(
        "Failed to clear history. Local results were cleared, but history may remain."
      );
    }
  };

  // Get optimal ranges for each parameter
  const getOptimalRange = (parameter) => {
    const ranges = {
      temperature: { min: 0, max: 60, unit: "°C" },
      humidity: { min: 0, max: 80, unit: "%" },
      moisture: { min: 0, max: 100, unit: "%" },
      ph: { min: 0, max: 14, unit: "" },
      nitrogen: { min: 0, max: 100, unit: "ppm" },
      phosphorus: { min: 0, max: 100, unit: "ppm" },
      potassium: { min: 0, max: 200, unit: "ppm" },
    };
    return ranges[parameter] || { min: 0, max: 100, unit: "" };
  };

  // Calculate percentage for donut chart
  const calculatePercentage = (value, parameter) => {
    const range = getOptimalRange(parameter);
    const percentage = Math.min(
      100,
      Math.max(0, ((value - range.min) / (range.max - range.min)) * 100)
    );
    return Math.round(percentage);
  };

  // Render donut chart component
  const DonutChart = ({ value, parameter, icon: Icon, label, color }) => {
    const percentage = calculatePercentage(value, parameter);
    const circumference = 2 * Math.PI * 45;
    const strokeDasharray = `${
      (percentage / 100) * circumference
    } ${circumference}`;
    const range = getOptimalRange(parameter);

    return (
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="flex flex-col items-center">
          <div className="relative w-24 h-24 mb-4">
            <svg
              className="w-24 h-24 transform -rotate-90"
              viewBox="0 0 100 100"
            >
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="#e5e7eb"
                strokeWidth="8"
                fill="none"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke={color}
                strokeWidth="8"
                fill="none"
                strokeDasharray={strokeDasharray}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <Icon
                className={`w-6 h-6 ${color.replace("stroke-", "text-")}`}
              />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">{label}</h3>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {value}
              {range.unit}
            </div>
            <div className="text-sm text-gray-500">
              Optimal: {range.min}-{range.max}
              {range.unit}
            </div>
            <div
              className={`text-sm font-medium mt-1 ${
                percentage >= 70
                  ? "text-green-600"
                  : percentage >= 40
                  ? "text-yellow-600"
                  : "text-red-600"
              }`}
            >
              {percentage >= 70
                ? "Optimal"
                : percentage >= 40
                ? "Fair"
                : "Poor"}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render daily summary cards
  const renderDailySummaries = () => {
    if (dailySummaries.length === 0) {
      return (
        <div className="col-span-full text-center py-8">
          <div className="text-gray-500">No completed days yet</div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dailySummaries.map((summary) => (
          <DailySummaryCard key={summary.id} summary={summary} />
        ))}
      </div>
    );
  };

  // Daily Summary Card Component
  const DailySummaryCard = ({ summary }) => {
    const chartConfigs = [
      {
        parameter: "avgTemperature",
        label: "Soil Temp",
        color: "#ef4444",
        unit: "°C",
        max: 60,
      },
      {
        parameter: "avgMoisture",
        label: "Moisture",
        color: "#06b6d4",
        unit: "%",
        max: 100,
      },
      { parameter: "avgPh", label: "pH", color: "#8b5cf6", unit: "", max: 14 },
      {
        parameter: "avgNitrogen",
        label: "N",
        color: "#10b981",
        unit: "ppm",
        max: 100,
      },
      {
        parameter: "avgPhosphorus",
        label: "P",
        color: "#f59e0b",
        unit: "ppm",
        max: 100,
      },
      {
        parameter: "avgPotassium",
        label: "K",
        color: "#ec4899",
        unit: "ppm",
        max: 100,
      },
    ];

    // Compute today's key to show latest-5 only on today's card
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const todayKey = `${yyyy}${mm}${dd}`;

    // Calculate total for percentage distribution
    // For the legend numbers, show latest-5 averages whenever available
    const display = last5Average
      ? {
          avgTemperature: Number(
            (last5Average.soilTemperature ?? last5Average.temperature) || 0
          ),
          avgHumidity: Number(last5Average.humidity),
          avgMoisture: Number(last5Average.moisture),
          avgNitrogen: Number(last5Average.nitrogen),
          avgPhosphorus: Number(last5Average.phosphorus),
          avgPotassium: Number(last5Average.potassium),
          avgPh: Number(last5Average.ph),
        }
      : {
          avgTemperature: Number(
            (summary.avgSoilTemperature ?? summary.avgTemperature) || 0
          ),
          avgHumidity: Number(summary.avgHumidity || 0),
          avgMoisture: Number(summary.avgMoisture || 0),
          avgNitrogen: Number(summary.avgNitrogen || 0),
          avgPhosphorus: Number(summary.avgPhosphorus || 0),
          avgPotassium: Number(summary.avgPotassium || 0),
          avgPh: Number(summary.avgPh || 0),
        };

    const totalValue = chartConfigs.reduce((sum, config) => {
      return sum + parseFloat(display[config.parameter] || 0);
    }, 0);

    return (
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-gray-800">
            Date ({summary.date})
          </h3>
          {/* Removed readings collected and progress lines per request */}
        </div>
        {/* Removed hourly progress bar and text per request */}

        {/* Single Donut Chart with Segments and Labels */}
        <div className="flex flex-col items-center">
          <div className="relative w-64 h-64 mb-6">
            <svg
              className="w-64 h-64 transform -rotate-90"
              viewBox="0 0 200 200"
            >
              {(() => {
                let cumulativeAngle = 0;
                const centerX = 100;
                const centerY = 100;
                const outerRadius = 80;
                const innerRadius = 45;

                // Calculate total for percentages
                const totalValue = chartConfigs.reduce((sum, config) => {
                  return sum + parseFloat(summary[config.parameter] || 0);
                }, 0);

                return chartConfigs.map((config, index) => {
                  const value = parseFloat(summary[config.parameter] || 0);
                  const percentage =
                    totalValue > 0 ? (value / totalValue) * 100 : 0;
                  const angle = (percentage / 100) * 360;

                  // Calculate path for donut segment
                  const startAngle = cumulativeAngle * (Math.PI / 180);
                  const endAngle = (cumulativeAngle + angle) * (Math.PI / 180);

                  const x1 = centerX + outerRadius * Math.cos(startAngle);
                  const y1 = centerY + outerRadius * Math.sin(startAngle);
                  const x2 = centerX + outerRadius * Math.cos(endAngle);
                  const y2 = centerY + outerRadius * Math.sin(endAngle);

                  const x3 = centerX + innerRadius * Math.cos(endAngle);
                  const y3 = centerY + innerRadius * Math.sin(endAngle);
                  const x4 = centerX + innerRadius * Math.cos(startAngle);
                  const y4 = centerY + innerRadius * Math.sin(startAngle);

                  const largeArcFlag = angle > 180 ? 1 : 0;

                  const pathData = [
                    `M ${x1} ${y1}`,
                    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                    `L ${x3} ${y3}`,
                    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}`,
                    "Z",
                  ].join(" ");

                  // Calculate label position
                  const labelAngle =
                    (cumulativeAngle + angle / 2) * (Math.PI / 180);
                  const labelRadius = (outerRadius + innerRadius) / 2;
                  const labelX = centerX + labelRadius * Math.cos(labelAngle);
                  const labelY = centerY + labelRadius * Math.sin(labelAngle);

                  cumulativeAngle += angle;

                  return (
                    <g key={config.parameter}>
                      <path
                        d={pathData}
                        fill={config.color}
                        className="transition-all duration-1000 ease-in-out hover:opacity-80"
                        style={{
                          animationDelay: `${index * 0.1}s`,
                        }}
                      />
                      {percentage > 5 && (
                        <g transform={`rotate(90 ${labelX} ${labelY})`}>
                          <text
                            x={labelX}
                            y={labelY - 2}
                            textAnchor="middle"
                            className="text-xs font-bold fill-white"
                          >
                            {Math.round(percentage)}%
                          </text>
                          <text
                            x={labelX}
                            y={labelY + 8}
                            textAnchor="middle"
                            className="text-xs fill-white opacity-90"
                          >
                            {config.label}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                });
              })()}

              {/* Center text */}
              <text
                x="100"
                y="95"
                textAnchor="middle"
                className="text-sm font-bold fill-gray-600"
                transform="rotate(90 100 100)"
              >
                Soil Health
              </text>
              <text
                x="100"
                y="105"
                textAnchor="middle"
                className="text-xs fill-gray-500"
                transform="rotate(90 100 100)"
              >
                Day {summary.dayNumber}
              </text>
            </svg>
          </div>

          {/* Legend with values */}
          <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
            {chartConfigs.map((config) => {
              const value = parseFloat(display[config.parameter] || 0);
              const totalValue = chartConfigs.reduce(
                (sum, c) => sum + parseFloat(display[c.parameter] || 0),
                0
              );
              const percentage =
                totalValue > 0 ? Math.round((value / totalValue) * 100) : 0;

              return (
                <div
                  key={config.parameter}
                  className="flex items-center space-x-2"
                >
                  <div
                    className="w-4 h-4 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: config.color }}
                  ></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-700 truncate">
                      {config.label}
                    </div>
                    <div className="text-xs text-gray-500">
                      {value}
                      {config.unit} ({percentage}%)
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {/* Removed in-card latest-5 block per request */}
      </div>
    );
  };

  const exportResults = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      "Date,Type,Recommendation,Confidence,Yield Increase,Status,Notes\n" +
      results
        .map(
          (result) =>
            `${result.timestamp.toLocaleDateString()},${result.type},${
              result.recommendation
            },${result.confidence}%,${result.yield_increase}%,${
              result.status
            },"${result.notes}"`
        )
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "agrisense_results.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-12 h-12 text-primary-500 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  const implementedResults = results.filter((r) => r.status === "implemented");
  const pendingResults = results.filter((r) => r.status === "pending");

  return (
    <div className="min-h-screen bg-gray-50 p-0 page-with-top-gap">
      <div className="w-full pl-4 sm:pl-6 pr-4 sm:pr-6 pt-0">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-4 sm:mb-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 p-3 rounded-lg">
                <FileText className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Results</h1>
              </div>
            </div>
            {results.length > 0 && (
              <div className="flex items-center gap-3">
                <button
                  onClick={exportResults}
                  className="bg-primary-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-600 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl"
                >
                  <Download className="w-5 h-5" />
                  <span>Export Results</span>
                </button>
                <button
                  onClick={clearResults}
                  className="bg-red-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-600 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl"
                  title="Clear local results"
                >
                  <Trash2 className="w-5 h-5" />
                  <span>Clear Results & History</span>
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Gate results behind 5 readings */}
        {!hasFiveReadings && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Results</h2>
            <div className="bg-white rounded-xl shadow p-6 border border-gray-100 text-gray-600">
              Waiting for 5 readings to be collected before showing averages.
              Collected {hourlyData?.length || 0}/5 so far.
            </div>
          </div>
        )}

        {hasFiveReadings && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-8"
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Daily Data Summary
            </h2>
            {renderDailySummaries()}
          </motion.div>
        )}

        {/* Latest 5 Readings Average (standalone card) */}
        {hasFiveReadings && last5Average && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mb-8"
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Latest 5 Readings Average
            </h2>
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <Stat
                  label="Soil Temp (°C)"
                  value={
                    last5Average.soilTemperature ?? last5Average.temperature
                  }
                />
                <Stat label="Moisture (%)" value={last5Average.moisture} />
                <Stat label="N (ppm)" value={last5Average.nitrogen} />
                <Stat label="P (ppm)" value={last5Average.phosphorus} />
                <Stat label="K (ppm)" value={last5Average.potassium} />
                <Stat label="pH" value={last5Average.ph} />
              </div>
              <div className="text-xs text-gray-500 mt-3">
                Based on the most recent {last5Average.count} readings
              </div>
            </div>
          </motion.div>
        )}
        {hasFiveReadings && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
          >
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-800">
                    {dailySummaries.length}
                  </div>
                  <div className="text-sm text-gray-600">Days Tracked</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <FileText className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-800">
                    {hourlyData?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Total Readings</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-800">24</div>
                  <div className="text-sm text-gray-600">
                    Avg. Daily Readings
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// Small stat component
const Stat = ({ label, value }) => (
  <div className="text-center">
    <div className="text-2xl font-bold text-gray-800">{value}</div>
    <div className="text-sm text-gray-500">{label}</div>
  </div>
);

export default Results;

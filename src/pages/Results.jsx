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
  const { dailySummaries, loading, clearHistory, hourlyData, dayBuckets } = useData();
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

  // Compute 3-day average once all days are completed
  const threeComplete = !!(
    dayBuckets?.day1?.isComplete &&
    dayBuckets?.day2?.isComplete &&
    dayBuckets?.day3?.isComplete
  );

  const threeDayAverage = useMemo(() => {
    if (!threeComplete) return null;
    const days = [dayBuckets?.day1?.average || {}, dayBuckets?.day2?.average || {}, dayBuckets?.day3?.average || {}];
    const avgOf = (k) => {
      const vals = days.map((d) => Number(d?.[k] ?? 0));
      const sum = vals.reduce((a, b) => a + b, 0);
      return Number((sum / days.length).toFixed(1));
    };
    // Support either soilTemperature or temperature in the stored averages
    const soilTemp = days.some((d) => d?.soilTemperature != null)
      ? avgOf("soilTemperature")
      : avgOf("temperature");
    return {
      soilTemperature: soilTemp,
      temperature: soilTemp, // keep a mirrored field for components that expect 'temperature'
      humidity: avgOf("humidity"),
      moisture: avgOf("moisture"),
      nitrogen: avgOf("nitrogen"),
      phosphorus: avgOf("phosphorus"),
      potassium: avgOf("potassium"),
      ph: avgOf("ph"),
    };
  }, [threeComplete, dayBuckets?.day1?.average, dayBuckets?.day2?.average, dayBuckets?.day3?.average]);

  // 3-Day donut based on threeDayAverage
  const ThreeDayDonut = ({ averages }) => {
    const chartConfigs = [
      { parameter: 'soilTemperature', label: 'Soil Temp', color: '#ef4444', unit: '°C' },
      { parameter: 'moisture', label: 'Moisture', color: '#06b6d4', unit: '%' },
      { parameter: 'ph', label: 'pH', color: '#8b5cf6', unit: '' },
      { parameter: 'nitrogen', label: 'N', color: '#10b981', unit: 'ppm' },
      { parameter: 'phosphorus', label: 'P', color: '#f59e0b', unit: 'ppm' },
      { parameter: 'potassium', label: 'K', color: '#ec4899', unit: 'ppm' },
    ];
    const totalValue = chartConfigs.reduce((sum, cfg) => sum + Number(averages?.[cfg.parameter] || 0), 0);
    const todayStr = new Date().toISOString().split('T')[0];
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 w-full sm:max-w-md mx-auto">
        <div className="flex flex-col items-center">
          <div className="text-center mb-2">
            <h3 className="text-lg font-semibold text-gray-800">Date ({todayStr})</h3>
          </div>
          <div className="relative w-56 h-56 sm:w-56 sm:h-56 md:w-64 md:h-64 mb-4">
            <svg className="w-56 h-56 sm:w-56 sm:h-56 md:w-64 md:h-64 transform -rotate-90" viewBox="0 0 200 200">
              {(() => {
                let cumulativeAngle = 0;
                const centerX = 100, centerY = 100, outerRadius = 80, innerRadius = 45;
                return chartConfigs.map((cfg, idx) => {
                  const value = Number(averages?.[cfg.parameter] || 0);
                  const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0;
                  const angle = (percentage / 100) * 360;
                  const start = cumulativeAngle * (Math.PI/180);
                  const end = (cumulativeAngle + angle) * (Math.PI/180);
                  const x1 = centerX + outerRadius * Math.cos(start);
                  const y1 = centerY + outerRadius * Math.sin(start);
                  const x2 = centerX + outerRadius * Math.cos(end);
                  const y2 = centerY + outerRadius * Math.sin(end);
                  const x3 = centerX + innerRadius * Math.cos(end);
                  const y3 = centerY + innerRadius * Math.sin(end);
                  const x4 = centerX + innerRadius * Math.cos(start);
                  const y4 = centerY + innerRadius * Math.sin(start);
                  const largeArcFlag = angle > 180 ? 1 : 0;
                  const d = [`M ${x1} ${y1}`, `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}`, `L ${x3} ${y3}`, `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}`, 'Z'].join(' ');
                  cumulativeAngle += angle;
                  return <path key={cfg.parameter} d={d} fill={cfg.color} className="transition-all duration-700" style={{animationDelay: `${idx*0.05}s`}}/>;
                });
              })()}
              <text x="100" y="95" textAnchor="middle" className="text-sm font-bold fill-gray-600" transform="rotate(90 100 100)">Soil Health</text>
              <text x="100" y="105" textAnchor="middle" className="text-xs fill-gray-500" transform="rotate(90 100 100)">3-Day Avg</text>
            </svg>
          </div>
          <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
            {chartConfigs.map((cfg) => {
              const value = Number(averages?.[cfg.parameter] || 0);
              const pct = totalValue > 0 ? Math.round((value / totalValue) * 100) : 0;
              return (
                <div key={cfg.parameter} className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded-sm" style={{backgroundColor: cfg.color}}/>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-700 truncate">{cfg.label}</div>
                    <div className="text-xs text-gray-500">{value}{cfg.unit} ({pct}%)</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Render 5-readings day result cards (Day 1/2/3)
  const DayResultCard = ({ dayNumber, info }) => {
    const avg = info?.average || {};
    const ts = info?.completedTs ? new Date(info.completedTs) : null;
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Day {dayNumber} Completed</h3>
          {ts && (
            <div className="text-xs text-gray-500">{ts.toLocaleString()}</div>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 lg:gap-4">
          <Stat label="Soil Temp (°C)" value={avg.soilTemperature ?? avg.temperature ?? 0} />
          <Stat label="Moisture (%)" value={avg.moisture ?? 0} />
          <Stat label="N (ppm)" value={avg.nitrogen ?? 0} />
          <Stat label="P (ppm)" value={avg.phosphorus ?? 0} />
          <Stat label="K (ppm)" value={avg.potassium ?? 0} />
          <Stat label="pH" value={avg.ph ?? 0} />
        </div>
      </div>
    );
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

  // Latest 5 readings average (kept for other parts; no longer used for prefetch)
  const last5Average = useMemo(() => {
    if (!latestNewReadings || latestNewReadings.length < 5) return null;
    const latest = latestNewReadings.slice(0, 5);
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

  // Prefetch crop/fertilizer predictions using 3-Day averages and store in Firebase
  useEffect(() => {
    const run = async () => {
      if (!threeComplete || !threeDayAverage || !currentUser?.uid || prefetching || prefetchLocked) return;
      setPrefetchError("");
      setPrefetching(true);
      try {
        const tempToUse = Number(
          threeDayAverage.soilTemperature != null && !isNaN(Number(threeDayAverage.soilTemperature))
            ? threeDayAverage.soilTemperature
            : threeDayAverage.temperature
        );
        const payload = {
          nitrogen: Number(threeDayAverage.nitrogen),
          phosphorus: Number(threeDayAverage.phosphorus),
          potassium: Number(threeDayAverage.potassium),
          temperature: tempToUse,
          humidity: Number(threeDayAverage.moisture), // use Moisture as humidity proxy
          moisture: Number(threeDayAverage.moisture),
          ph: Number(threeDayAverage.ph),
          // rainfall intentionally omitted; will be added when user inputs it
          // soilTemperature removed from prepared payload to avoid duplication
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
  }, [threeComplete, threeDayAverage, currentUser?.uid, prefetching, prefetchLocked]);

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

  // Derive days tracked from 3-day batching (completed days), fallback to dailySummaries
  const daysTracked = (() => {
    const completed =
      (dayBuckets?.day1?.isComplete ? 1 : 0) +
      (dayBuckets?.day2?.isComplete ? 1 : 0) +
      (dayBuckets?.day3?.isComplete ? 1 : 0);
    return completed > 0 ? completed : (dailySummaries?.length || 0);
  })();

  const implementedResults = results.filter((r) => r.status === "implemented");
  const pendingResults = results.filter((r) => r.status === "pending");

  return (
    <div className="min-h-screen bg-gray-50 p-0 page-with-top-gap overflow-x-hidden">
      <div className="w-full pl-4 sm:pl-6 pr-4 sm:pr-6 pt-0 max-w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-4 sm:mb-6"
        >
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 p-3 rounded-lg">
                <FileText className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Results</h1>
              </div>
            </div>
            {results.length > 0 && (
              <div className="flex items-center gap-3 flex-wrap w-full sm:w-auto justify-start sm:justify-end">
                <button
                  onClick={exportResults}
                  className="bg-primary-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-600 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl w-full sm:w-auto"
                >
                  <Download className="w-5 h-5" />
                  <span>Export Results</span>
                </button>
                <button
                  onClick={clearResults}
                  className="bg-red-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-600 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl w-full sm:w-auto"
                  title="Clear local results"
                >
                  <Trash2 className="w-5 h-5" />
                  <span>Clear Results & History</span>
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Day Results (5 readings per day) */}
        {dayBuckets && (dayBuckets.day1 || dayBuckets.day2 || dayBuckets.day3) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="mb-8"
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Day Results</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {dayBuckets.day1?.isComplete && (
                <DayResultCard dayNumber={1} info={dayBuckets.day1} />
              )}
              {dayBuckets.day2?.isComplete && (
                <DayResultCard dayNumber={2} info={dayBuckets.day2} />
              )}
              {dayBuckets.day3?.isComplete && (
                <DayResultCard dayNumber={3} info={dayBuckets.day3} />
              )}
            </div>
          </motion.div>
        )}

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

        {threeComplete && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-8"
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Data Summary</h2>
            <div className="grid grid-cols-1 gap-6 max-w-full">
              <ThreeDayDonut averages={threeDayAverage} />
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 w-full max-w-full overflow-x-hidden">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center justify-center sm:justify-start gap-2">
                  <FlaskConical className="w-5 h-5 text-primary-600" />
                  <span>3-Day Average Values</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 max-w-full">
                  <Stat boxed label="Soil Temp" unit="°C" decimals={1} value={threeDayAverage.soilTemperature ?? threeDayAverage.temperature ?? 0} />
                  <Stat boxed label="Moisture" unit="%" decimals={1} value={threeDayAverage.moisture ?? 0} />
                  <Stat boxed label="N" unit=" mg/kg" decimals={1} value={threeDayAverage.nitrogen ?? 0} />
                  <Stat boxed label="P" unit=" mg/kg" decimals={1} value={threeDayAverage.phosphorus ?? 0} />
                  <Stat boxed label="K" unit=" mg/kg" decimals={1} value={threeDayAverage.potassium ?? 0} />
                  <Stat boxed label="pH" unit="" decimals={1} value={Math.min(threeDayAverage.ph ?? 0, 8)} />
                </div>
                <div className="text-xs text-gray-500 mt-3 text-center sm:text-left">Averaged across 3 completed days</div>
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
                  <div className="text-2xl font-bold text-gray-800">{daysTracked}</div>
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
                  <div className="text-2xl font-bold text-gray-800">5</div>
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
const Stat = ({ label, value, boxed = false, unit = "", decimals = 1 }) => {
  const display = Number.isFinite(Number(value)) ? Number(value).toFixed(decimals) : value;
  const classes = boxed
    ? "text-center p-3 bg-gray-50 rounded-xl shadow-sm"
    : "text-center";
  return (
    <div className={classes}>
      <div className="text-xs sm:text-sm text-gray-600 mb-1">{label}</div>
      <div className="text-lg sm:text-xl font-semibold text-gray-900">{display}{unit}</div>
    </div>
  );
};

export default Results;

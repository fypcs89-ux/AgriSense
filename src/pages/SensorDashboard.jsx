import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { database } from "../firebase/config";
import ChartCard from "../components/ChartCard.jsx";
import {
  Thermometer,
  Droplets,
  Beaker,
  Leaf,
  FlaskConical,
  TestTube,
  Activity,
  RefreshCw,
} from "lucide-react";

const SensorDashboard = () => {
  const [sensorData, setSensorData] = useState({
    temperature: 0,
    soilTemperature: 0,
    humidity: 0,
    moisture: 0,
    nitrogen: 0,
    phosphorus: 0,
    potassium: 0,
    ph: 0,
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    // Attach a realtime listener. Try multiple common paths and shapes.
    let detach = null;

    const mapReading = (data) => {
      if (!data || typeof data !== "object") return null;
      // Shape A: nested { dht11: {temperature, humidity}, npk: {soilHumidity, nitrogen, phosphorus, potassium, ph} }
      if (data?.dht11 || data?.npk) {
        return {
          temperature: Number(data?.dht11?.temperature ?? 0),
          soilTemperature: Number(
            data?.npk?.soilTemperature ??
            data?.npk?.soil_temp ??
            data?.npk?.soilTemp ??
            data?.soilTemperature ??
            data?.soil_temp ??
            data?.soilTemp ??
            0
          ),
          humidity: Number(data?.dht11?.humidity ?? 0),
          moisture: Number(data?.npk?.soilHumidity ?? 0),
          nitrogen: Number(data?.npk?.nitrogen ?? 0),
          phosphorus: Number(data?.npk?.phosphorus ?? 0),
          potassium: Number(data?.npk?.potassium ?? 0),
          ph: Number(data?.npk?.ph ?? 0),
        };
      }
      // Shape B: flat keys { temperature, humidity, moisture, nitrogen, phosphorus, potassium, ph }
      if (
        "temperature" in data ||
        "humidity" in data ||
        "moisture" in data ||
        "nitrogen" in data ||
        "phosphorus" in data ||
        "potassium" in data ||
        "ph" in data
      ) {
        return {
          temperature: Number(data?.temperature ?? 0),
          soilTemperature: Number(
            data?.soilTemperature ??
            data?.soil_temp ??
            data?.soilTemp ??
            0
          ),
          humidity: Number(data?.humidity ?? 0),
          moisture: Number(data?.moisture ?? data?.soilHumidity ?? 0),
          nitrogen: Number(data?.nitrogen ?? 0),
          phosphorus: Number(data?.phosphorus ?? 0),
          potassium: Number(data?.potassium ?? 0),
          ph: Number(data?.ph ?? 0),
        };
      }
      return null;
    };

    const startListener = async () => {
      const { ref, onValue } = await import("firebase/database");
      const primaryPath = "sensorData"; // fastest path for your setup
      const fallbacks = ["sensors/current", "sensors/currentReadings"];

      let settled = false;
      let unsubscribeProbe = null;

      // Subscribe to primary immediately
      const primaryRef = ref(database, primaryPath);
      unsubscribeProbe = onValue(primaryRef, (snap) => {
        const mapped = mapReading(snap.val());
        if (mapped) {
          settled = true;
          setSensorData(mapped);
          setLastUpdated(new Date());
          setLoading(false);
          // Switch to stable listener only on the chosen path
          if (typeof unsubscribeProbe === "function") {
            try { unsubscribeProbe(); } catch {}
          }
          const offStable = onValue(primaryRef, (s2) => {
            const m2 = mapReading(s2.val());
            if (m2) {
              setSensorData(m2);
              setLastUpdated(new Date());
            }
          });
          detach = () => { try { offStable && offStable(); } catch {} };
        }
      });

      // Quick fallback if primary gives no data fast
      setTimeout(async () => {
        if (settled) return;
        if (typeof unsubscribeProbe === "function") {
          try { unsubscribeProbe(); } catch {}
        }
        // Try fallbacks in order with a short probe
        for (const p of fallbacks) {
          const r = ref(database, p);
          let off = null;
          const done = new Promise((resolve) => {
            off = onValue(r, (s3) => {
              const m3 = mapReading(s3.val());
              if (m3 && !settled) {
                settled = true;
                setSensorData(m3);
                setLastUpdated(new Date());
                setLoading(false);
                resolve(true);
              }
            }, () => resolve(false));
            setTimeout(() => resolve(false), 200);
          });
          const ok = await done;
          if (ok) {
            // Keep stable listener on this fallback path
            if (typeof off === "function") { try { off(); } catch {} }
            const offStable = onValue(r, (s4) => {
              const m4 = mapReading(s4.val());
              if (m4) {
                setSensorData(m4);
                setLastUpdated(new Date());
              }
            });
            detach = () => { try { offStable && offStable(); } catch {} };
            return;
          } else if (typeof off === "function") {
            try { off(); } catch {}
          }
        }
        // No data at any path
        setLoading(false);
        console.warn("[SensorDashboard] No sensor data at expected paths.");
      }, 250); // 250ms to fallback quickly
    };

    startListener();

    return () => {
      if (typeof detach === "function") detach();
    };
  }, []);

  const sensorCards = [
    {
      title: "Enviroment tem",
      value: sensorData.temperature,
      unit: "°C",
      color: "temperature",
      icon: Thermometer,
    },
    {
      title: "Soil Temperature",
      value: sensorData.soilTemperature,
      unit: "°C",
      color: "temperature",
      icon: Thermometer,
    },
    {
      title: "Enviroment Humidity",
      value: sensorData.humidity,
      unit: "%",
      color: "humidity",
      icon: Droplets,
    },
    {
      title: "Soil Moisture",
      value: sensorData.moisture,
      unit: "%",
      color: "moisture",
      icon: Beaker,
    },
    {
      title: "Nitrogen (N)",
      value: sensorData.nitrogen,
      unit: "ppm",
      color: "nitrogen",
      icon: Leaf,
    },
    {
      title: "Phosphorus (P)",
      value: sensorData.phosphorus,
      unit: "ppm",
      color: "phosphorus",
      icon: FlaskConical,
    },
    {
      title: "Potassium (K)",
      value: sensorData.potassium,
      unit: "ppm",
      color: "potassium",
      icon: TestTube,
    },
    {
      title: "pH Level",
      value: sensorData.ph,
      unit: "pH",
      color: "ph",
      icon: Activity,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading sensor data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-0 page-with-top-gap">
      <div className="w-full pl-4 sm:pl-6 pr-4 sm:pr-6 pt-0 pb-6 sm:pb-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-4 sm:mb-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Sensor Dashboard
              </h1>
              <p className="text-gray-600">
                Real-time monitoring of your agricultural sensors
              </p>
            </div>
            <div className="text-right">
              <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-600">Live Data</span>
                </div>
                {lastUpdated && (
                  <div className="text-xs text-gray-500 mt-1">
                    Last updated: {lastUpdated.toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Sensor Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
          {sensorCards.map((sensor, index) => (
            <motion.div
              key={sensor.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <ChartCard
                title={sensor.title}
                value={sensor.value}
                unit={sensor.unit}
                color={sensor.color}
                icon={sensor.icon}
              />
            </motion.div>
          ))}
        </div>

        {/* Status Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-green-100 p-2 rounded-lg">
                <Activity className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">
                System Status
              </h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Connection</span>
                <span className="text-green-600 font-medium">Online</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Sensors</span>
                <span className="text-green-600 font-medium">7/7 Active</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Data Quality</span>
                <span className="text-green-600 font-medium">Excellent</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Thermometer className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">
                Environmental
              </h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Enviroment tem</span>
                <span
                  className={`font-medium ${
                    sensorData.temperature > 30
                      ? "text-red-600"
                      : "text-green-600"
                  }`}
                >
                  {sensorData.temperature > 30 ? "High" : "Optimal"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Enviroment Humidity</span>
                <span
                  className={`font-medium ${
                    sensorData.humidity > 70
                      ? "text-yellow-600"
                      : "text-green-600"
                  }`}
                >
                  {sensorData.humidity > 70 ? "High" : "Good"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Soil Moisture</span>
                <span
                  className={`font-medium ${
                    sensorData.moisture < 30 ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {sensorData.moisture < 30 ? "Low" : "Adequate"}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-purple-100 p-2 rounded-lg">
                <FlaskConical className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">Nutrients</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Nitrogen</span>
                <span
                  className={`font-medium ${
                    sensorData.nitrogen > 70
                      ? "text-green-600"
                      : "text-yellow-600"
                  }`}
                >
                  {sensorData.nitrogen > 70 ? "Good" : "Moderate"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Phosphorus</span>
                <span
                  className={`font-medium ${
                    sensorData.phosphorus > 50
                      ? "text-green-600"
                      : "text-yellow-600"
                  }`}
                >
                  {sensorData.phosphorus > 50 ? "Good" : "Low"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Potassium</span>
                <span
                  className={`font-medium ${
                    sensorData.potassium > 80
                      ? "text-green-600"
                      : "text-yellow-600"
                  }`}
                >
                  {sensorData.potassium > 80 ? "Excellent" : "Moderate"}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SensorDashboard;

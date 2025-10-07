// Demo configuration - works without Firebase setup
// For production, replace with your actual Firebase config

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";

// Determine mode using environment variables (Vite: import.meta.env)
const envConfig = {
  apiKey: import.meta?.env?.VITE_FIREBASE_API_KEY,
  authDomain: import.meta?.env?.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta?.env?.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta?.env?.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta?.env?.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta?.env?.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta?.env?.VITE_FIREBASE_APP_ID,
};

// Force-disable demo mode: always use real Firebase services
const envDemoFlag = false;
const isConfigured = Boolean(envConfig.databaseURL);
const isDemoMode = false;

let auth, database, firestore;
let configSource = "unknown";
let loadedInfo = { projectId: undefined, databaseURL: undefined, hasApiKey: false, hasAppId: false };

if (isDemoMode) {
  // Demo mode - create mock Firebase services
  console.log("Running in demo mode - authentication will be simulated");

  // Mock auth service
  auth = {
    currentUser: null,
    onAuthStateChanged: (callback) => {
      // Check localStorage for demo user
      const demoUser = localStorage.getItem("agrisense-demo-user");
      if (demoUser) {
        const user = JSON.parse(demoUser);
        setTimeout(() => callback(user), 100);
      } else {
        setTimeout(() => callback(null), 100);
      }
      return () => {}; // unsubscribe function
    },
  };

  // Mock database service
  database = {
    ref: (path) => ({
      on: (eventType, callback) => {
        // Simulate real-time data for demo
        if (path === "sensors/current") {
          setTimeout(() => {
            callback({
              val: () => ({
                temperature: (Math.random() * 10 + 20).toFixed(1),
                humidity: (Math.random() * 30 + 50).toFixed(1),
                moisture: (Math.random() * 40 + 30).toFixed(1),
                nitrogen: (Math.random() * 40 + 60).toFixed(1),
                phosphorus: (Math.random() * 30 + 30).toFixed(1),
                potassium: (Math.random() * 30 + 70).toFixed(1),
                ph: (Math.random() * 2 + 6).toFixed(1),
              }),
            });
          }, 100);
        } else {
          setTimeout(() => callback({ val: () => null }), 100);
        }
        return () => {}; // unsubscribe function
      },
      off: () => {},
      once: (eventType) =>
        Promise.resolve({
          val: () => null,
          exists: () => false,
        }),
      set: () => Promise.resolve(),
      push: () => Promise.resolve({ key: Date.now().toString() }),
      remove: () => Promise.resolve(),
      orderByKey: () => ({
        limitToLast: () => ({
          on: (eventType, callback) => {
            setTimeout(() => callback({ val: () => null }), 100);
            return () => {};
          },
        }),
      }),
    }),
  };

  // Mock firestore service
  firestore = {};
} else {
  // Real Firebase configuration
  // Basic runtime diagnostics (no secrets)
  try {
    loadedInfo = {
      projectId: envConfig.projectId,
      databaseURL: envConfig.databaseURL,
      hasApiKey: Boolean(envConfig.apiKey),
      hasAppId: Boolean(envConfig.appId),
    };
    console.debug?.("[Firebase] Loading config (sanitized)", loadedInfo);
  } catch {}

  const hasEnvConfig = Boolean(envConfig?.apiKey && envConfig?.projectId && envConfig?.databaseURL);

  // If env not present, we will silently use fallback to avoid noisy console.

  // Fallback config based on user's provided details (storageBucket normalized)
  const fallbackConfig = {
    apiKey: "AIzaSyCAAyO0VmZHH-NuzRqiLFYF5iZRywHf1fs",
    authDomain: "crop-and-fertilizer-fyp.firebaseapp.com",
    databaseURL:
      "https://crop-and-fertilizer-fyp-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "crop-and-fertilizer-fyp",
    storageBucket: "crop-and-fertilizer-fyp.appspot.com",
    messagingSenderId: "835549464171",
    appId: "1:835549464171:web:fe48283cd050dfa8c2d32e",
  };

  const finalConfig = hasEnvConfig ? envConfig : fallbackConfig;

  configSource = hasEnvConfig ? "env" : "fallback";
  try {
    console.debug?.("[Firebase] Using config source:", configSource);
  } catch {}

  const app = initializeApp(finalConfig);
  // Re-enable Auth with safe init
  try {
    auth = getAuth(app);
  } catch (e) {
    console.info("[Firebase] Auth not initialized (non-fatal):", e?.message || e);
    auth = null;
  }
  database = getDatabase(app);
  firestore = getFirestore(app);
}

// Shared demo data generator to ensure consistency between pages
// Simulated hourly data storage
let simulatedHourlyData = [];
let simulatedDailySummaries = [];
let currentDay = 1;
let currentHour = 0;

// Function to simulate hourly data collection
export const simulateHourlyDataCollection = () => {
  const now = new Date();
  const today = new Date(2025, 7, 25); // August 25, 2025
  const currentDate = new Date(
    today.getTime() + (currentDay - 1) * 24 * 60 * 60 * 1000
  );

  // Generate current sensor reading
  const hourlyReading = {
    id: `${currentDate.toISOString().split("T")[0]}_hour_${currentHour}`,
    timestamp: new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate(),
      currentHour,
      0,
      0
    ),
    avgTemperature: (25 + Math.random() * 10).toFixed(1),
    avgHumidity: (60 + Math.random() * 20).toFixed(1),
    avgMoisture: (45 + Math.random() * 20).toFixed(1),
    avgNitrogen: (45 + Math.random() * 15).toFixed(1),
    avgPhosphorus: (30 + Math.random() * 10).toFixed(1),
    avgPotassium: (60 + Math.random() * 15).toFixed(1),
    avgPh: (6.5 + Math.random() * 1).toFixed(1),
    readingCount: Math.floor(Math.random() * 20) + 100,
    hour: currentHour,
    day: currentDay,
    date: currentDate.toISOString().split("T")[0],
  };

  simulatedHourlyData.push(hourlyReading);
  currentHour++;

  // When 24 hours complete, create daily summary
  if (currentHour >= 24) {
    const dayData = simulatedHourlyData.filter(
      (reading) => reading.day === currentDay
    );
    const dailySummary = {
      id: `day_${currentDay}`,
      date: currentDate.toISOString().split("T")[0],
      dayNumber: currentDay,
      totalReadings: dayData.reduce(
        (sum, reading) => sum + reading.readingCount,
        0
      ),
      hourCount: 24,
      isComplete: true,
      avgTemperature: (
        dayData.reduce(
          (sum, reading) => sum + parseFloat(reading.avgTemperature),
          0
        ) / 24
      ).toFixed(1),
      avgHumidity: (
        dayData.reduce(
          (sum, reading) => sum + parseFloat(reading.avgHumidity),
          0
        ) / 24
      ).toFixed(1),
      avgMoisture: (
        dayData.reduce(
          (sum, reading) => sum + parseFloat(reading.avgMoisture),
          0
        ) / 24
      ).toFixed(1),
      avgNitrogen: (
        dayData.reduce(
          (sum, reading) => sum + parseFloat(reading.avgNitrogen),
          0
        ) / 24
      ).toFixed(1),
      avgPhosphorus: (
        dayData.reduce(
          (sum, reading) => sum + parseFloat(reading.avgPhosphorus),
          0
        ) / 24
      ).toFixed(1),
      avgPotassium: (
        dayData.reduce(
          (sum, reading) => sum + parseFloat(reading.avgPotassium),
          0
        ) / 24
      ).toFixed(1),
      avgPh: (
        dayData.reduce((sum, reading) => sum + parseFloat(reading.avgPh), 0) /
        24
      ).toFixed(1),
    };

    simulatedDailySummaries.push(dailySummary);
    currentDay++;
    currentHour = 0;
  }
};

export const generateSharedDemoData = () => {
  return simulatedHourlyData;
};

export const getSimulatedDailySummaries = () => {
  return simulatedDailySummaries;
};

export const getCurrentSimulationStatus = () => {
  return {
    currentDay,
    currentHour,
    totalHours: simulatedHourlyData.length,
    completedDays: simulatedDailySummaries.length,
  };
};

// Auto-simulate data collection every 1 hour (realistic timing) - only when user is logged in
let dataCollectionInterval = null;

export const startDataCollection = () => {
  if (isDemoMode && !dataCollectionInterval) {
    dataCollectionInterval = setInterval(() => {
      simulateHourlyDataCollection();
    }, 3600000); // 1 hour = 3600000 milliseconds
    console.log("Data collection started - hourly intervals active");
  }
};

export const stopDataCollection = () => {
  if (dataCollectionInterval) {
    clearInterval(dataCollectionInterval);
    dataCollectionInterval = null;
    console.log("Data collection stopped");
  }
};

export { auth, database, firestore, isDemoMode };
export const firebaseDiagnostics = { configSource: () => configSource, loadedInfo: () => loadedInfo };

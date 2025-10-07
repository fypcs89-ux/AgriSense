import React, { createContext, useContext, useState, useEffect } from "react";
import { database } from "../firebase/config";
import { useAuth } from "./AuthContext";

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};

export const DataProvider = ({ children }) => {
  const [hourlyData, setHourlyData] = useState([]);
  const [dailySummaries, setDailySummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  // Clear all history (hourly and daily) for the current user from Firebase
  const clearHistory = async () => {
    try {
      const { ref, remove } = await import("firebase/database");
      if (!currentUser?.uid) {
        setHourlyData([]);
        setDailySummaries([]);
        return;
      }
      const base = `users/${currentUser.uid}/history`;
      const hourlyRef = ref(database, `${base}/hourly`);
      const dailyRef = ref(database, `${base}/daily`);
      await Promise.all([remove(hourlyRef), remove(dailyRef)]);
      // Optimistically update local state
      setHourlyData([]);
      setDailySummaries([]);
    } catch (e) {
      console.error("Failed to clear history:", e);
      throw e;
    }
  };

  // Fetch and synchronize data for the current user
  useEffect(() => {
    // Immediately clear previous user's data in UI
    setHourlyData([]);
    setDailySummaries([]);
    setLoading(true);

    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }
    import("firebase/database").then(({ ref, onValue }) => {
      const base = `users/${currentUser.uid}/history`;
      const historyRef = ref(database, `${base}/hourly`);
      const summaryRef = ref(database, `${base}/daily`);

      const unsubscribeHistory = onValue(historyRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const historyArray = Object.entries(data)
            .map(([key, value]) => ({
              id: key,
              timestamp: value?.timestamp
                ? new Date(value.timestamp)
                : new Date(),
              ...value,
            }))
            .sort((a, b) => b.timestamp - a.timestamp);

          setHourlyData(historyArray);
        } else {
          setHourlyData([]);
        }
        setLoading(false);
      });

      const unsubscribeSummary = onValue(summaryRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const summaryArray = Object.entries(data)
            .map(([key, value]) => ({
              id: key,
              ...value,
            }))
            .sort((a, b) => (b.dayNumber || 0) - (a.dayNumber || 0));

          setDailySummaries(summaryArray);
        } else {
          setDailySummaries([]);
        }
      });

      return () => {
        unsubscribeHistory();
        unsubscribeSummary();
      };
    });
  }, [currentUser?.uid]);

  // History writer: listens to live sensorData and appends a record
  // - Writes the very first snapshot once when app starts
  // - Then writes only when values actually change (dedup)
  // - Uses a short throttle window to avoid double-writes from rapid successive events
  useEffect(() => {
    // If a previous listener exists (from another user/HMR), detach it first
    if (
      typeof window !== "undefined" &&
      typeof window.__agrisense_history_unsub === "function"
    ) {
      try {
        window.__agrisense_history_unsub();
      } catch {}
      window.__agrisense_history_unsub = null;
    }

    let unsubscribe = null;
    let isWriting = false;
    // Persist guards across HMR in dev
    if (typeof window !== "undefined") {
      // Reset guards when user changes so each user gets an initial write
      window.__agrisense_history_last_signature = null;
      window.__agrisense_history_last_write_ms = 0;
      window.__agrisense_history_wrote_initial = false;
    }

    import("firebase/database").then(({ ref, onValue, set }) => {
      const sensorRef = ref(database, "sensorData");

      unsubscribe = onValue(sensorRef, async (snapshot) => {
        const data = snapshot.val();
        if (!data || isWriting) return;
        // Skip writes when no authenticated user
        if (!currentUser?.uid) return;

        try {
          isWriting = true;
          const now = new Date();
          const yyyy = now.getFullYear();
          const mm = String(now.getMonth() + 1).padStart(2, "0");
          const dd = String(now.getDate()).padStart(2, "0");
          const HH = String(now.getHours()).padStart(2, "0");
          const MM = String(now.getMinutes()).padStart(2, "0");
          const SS = String(now.getSeconds()).padStart(2, "0");
          const MS = String(now.getMilliseconds()).padStart(3, "0");
          const dateStr = `${yyyy}-${mm}-${dd}`;
          const entryId = `${yyyy}${mm}${dd}_${HH}${MM}${SS}${MS}`; // e.g., 20250930_203045123
          const base = `users/${currentUser.uid}/history`;
          const entryRef = ref(database, `${base}/hourly/${entryId}`);
          const curVals = {
            temperature: Number(
              data?.dht11?.temperature ?? data?.temperature ?? 0
            ),
            soilTemperature: Number(
              data?.npk?.soilTemperature ?? data?.soilTemperature ?? 0
            ),
            humidity: Number(data?.dht11?.humidity ?? data?.humidity ?? 0),
            moisture: Number(
              data?.npk?.soilHumidity ??
                data?.moisture ??
                data?.soilHumidity ??
                0
            ),
            nitrogen: Number(data?.npk?.nitrate ?? data?.npk?.nitrogen ?? data?.nitrogen ?? 0),
            phosphorus: Number(data?.npk?.phosphorus ?? data?.phosphorus ?? 0),
            potassium: Number(data?.npk?.potassium ?? data?.potassium ?? 0),
            ph: Number(data?.npk?.ph ?? data?.ph ?? 0),
          };

          // Build a short signature of the values to detect duplicates
          const signature = `${curVals.temperature}|${curVals.soilTemperature}|${curVals.humidity}|${curVals.moisture}|${curVals.nitrogen}|${curVals.phosphorus}|${curVals.potassium}|${curVals.ph}`;
          const nowMs = Date.now();
          const wroteInitial =
            typeof window !== "undefined"
              ? window.__agrisense_history_wrote_initial !== undefined
                ? window.__agrisense_history_wrote_initial
                : false
              : false;
          const lastSig =
            typeof window !== "undefined"
              ? window.__agrisense_history_last_signature !== undefined
                ? window.__agrisense_history_last_signature
                : null
              : null;
          const lastMs =
            typeof window !== "undefined"
              ? window.__agrisense_history_last_write_ms !== undefined
                ? window.__agrisense_history_last_write_ms
                : 0
              : 0;

          // If initial hasn't been written yet, write it now exactly once
          if (!wroteInitial) {
            if (typeof window !== "undefined") {
              window.__agrisense_history_wrote_initial = true;
              window.__agrisense_history_last_signature = signature;
              window.__agrisense_history_last_write_ms = nowMs;
            }
            // proceed to write payload below
          } else {
            // Deduplicate: same signature within 2000ms -> skip
            if (signature === lastSig && nowMs - lastMs < 2000) {
              return; // ignore duplicate burst
            }
            if (typeof window !== "undefined") {
              window.__agrisense_history_last_signature = signature;
              window.__agrisense_history_last_write_ms = nowMs;
            }
          }

          const payload = {
            timestamp: now.toISOString(),
            date: dateStr,
            hour: now.getHours(),
            day: now.getDate(),
            temperature: curVals.temperature.toFixed(1),
            soilTemperature: curVals.soilTemperature.toFixed(1),
            humidity: curVals.humidity.toFixed(1),
            moisture: curVals.moisture.toFixed(1),
            nitrogen: curVals.nitrogen.toFixed(1),
            phosphorus: curVals.phosphorus.toFixed(1),
            potassium: curVals.potassium.toFixed(1),
            ph: curVals.ph.toFixed(1),
            readingCount: 1,
          };
          await set(entryRef, payload);
        } catch (e) {
          console.error("Failed writing hourly snapshot:", e);
        } finally {
          isWriting = false;
        }
      });
    });

    return () => {
      if (typeof unsubscribe === "function") {
        try {
          unsubscribe();
        } catch {}
      }
      if (typeof window !== "undefined") {
        window.__agrisense_history_unsub = null;
      }
    };
  }, [currentUser?.uid]);

  // Daily summary rollup: aggregate today's entries into history/daily/YYYYMMDD
  useEffect(() => {
    // Do not run summary if unauthenticated
    if (!currentUser?.uid) {
      return;
    }
    let timer = null;
    let isSummarizing = false;

    const summarize = async () => {
      if (isSummarizing) return;
      isSummarizing = true;
      try {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const dd = String(now.getDate()).padStart(2, "0");
        const dayKey = `${yyyy}${mm}${dd}`;
        const dateStr = `${yyyy}-${mm}-${dd}`;

        const { ref, query, orderByKey, startAt, endAt, get, set } =
          await import("firebase/database");

        const dayStartKey = `${dayKey}_00`;
        const dayEndKey = `${dayKey}_23`;
        const base = `users/${currentUser.uid}/history`;
        const bucketsRef = ref(database, `${base}/hourly`);
        const q = query(
          bucketsRef,
          orderByKey(),
          startAt(dayStartKey),
          endAt(dayEndKey)
        );
        const snap = await get(q);
        const vals = snap.val() || {};
        const entries = Object.values(vals);

        const entryCount = entries.length;
        const sum = (arr, key) =>
          arr.reduce((s, it) => s + Number(it?.[key] || 0), 0);
        const totalReadings = sum(entries, "readingCount");

        const avgOrZero = (key) =>
          entryCount ? (sum(entries, key) / entryCount).toFixed(1) : 0;

        const summary = {
          id: dayKey,
          date: dateStr,
          dayNumber: Number(dd),
          totalReadings: Number(totalReadings || 0),
          hourCount: entryCount,
          isComplete: entryCount >= 24, // heuristic
          avgTemperature: avgOrZero("temperature"),
          avgSoilTemperature: avgOrZero("soilTemperature"),
          avgHumidity: avgOrZero("humidity"),
          avgMoisture: avgOrZero("moisture"),
          avgNitrogen: avgOrZero("nitrogen"),
          avgPhosphorus: avgOrZero("phosphorus"),
          avgPotassium: avgOrZero("potassium"),
          avgPh: avgOrZero("ph"),
        };

        const summaryRef = ref(database, `${base}/daily/${dayKey}`);
        await set(summaryRef, summary);
      } catch (e) {
        console.error("Failed daily summary rollup:", e);
        // Add fallback or recovery logic here if needed
      } finally {
        isSummarizing = false;
      }
    };

    // Run immediately and then every 5 minutes to keep summary fresh
    summarize();
    timer = setInterval(summarize, 5 * 60 * 1000);

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [currentUser?.uid]);

  return (
    <DataContext.Provider
      value={{ hourlyData, dailySummaries, loading, clearHistory }}
    >
      {children}
    </DataContext.Provider>
  );
};

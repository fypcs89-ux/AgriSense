import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { database } from "../firebase/config";
import { useAuth } from "./AuthContext";

const DataContext = createContext();

// Feature flag to enable/disable storing hourly history under
// `users/{uid}/history/hourly`. Set to false to remove/guard writer & readers.
const ENABLE_HOURLY_HISTORY = true;

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
  // Day batching state (synced from Firebase)
  const [dayBuckets, setDayBuckets] = useState({}); // { day1: {...}, day2: {...}, day3: {...}, currentDay }
  const cycleGuardRef = useRef({ lastEntryId: null });

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
      const day1Ref = ref(database, `${base}/day1`);
      const day2Ref = ref(database, `${base}/day2`);
      const day3Ref = ref(database, `${base}/day3`);
      const currentDayRef = ref(database, `${base}/currentDay`);

      let unsubscribeHistory = null;
      if (ENABLE_HOURLY_HISTORY) {
        unsubscribeHistory = onValue(historyRef, (snapshot) => {
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
      } else {
        // When hourly history is disabled, ensure state is empty and loading is cleared
        setHourlyData([]);
        setLoading(false);
      }

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

      const mergeDays = (d1, d2, d3, cur) => {
        setDayBuckets({
          day1: d1 || null,
          day2: d2 || null,
          day3: d3 || null,
          currentDay: Number(cur || 1),
        });
      };

      let d1 = null, d2 = null, d3 = null, cd = 1;
      const u1 = onValue(day1Ref, (s) => { d1 = s.val() || null; mergeDays(d1, d2, d3, cd); });
      const u2 = onValue(day2Ref, (s) => { d2 = s.val() || null; mergeDays(d1, d2, d3, cd); });
      const u3 = onValue(day3Ref, (s) => { d3 = s.val() || null; mergeDays(d1, d2, d3, cd); });
      const u4 = onValue(currentDayRef, (s) => { cd = Number(s.val() || 1); mergeDays(d1, d2, d3, cd); });

      return () => {
        if (typeof unsubscribeHistory === "function") {
          try { unsubscribeHistory(); } catch {}
        }
        unsubscribeSummary();
        try { u1 && u1(); } catch {}
        try { u2 && u2(); } catch {}
        try { u3 && u3(); } catch {}
        try { u4 && u4(); } catch {}
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

    import("firebase/database").then(({ ref, onValue, set, get, child, update }) => {
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
            // Air temperature preferred, fallback to flat or legacy dht11
            temperature: Number(
              data?.air?.temperature ?? data?.temperature ?? data?.dht11?.temperature ?? 0
            ),
            // Soil temperature: prefer soil.temperature then legacy variants and flat fallbacks
            soilTemperature: Number(
              data?.soil?.temperature ??
              data?.soil?.soilTemperature ??
              data?.soil?.soil_temp ??
              data?.soil?.soilTemp ??
              data?.soilTemperature ??
              0
            ),
            // Air humidity preferred, fallback to flat or legacy dht11
            humidity: Number(
              data?.air?.humidity ?? data?.humidity ?? data?.dht11?.humidity ?? 0
            ),
            // Soil moisture/humidity: prefer soil.humidity then soil.soilHumidity then flat
            moisture: Number(
              data?.soil?.humidity ??
              data?.soil?.soilHumidity ??
              data?.moisture ??
              data?.soilHumidity ??
              0
            ),
            // Nutrients: prefer N/P/K/pH on soil, fallback to legacy names and flat
            nitrogen: Number(
              data?.soil?.N ?? data?.soil?.nitrogen ?? data?.npk?.nitrate ?? data?.npk?.nitrogen ?? data?.nitrogen ?? 0
            ),
            phosphorus: Number(
              data?.soil?.P ?? data?.soil?.phosphorus ?? data?.npk?.phosphorus ?? data?.phosphorus ?? 0
            ),
            potassium: Number(
              data?.soil?.K ?? data?.soil?.potassium ?? data?.npk?.potassium ?? data?.potassium ?? 0
            ),
            ph: Number(
              data?.soil?.pH ?? data?.soil?.ph ?? data?.npk?.ph ?? data?.ph ?? 0
            ),
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
          // Guarded: do not write hourly history when disabled
          if (ENABLE_HOURLY_HISTORY) {
            await set(entryRef, payload);
          }

          // Also feed the day-batching pipeline (5 readings per day)
          try {
            await addReadingToDayBucket({
              basePath: base,
              entryId,
              reading: payload,
              get,
              set,
              update,
              refFn: ref,
            });
          } catch (e) {
            console.warn("Day-batching addReading failed:", e);
          }
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
    if (!currentUser?.uid || !ENABLE_HOURLY_HISTORY) {
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

  // ---------------- Day-batching helpers ----------------
  const addReadingToDayBucket = async ({ basePath, entryId, reading, get, set, update, refFn }) => {
    if (cycleGuardRef.current.lastEntryId === entryId) return;
    cycleGuardRef.current.lastEntryId = entryId;

    const currentDayRef = refFn(database, `${basePath}/currentDay`);
    const snapDay = await get(currentDayRef).catch(() => null);
    let currentDay = Number(snapDay?.val() || 1);
    if (currentDay < 1 || currentDay > 3) currentDay = 1;

    const dayKey = `day${currentDay}`;
    const dayRef = refFn(database, `${basePath}/${dayKey}`);
    const daySnap = await get(dayRef).catch(() => null);
    const dayData = daySnap?.val() || {};
    // If Day 3 is already completed, stop accepting new readings (no reset requested)
    if (currentDay === 3 && dayData?.isComplete) return;
    const readings = dayData.readings || {};
    if (readings[entryId]) return;

    readings[entryId] = reading;
    const readingCount = Object.keys(readings).length;
    const updated = { ...dayData, readings };
    await set(dayRef, updated);

    if (readingCount >= 5) {
      const averages = computeDailyAverage(readings);
      const completedTs = Date.now();
      await update(dayRef, { average: averages, completedTs, isComplete: true, count: readingCount });
      await update(refFn(database, `${basePath}/results/${dayKey}`), {
        day: currentDay,
        average: averages,
        ts: completedTs,
      });

      if (currentDay < 3) {
        await set(currentDayRef, currentDay + 1);
      } else {
        try {
          const d1 = (await get(refFn(database, `${basePath}/day1`))).val() || {};
          const d2 = (await get(refFn(database, `${basePath}/day2`))).val() || {};
          const d3 = (await get(refFn(database, `${basePath}/day3`))).val() || {};
          const finalAvg = computeThreeDayAverage([
            d1?.average || {},
            d2?.average || {},
            d3?.average || {},
          ]);
          await set(refFn(database, `${basePath}/finalAverage`), {
            ts: Date.now(),
            averages: finalAvg,
          });
          await sendToModel(finalAvg);
          // Mark cycleCompleted so UI can react if needed
          await set(refFn(database, `${basePath}/cycleComplete`), {
            ts: Date.now(),
            completed: true,
          });
        } catch (e) {
          console.warn("3-day average/model step failed:", e);
        }
      }
    }
  };

  const computeDailyAverage = (readingsObj) => {
    const items = Object.values(readingsObj || {});
    const n = items.length || 1;
    const sum = (key) => items.reduce((s, it) => s + Number(it?.[key] ?? 0), 0);
    const fmt = (v) => (Number.isFinite(v) ? Number(v.toFixed(1)) : 0);
    return {
      temperature: fmt(sum("temperature") / n),
      soilTemperature: fmt(sum("soilTemperature") / n),
      humidity: fmt(sum("humidity") / n),
      moisture: fmt(sum("moisture") / n),
      nitrogen: fmt(sum("nitrogen") / n),
      phosphorus: fmt(sum("phosphorus") / n),
      potassium: fmt(sum("potassium") / n),
      ph: fmt(sum("ph") / n),
    };
  };

  const computeThreeDayAverage = (dailyAvgs) => {
    const items = (dailyAvgs || []).filter(Boolean);
    const n = items.length || 1;
    const sum = (key) => items.reduce((s, it) => s + Number(it?.[key] ?? 0), 0);
    const fmt = (v) => (Number.isFinite(v) ? Number(v.toFixed(1)) : 0);
    return {
      temperature: fmt(sum("temperature") / n),
      soilTemperature: fmt(sum("soilTemperature") / n),
      humidity: fmt(sum("humidity") / n),
      moisture: fmt(sum("moisture") / n),
      nitrogen: fmt(sum("nitrogen") / n),
      phosphorus: fmt(sum("phosphorus") / n),
      potassium: fmt(sum("potassium") / n),
      ph: fmt(sum("ph") / n),
    };
  };

  const sendToModel = async (finalAvg) => {
    try {
      const tempToUse = Number(
        finalAvg?.soilTemperature != null && !isNaN(Number(finalAvg.soilTemperature))
          ? finalAvg.soilTemperature
          : finalAvg?.temperature || 0
      );
      const payload = {
        nitrogen: Number(finalAvg?.nitrogen || 0),
        phosphorus: Number(finalAvg?.phosphorus || 0),
        potassium: Number(finalAvg?.potassium || 0),
        temperature: tempToUse,
        humidity: Number(finalAvg?.moisture ?? finalAvg?.humidity ?? 0),
        ph: Number(finalAvg?.ph || 0),
      };
      const res = await fetch("/api/crop/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok || !data?.crop) return;

      // Do not auto-create prepared nodes here. Prepared nodes will be created
      // only when the user explicitly clicks the respective buttons on the UI.
    } catch (e) {
      console.warn("sendToModel failed:", e);
    }
  };

  const resetCycle = async (basePath, refFn, setFn) => {
    await Promise.all([
      setFn(refFn(database, `${basePath}/day1`), null),
      setFn(refFn(database, `${basePath}/day2`), null),
      setFn(refFn(database, `${basePath}/day3`), null),
      setFn(refFn(database, `${basePath}/results`), null),
    ]);
    await setFn(refFn(database, `${basePath}/currentDay`), 1);
  };

  return (
    <DataContext.Provider
      value={{
        hourlyData,
        dailySummaries,
        loading,
        clearHistory,
        dayBuckets,
        startNewCycle: async () => {
          try {
            if (!currentUser?.uid) return;
            const { ref, set } = await import("firebase/database");
            const base = `users/${currentUser.uid}/history`;
            await Promise.all([
              set(ref(database, `${base}/day1`), null),
              set(ref(database, `${base}/day2`), null),
              set(ref(database, `${base}/day3`), null),
              set(ref(database, `${base}/results`), null),
            ]);
            await set(ref(database, `${base}/currentDay`), 1);
          } catch (e) {
            console.warn("startNewCycle failed:", e);
          }
        },
        addReading: async (reading) => {
          try {
            if (!currentUser?.uid) return;
            const { ref, get, set, update } = await import("firebase/database");
            const now = new Date();
            const yyyy = now.getFullYear();
            const mm = String(now.getMonth() + 1).padStart(2, "0");
            const dd = String(now.getDate()).padStart(2, "0");
            const HH = String(now.getHours()).padStart(2, "0");
            const MM = String(now.getMinutes()).padStart(2, "0");
            const SS = String(now.getSeconds()).padStart(2, "0");
            const MS = String(now.getMilliseconds()).padStart(3, "0");
            const entryId = `${yyyy}${mm}${dd}_${HH}${MM}${SS}${MS}`;
            const base = `users/${currentUser.uid}/history`;
            await addReadingToDayBucket({
              basePath: base,
              entryId,
              reading,
              get,
              set,
              update,
              refFn: ref,
            });
          } catch (e) {
            console.warn("addReading helper failed:", e);
          }
        },
        computeDailyAverage,
        computeThreeDayAverage,
      }}
    >
      {children}
    </DataContext.Provider>
  );

};

(function () {
  "use strict";

  const KEY = "foco-cognitive-training-v1";

  function localDate(date) {
    const d = date || new Date();
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
  }

  function freshData() {
    return {
      schemaVersion: 1,
      startedAt: localDate(),
      level: 1,
      sessions: [],
      activeSession: null,
      prefs: { theme: "dark", selectedDay: null, method: "mixed", exposure: "standard" },
      records: { bestAccuracy: null, bestMemory: 0, bestStreak: 0 }
    };
  }

  function isProgramDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    return !Number.isNaN(new Date(value + "T12:00:00").getTime());
  }

  function isTimestamp(value) {
    return typeof value === "string" && !Number.isNaN(Date.parse(value));
  }

  function validHistorySession(session) {
    return !!session && typeof session === "object" &&
      typeof session.id === "string" &&
      (session.type === "memory" || session.type === "arithmetic") &&
      typeof session.completed === "boolean" &&
      Number.isInteger(session.programDay) && session.programDay >= 1 && session.programDay <= 90 &&
      isProgramDate(session.programDate) &&
      isTimestamp(session.startedAt) && isTimestamp(session.completedAt) &&
      Number.isFinite(session.elapsedSeconds) && session.elapsedSeconds >= 0 &&
      Number.isFinite(session.accuracy) && session.accuracy >= 0 && session.accuracy <= 100 &&
      Number.isInteger(session.exercisesCompleted) && session.exercisesCompleted >= 0 &&
      Array.isArray(session.exerciseResults) &&
      Number.isFinite(session.bestRecall) && session.bestRecall >= 0;
  }

  function validActiveSession(session) {
    return !!session && typeof session === "object" &&
      typeof session.id === "string" &&
      (session.type === "memory" || session.type === "arithmetic") &&
      Number.isInteger(session.level) && session.level >= 1 && session.level <= 5 &&
      Number.isInteger(session.programDay) && session.programDay >= 1 && session.programDay <= 90 &&
      isProgramDate(session.programDate) && isTimestamp(session.startedAt) &&
      Number.isFinite(session.elapsedSeconds) && session.elapsedSeconds >= 0 &&
      Number.isInteger(session.remainingSeconds) && session.remainingSeconds >= 0 && session.remainingSeconds <= 1200 &&
      Number.isFinite(session.lastTick) && typeof session.paused === "boolean" &&
      Array.isArray(session.exerciseResults) && Number.isInteger(session.completedExercises) && session.completedExercises >= 0;
  }

  function validateData(value) {
    if (!value || typeof value !== "object" || Array.isArray(value) || value.schemaVersion !== 1) {
      throw new Error("El archivo no contiene datos compatibles de Foco (versión 1).");
    }
    if (!Array.isArray(value.sessions) || !Number.isInteger(value.level) || value.level < 1 || value.level > 5) {
      throw new Error("El archivo de datos está incompleto o tiene valores no válidos.");
    }
    if (!value.prefs || !value.records || !isProgramDate(value.startedAt)) {
      throw new Error("Faltan campos requeridos en el archivo de datos.");
    }
    if (!value.sessions.every(validHistorySession) ||
      (value.activeSession && !validActiveSession(value.activeSession)) ||
      (value.prefs.theme !== "dark" && value.prefs.theme !== "light") ||
      (value.prefs.selectedDay !== null && (!Number.isInteger(value.prefs.selectedDay) || value.prefs.selectedDay < 1 || value.prefs.selectedDay > 90)) ||
      !["mixed", "distributive", "compensation", "trachtenberg", "doubling", "dividend", "factor", "divide5", "multiples"].includes(value.prefs.method) ||
      (value.prefs.exposure !== undefined && !["slower", "standard", "faster"].includes(value.prefs.exposure)) ||
      typeof value.records !== "object" || Array.isArray(value.records)) {
      throw new Error("El archivo contiene sesiones, preferencias o métricas con datos no válidos.");
    }
    return {
      schemaVersion: 1,
      startedAt: value.startedAt,
      level: value.level,
      sessions: value.sessions,
      activeSession: value.activeSession || null,
      prefs: Object.assign({ theme: "dark", selectedDay: null, method: "mixed", exposure: "standard" }, value.prefs),
      records: Object.assign({ bestAccuracy: null, bestMemory: 0, bestStreak: 0 }, value.records)
    };
  }

  function load() {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return freshData();
    try {
      return validateData(JSON.parse(raw));
    } catch (error) {
      console.error("No se pudieron leer los datos guardados de Foco.", error);
      throw new Error("No se pudieron leer los datos guardados. Exporta una copia si la tienes y revisa el almacenamiento del navegador.");
    }
  }

  function save(data) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(data));
    } catch (error) {
      console.error("No se pudieron guardar los datos de Foco.", error);
      throw new Error("No se pudieron guardar los cambios. Comprueba que el almacenamiento del navegador esté disponible.");
    }
  }

  function exportData(data) {
    return JSON.stringify(data, null, 2);
  }

  function importData(json) {
    let parsed;
    try {
      parsed = JSON.parse(json);
    } catch (error) {
      throw new Error("El archivo no contiene JSON válido.");
    }
    return validateData(parsed);
  }

  window.FocoStorage = { KEY, localDate, freshData, load, save, exportData, importData };
}());

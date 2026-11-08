(function () {
  "use strict";

  const LEVEL_NAMES = ["Fundamentos", "Consolidación", "Intermedio", "Avanzado", "Objetivo inicial"];
  const LEVEL_DETAILS = [
    "Secuencias cortas, palabras y operaciones básicas.",
    "Más elementos, interferencia y cálculo de dos cifras.",
    "Recuperación inversa, operaciones combinadas y desafío desbloqueado.",
    "Retención prolongada, operaciones complejas y mayor velocidad.",
    "Progresión gradual hacia 20 operaciones y sus resultados."
  ];

  function completedTrainingSessions(data) {
    return data.sessions.filter(function (session) {
      return session.completed && (session.type === "memory" || session.type === "arithmetic");
    });
  }

  function recommend(data) {
    const sessions = completedTrainingSessions(data).slice(-3);
    const scores = sessions.map(function (session) { return session.accuracy; }).filter(Number.isFinite);
    if (scores.length >= 3 && scores.slice(-3).every(function (score) { return score >= 90; })) {
      return { type: data.level < 5 ? "up" : "maintain", text: data.level < 5 ? "Tres sesiones consecutivas con 90 % o más. Puedes proponer subir un nivel." : "Excelente consistencia en el nivel máximo." };
    }
    const lastTwo = completedTrainingSessions(data).slice(-2).map(function (session) { return session.accuracy; });
    if (lastTwo.length === 2 && lastTwo.every(function (score) { return score < 70; }) && data.level > 1) {
      return { type: "down", text: "Dos sesiones consecutivas por debajo del 70 %. Considera bajar temporalmente un nivel." };
    }
    return { type: "hold", text: "La dificultad se mantiene según tu rendimiento real. Completa más sesiones para recibir una recomendación." };
  }

  function levelLabel(level) {
    return LEVEL_NAMES[level - 1] || LEVEL_NAMES[0];
  }

  function levelDetails(level) {
    return LEVEL_DETAILS[level - 1] || LEVEL_DETAILS[0];
  }

  function dayNumber(data, date) {
    const start = new Date(data.startedAt + "T12:00:00");
    const target = new Date(date + "T12:00:00");
    const days = Math.floor((target.getTime() - start.getTime()) / 86400000) + 1;
    return Math.max(1, Math.min(90, days));
  }

  function dayDate(data, day) {
    const date = new Date(data.startedAt + "T12:00:00");
    date.setDate(date.getDate() + day - 1);
    return FocoStorage.localDate(date);
  }

  function setLevel(data, level) {
    if (!Number.isInteger(level) || level < 1 || level > 5) throw new Error("El nivel debe estar entre 1 y 5.");
    data.level = level;
  }

  window.FocoProgression = {
    LEVEL_NAMES, LEVEL_DETAILS, completedTrainingSessions, recommend, levelLabel, levelDetails, dayNumber, dayDate, setLevel
  };
}());

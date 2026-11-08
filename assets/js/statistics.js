(function () {
  "use strict";

  function trainingSessions(data, type) {
    return data.sessions.filter(function (s) { return s.completed && (!type || s.type === type); });
  }

  function average(values) {
    const valid = values.filter(Number.isFinite);
    return valid.length ? valid.reduce(function (sum, n) { return sum + n; }, 0) / valid.length : null;
  }

  function daySessions(data, date) {
    return trainingSessions(data).filter(function (s) { return s.programDate === date; });
  }

  function dayStatus(data, date) {
    const sessions = daySessions(data, date);
    const memory = sessions.some(function (s) { return s.type === "memory"; });
    const math = sessions.some(function (s) { return s.type === "arithmetic"; });
    return { memory, math, complete: memory && math, sessions };
  }

  function streak(data) {
    const dates = new Set(trainingSessions(data).map(function (s) { return s.completedAt.slice(0, 10); }));
    let date = new Date();
    if (!dates.has(FocoStorage.localDate(date))) date.setDate(date.getDate() - 1);
    let count = 0;
    while (dates.has(FocoStorage.localDate(date))) {
      count += 1;
      date.setDate(date.getDate() - 1);
    }
    return count;
  }

  function totalMinutes(data) {
    return trainingSessions(data).reduce(function (sum, s) { return sum + (Number(s.elapsedSeconds) || 0); }, 0) / 60;
  }

  function averageAccuracy(data, type) {
    return average(trainingSessions(data, type).map(function (s) { return s.accuracy; }));
  }

  function memoryBest(data) {
    const values = trainingSessions(data, "memory").map(function (s) { return s.bestRecall || 0; });
    return values.length ? Math.max.apply(null, values) : 0;
  }

  function dailySeries(data, field, type, limit) {
    const sessions = trainingSessions(data, type);
    const byDate = {};
    sessions.forEach(function (s) {
      const date = s.completedAt.slice(0, 10);
      if (!byDate[date]) byDate[date] = [];
      if (Number.isFinite(s[field])) byDate[date].push(s[field]);
    });
    return Object.keys(byDate).sort().slice(-(limit || 14)).map(function (date) {
      return { date, value: average(byDate[date]) };
    });
  }

  function weeklyComparison(data, type) {
    const sessions = trainingSessions(data, type);
    const today = new Date();
    const currentStart = new Date(today);
    currentStart.setDate(today.getDate() - 6);
    const previousStart = new Date(today);
    previousStart.setDate(today.getDate() - 13);
    const current = [];
    const previous = [];
    sessions.forEach(function (session) {
      const date = new Date(session.completedAt.slice(0, 10) + "T12:00:00");
      if (date >= currentStart) current.push(session.accuracy);
      else if (date >= previousStart) previous.push(session.accuracy);
    });
    return { current: average(current), previous: average(previous), change: average(current) === null || average(previous) === null ? null : average(current) - average(previous) };
  }

  window.FocoStatistics = { trainingSessions, average, daySessions, dayStatus, streak, totalMinutes, averageAccuracy, memoryBest, dailySeries, weeklyComparison };
}());

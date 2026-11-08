(function () {
  "use strict";

  const SESSION_LENGTH = 20 * 60;
  const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];
  let data;
  let page = "dashboard";
  let selectedDay = 1;
  let calendarMonth = 0;
  let toastTimer;
  let tickTimer;
  let revealTimer;
  let lastReport = null;
  let chosenMethod = "mixed";
  let methodLesson = false;
  let methodUnderstood = false;
  let currentExerciseIndex = 0;

  const $ = function (selector, root) { return (root || document).querySelector(selector); };
  const app = function () { return $("#app"); };

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function save() {
    FocoStorage.save(data);
  }

  function toast(message) {
    const node = $("#toast");
    node.textContent = message;
    node.classList.add("visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { node.classList.remove("visible"); }, 3000);
  }

  function notifyError(error) {
    console.error(error);
    toast(error && error.message ? error.message : "Ocurrió un error inesperado.");
  }

  function today() {
    return FocoStorage.localDate();
  }

  function dateLabel(date, options) {
    return new Date(date + "T12:00:00").toLocaleDateString("es-ES", options || { day: "numeric", month: "short", year: "numeric" });
  }

  function setPage(next) {
    page = next;
    document.querySelectorAll("[data-nav]").forEach(function (item) {
      item.classList.toggle("active", item.dataset.nav === page);
    });
    const titles = { dashboard: "Resumen", train: "Entrenar", calendar: "Calendario", stats: "Estadísticas", settings: "Ajustes" };
    $("#page-title").textContent = titles[page] || "Resumen";
    $("#sidebar").classList.remove("open");
    render();
  }

  function applyTheme() {
    document.body.classList.toggle("light-theme", data.prefs.theme === "light");
  }

  function currentDay() {
    return FocoProgression.dayNumber(data, today());
  }

  function sessionsForProgramDay(day) {
    return data.sessions.filter(function (session) { return session.programDay === day; });
  }

  function createMemoryTask(level, index) {
    const task = FocoMemory.create(level, index);
    const exposureFactors = { slower: 1.4, standard: 1, faster: 0.75 };
    task.showMs = Math.round(task.showMs * (exposureFactors[data.prefs.exposure] || 1));
    return task;
  }

  function dayCompletionCount() {
    let count = 0;
    for (let day = 1; day <= 90; day += 1) {
      if (FocoStatistics.dayStatus(data, FocoProgression.dayDate(data, day)).complete) count += 1;
    }
    return count;
  }

  function weekActivity() {
    const dates = new Set(FocoStatistics.trainingSessions(data).map(function (session) { return session.completedAt.slice(0, 10); }));
    const days = [];
    for (let ago = 6; ago >= 0; ago -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - ago);
      days.push({ date: FocoStorage.localDate(date), label: date.toLocaleDateString("es-ES", { weekday: "narrow" }).toUpperCase(), done: dates.has(FocoStorage.localDate(date)), today: ago === 0 });
    }
    return days;
  }

  function ring(percent) {
    const p = Math.max(0, Math.min(100, percent));
    const circumference = 326.7;
    return '<div class="ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="track" cx="60" cy="60" r="52"></circle><circle class="progress" cx="60" cy="60" r="52" stroke-dasharray="' + circumference + '" stroke-dashoffset="' + (circumference * (1 - p / 100)) + '"></circle></svg><div class="ring-label"><b>' + p + '%</b><small>del programa</small></div></div>';
  }

  function lineChart(series, label) {
    const width = 620, height = 150, padX = 12, padY = 14;
    const values = series.map(function (item) { return item.value; }).filter(Number.isFinite);
    if (!values.length) return '<div class="empty-state">Completa algunas sesiones para ver tu evolución.</div>';
    const minValue = Math.min(0, Math.min.apply(null, values));
    const maxValue = Math.max(100, Math.max.apply(null, values));
    const span = maxValue - minValue || 1;
    const points = series.map(function (item, index) {
      const x = padX + (series.length === 1 ? 0 : index * (width - padX * 2) / (series.length - 1));
      const y = height - padY - ((item.value - minValue) / span) * (height - padY * 2);
      return { x, y, item };
    }).filter(function (point) { return Number.isFinite(point.item.value); });
    if (!points.length) return '<div class="empty-state">No hay suficientes datos para mostrar.</div>';
    const path = points.map(function (point, index) { return (index ? "L" : "M") + point.x.toFixed(1) + " " + point.y.toFixed(1); }).join(" ");
    const area = path + " L" + points[points.length - 1].x + " " + (height - padY) + " L" + points[0].x + " " + (height - padY) + " Z";
    const dots = points.map(function (point) { return '<circle class="chart-dot" cx="' + point.x + '" cy="' + point.y + '" r="3.5"><title>' + esc(point.item.date) + ': ' + Math.round(point.item.value) + '%</title></circle>'; }).join("");
    const labels = [points[0], points[Math.floor((points.length - 1) / 2)], points[points.length - 1]].filter(function (point, index, list) { return list.indexOf(point) === index; }).map(function (point) {
      return '<text class="chart-label" x="' + point.x + '" y="146" text-anchor="middle">' + esc(point.item.date.slice(5)) + '</text>';
    }).join("");
    return '<div class="chart-wrap" role="img" aria-label="' + esc(label) + '"><svg viewBox="0 0 ' + width + ' ' + height + '" preserveAspectRatio="none"><defs><linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".2"></stop><stop offset="1" stop-color="var(--accent)" stop-opacity="0"></stop></linearGradient></defs><line class="chart-gridline" x1="0" y1="25" x2="' + width + '" y2="25"></line><line class="chart-gridline" x1="0" y1="75" x2="' + width + '" y2="75"></line><line class="chart-gridline" x1="0" y1="125" x2="' + width + '" y2="125"></line><path class="chart-area" d="' + area + '"></path><path class="chart-line" d="' + path + '"></path>' + dots + labels + '</svg></div>';
  }

  function renderDashboard() {
    const completedDays = dayCompletionCount();
    const total = FocoStatistics.trainingSessions(data);
    const memorySessions = FocoStatistics.trainingSessions(data, "memory");
    const averageMath = FocoStatistics.averageAccuracy(data, "arithmetic");
    const bestAccuracy = total.length ? Math.max.apply(null, total.map(function (session) { return session.accuracy || 0; })) : null;
    const minutes = Math.round(FocoStatistics.totalMinutes(data));
    const percent = Math.round(completedDays / 90 * 100);
    const recommendation = FocoProgression.recommend(data);
    const week = weekActivity();
    const avgLabel = averageMath === null ? "—" : Math.round(averageMath) + "%";
    return '<div class="page-heading"><div><div class="eyebrow">TU ESPACIO DE ENTRENAMIENTO</div><div class="welcome-line"><h1>Un poco mejor, cada día.</h1><span class="program-pill"><span>●</span> PROGRAMA DE 90 DÍAS</span></div><p>Entrena a tu ritmo. Tu progreso no se pierde si descansas.</p></div></div>' +
      '<div class="dashboard-grid metric-grid">' +
      metric("Días completados", completedDays + '<small class="muted"> / 90</small>', "▦", "Doble sesión de memoria y cálculo") +
      metric("Racha actual", FocoStatistics.streak(data) + '<small class="muted"> días</small>', "↗", "Según días con entrenamiento") +
      metric("Tiempo entrenado", minutes < 60 ? minutes + " min" : Math.floor(minutes / 60) + " h " + (minutes % 60) + " min", "◷", "Tiempo de sesiones completadas") +
      metric("Precisión en cálculo", avgLabel, "⌁", "Promedio de sesiones completadas") +
      metric("Mejor precisión", bestAccuracy === null ? "—" : Math.round(bestAccuracy) + "%", "↗", "Mejor marca entre sesiones") +
      metric("Mejor recuerdo", FocoStatistics.memoryBest(data) || "—", "◉", "Máximo de elementos recordados") + '</div>' +
      '<div class="dashboard-grid dashboard-main-grid">' +
      '<section class="panel progress-panel"><div class="panel-heading"><h2>Tu programa</h2><span class="muted">Día ' + currentDay() + ' de 90</span></div><div class="progress-visual">' + ring(percent) + '<div class="progress-copy"><strong>Construye el hábito, no la prisa.</strong><p>' + completedDays + ' de los 90 días tienen memoria y cálculo completados. Puedes recuperar cualquier día anterior desde el calendario.</p><div class="progress-bar"><span style="width:' + percent + '%"></span></div><p class="small" style="margin:9px 0 0">' + percent + '% del plan completado</p></div></div></section>' +
      '<section class="panel streak-panel"><div class="panel-heading"><h2>Esta semana</h2><span class="muted">Actividad</span></div><div class="streak-number">' + FocoStatistics.streak(data) + ' <span>↗</span></div><p>días de racha actual</p><div class="week-dots">' + week.map(function (day) { return '<div class="week-day ' + (day.done ? "done " : "") + (day.today ? "today" : "") + '"><i>' + (day.done ? "✓" : "·") + '</i><span>' + esc(day.label) + '</span></div>'; }).join("") + '</div></section></div>' +
      '<div class="dashboard-grid quick-grid section-spacer">' +
      quickCard("memory", "◉", "Entrena memoria", "Secuencias, palabras y memoria de trabajo.", "Memoria — 20 min", "memory") +
      quickCard("math", "＋", "Entrena cálculo", "Cuatro operaciones y estrategias mentales.", "Cálculo — 20 min", "arithmetic") +
      quickCard("full", "↗", "Entrenamiento completo", "Memoria y después cálculo. 40 minutos.", "Comenzar 40 min", "full") + '</div>' +
      '<div class="dashboard-grid lower-grid section-spacer"><section class="panel chart-panel"><div class="panel-heading"><div><h2>Precisión reciente</h2><span class="muted">Cálculo mental · por sesión</span></div><button class="button ghost small-button" data-nav="stats">Ver estadísticas</button></div>' + lineChart(FocoStatistics.dailySeries(data, "accuracy", "arithmetic", 10), "Precisión de cálculo reciente") + '</section>' +
      '<section class="panel level-panel"><div class="panel-heading"><h2>Nivel actual</h2><span class="tag">NIVEL ' + data.level + '</span></div><div class="level-head"><div><div class="level-name">' + esc(FocoProgression.levelLabel(data.level)) + '</div><div class="muted small">' + esc(FocoProgression.levelDetails(data.level)) + '</div></div><div class="level-number">' + data.level + '</div></div><ul class="level-list"><li>La dificultad se adapta a tus resultados.</li><li>El nivel puede cambiarse manualmente.</li></ul><div class="feedback neutral">' + esc(recommendation.text) + '</div></section></div>';
  }

  function metric(label, value, icon, foot) {
    return '<section class="panel metric-card"><div class="metric-top">' + esc(label) + '<span class="metric-icon">' + icon + '</span></div><div class="metric-value">' + value + '</div><div class="metric-foot">' + esc(foot) + '</div></section>';
  }

  function quickCard(style, icon, title, description, button, type) {
    return '<section class="panel quick-card"><span class="quick-icon ' + style + '">' + icon + '</span><h3>' + esc(title) + '</h3><p>' + esc(description) + '</p><button class="button ' + (style === "full" ? "primary" : "") + '" data-start="' + type + '">' + esc(button) + '</button></section>';
  }

  function renderTrain() {
    if (data.activeSession) return renderActiveSession();
    const methods = FocoArithmetic.METHODS;
    const selected = methods.find(function (item) { return item.id === chosenMethod; }) || methods[methods.length - 1];
    if (methodLesson) return renderMethodLesson(selected);
    let report = "";
    if (lastReport) {
      report = '<section class="panel section-spacer"><div class="panel-heading"><div><div class="eyebrow">SESIÓN COMPLETADA</div><h2>' + esc(lastReport.title) + '</h2></div><span class="tag">' + esc(lastReport.duration) + '</span></div><div class="report-grid">' +
        reportStat(lastReport.accuracy + "%", "Precisión") + reportStat(lastReport.exercises + "", "Ejercicios completados") + reportStat(lastReport.recall + "", "Mejor recuerdo") + '</div></section>';
    }
    return '<div class="page-heading"><div><div class="eyebrow">ENTRENAMIENTO DIARIO · NIVEL ' + data.level + '</div><h1>Elige tu entrenamiento.</h1><p>Los temporizadores son independientes. Pausa o abandona cuando lo necesites.</p></div></div>' + report +
      '<div class="session-chooser">' +
      '<button class="panel session-choice" data-start="memory"><span class="quick-icon memory">◉</span><div><h3>Memoria</h3><p>Cuatro ejercicios adaptativos de memoria numérica, verbal y de trabajo.</p></div><span class="tag">20 MIN</span></button>' +
      '<button class="panel session-choice" data-start="arithmetic"><span class="quick-icon math">＋</span><div><h3>Cálculo mental</h3><p>Practica operaciones y aplica métodos de cálculo mental.</p></div><span class="tag">20 MIN</span></button>' +
      '<button class="panel session-choice" data-start="full"><span class="quick-icon full">↗</span><div><h3>Entrenamiento completo</h3><p>Primero memoria y después cálculo, con un temporizador para cada bloque.</p></div><span class="tag">40 MIN</span></button></div>' +
      '<section class="panel section-spacer"><div class="panel-heading"><div><h2>Practica un método</h2><span class="muted">Explora el ejemplo y luego resuelve ejercicios guiados.</span></div></div>' +
      '<div class="method-list">' + methods.map(function (method) {
        return '<button class="panel method-card ' + (chosenMethod === method.id ? "selected" : "") + '" data-method="' + method.id + '"><h3>' + esc(method.name) + '</h3><p>' + esc(method.description) + '</p></button>';
      }).join("") + '</div><div class="method-steps"><b>Ejemplo · ' + esc(selected.name) + '</b><span>' + esc(selected.example) + '</span></div>' +
      '<div class="heading-actions"><button class="button primary" data-action="open-method-lesson">Leer explicación y prepararme →</button></div></section>' +
      '<section class="panel section-spacer"><div class="panel-heading"><div><h2>Desafío de 20 operaciones</h2><span class="muted">Resuelve, distrae tu atención y recupera las operaciones con sus resultados en orden.</span></div><span class="tag">' + (data.level >= 3 ? "DESBLOQUEADO" : "DESDE NIVEL 3") + '</span></div><p class="muted small">El desafío evalúa cálculo, recuerdo de operaciones, recuerdo de resultados, asociaciones y orden por separado. Los resultados no se revelan durante la resolución.</p><button class="button primary" data-start="challenge" ' + (data.level < 3 ? "disabled" : "") + '>Comenzar desafío · 20 min</button></section>';
  }

  function renderMethodLesson(method) {
    const lesson = method.lesson || [];
    const worked = method.worked || [method.example];
    return '<div class="page-heading"><div><div class="eyebrow">PREPARACIÓN · ANTES DE LA PRÁCTICA</div><h1>' + esc(method.name) + '</h1><p>Lee la explicación y el ejemplo. La prueba empieza solo cuando confirmes que estás listo.</p></div></div>' +
      '<section class="panel method-lesson"><div class="lesson-section"><span class="lesson-step">01</span><div><h2>¿En qué consiste?</h2><ol class="lesson-list">' + lesson.map(function (step) { return '<li>' + esc(step) + '</li>'; }).join("") + '</ol></div></div>' +
      '<div class="lesson-section"><span class="lesson-step">02</span><div><h2>Ejemplo resuelto</h2><p class="muted">' + esc(method.example) + '</p><div class="method-steps">' + worked.map(function (step) { return '<span>' + esc(step) + '</span>'; }).join("") + '</div></div></div>' +
      '<div class="lesson-confirm"><label><input id="method-understood" type="checkbox" ' + (methodUnderstood ? "checked" : "") + '> He leído la explicación y entiendo cómo aplicar este método.</label><div class="heading-actions"><button class="button" data-action="close-method-lesson">Volver a métodos</button><button class="button primary" data-action="start-method" ' + (methodUnderstood ? "" : "disabled") + '>Iniciar prueba · 20 min</button></div></div></section>';
  }

  function reportStat(value, label) {
    return '<div class="report-stat"><b>' + esc(value) + '</b><span>' + esc(label) + '</span></div>';
  }

  function startSession(type, options) {
    const opts = options || {};
    if (data.activeSession) {
      toast("Ya hay un entrenamiento en curso.");
      return;
    }
    if (FocoProgression.dayDate(data, selectedDay) > today()) {
      toast("Ese día del programa todavía no ha comenzado. Selecciona hoy o un día anterior.");
      return;
    }
    const session = {
      id: "s-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7),
      type: type === "full" ? "memory" : (type === "challenge" || type === "method" ? "arithmetic" : type),
      full: type === "full" || !!opts.full,
      activity: type === "challenge" ? "challenge" : type === "method" ? "method" : "regular",
      method: type === "method" ? chosenMethod : "mixed",
      level: data.level,
      programDay: selectedDay,
      programDate: FocoProgression.dayDate(data, selectedDay),
      startedAt: new Date().toISOString(),
      elapsedSeconds: 0,
      remainingSeconds: SESSION_LENGTH,
      lastTick: Date.now(),
      paused: false,
      exerciseIndex: 0,
      exerciseResults: [],
      completedExercises: 0,
      task: null,
      challenge: type === "challenge" ? FocoArithmetic.createChallenge(data.level) : null
    };
    if (session.type === "memory") session.task = createMemoryTask(data.level, 0);
    if (session.type === "arithmetic" && !session.challenge) session.task = FocoArithmetic.createProblem(data.level, session.method);
    if (session.task) session.task.startedAt = Date.now();
    data.prefs.selectedDay = selectedDay;
    data.activeSession = session;
    page = "train";
    lastReport = null;
    save();
    beginTicker();
    render();
  }

  function beginTicker() {
    window.clearInterval(tickTimer);
    tickTimer = window.setInterval(tick, 1000);
  }

  function tick() {
    const session = data.activeSession;
    if (!session || session.paused) return;
    const now = Date.now();
    const delta = Math.max(0, Math.floor((now - session.lastTick) / 1000));
    if (!delta) return;
    session.lastTick += delta * 1000;
    session.remainingSeconds = Math.max(0, session.remainingSeconds - delta);
    session.elapsedSeconds = SESSION_LENGTH - session.remainingSeconds;
    save();
    const timer = $("#session-timer");
    if (timer) timer.textContent = formatTime(session.remainingSeconds);
    if (session.remainingSeconds <= 0) completeSession();
  }

  function formatTime(seconds) {
    return String(Math.floor(seconds / 60)).padStart(2, "0") + ":" + String(seconds % 60).padStart(2, "0");
  }

  function setSessionPaused(paused) {
    const session = data.activeSession;
    if (!session) return;
    if (!paused && session.remainingSeconds <= 0) return completeSession();
    session.paused = paused;
    session.lastTick = Date.now();
    save();
    render();
  }

  function averageScore(session) {
    const scores = session.exerciseResults.map(function (result) { return result.accuracy; }).filter(Number.isFinite);
    return scores.length ? Math.round(scores.reduce(function (a, b) { return a + b; }, 0) / scores.length) : 0;
  }

  function averageResponse(session) {
    const times = session.exerciseResults.map(function (result) { return result.responseSeconds; }).filter(Number.isFinite);
    return times.length ? Math.round(times.reduce(function (sum, seconds) { return sum + seconds; }, 0) / times.length * 10) / 10 : null;
  }

  function completeSession() {
    const session = data.activeSession;
    if (!session) return;
    session.elapsedSeconds = SESSION_LENGTH;
    const saved = {
      id: session.id,
      type: session.type,
      completed: true,
      full: session.full,
      activity: session.activity,
      method: session.method,
      level: session.level,
      programDay: session.programDay,
      programDate: session.programDate,
      startedAt: session.startedAt,
      completedAt: new Date().toISOString(),
      elapsedSeconds: session.elapsedSeconds,
      accuracy: averageScore(session),
      averageResponseSeconds: averageResponse(session),
      exercisesCompleted: session.completedExercises,
      exerciseResults: session.exerciseResults,
      bestRecall: session.bestRecall || 0,
      challengeReport: session.challengeReport || null
    };
    data.sessions.push(saved);
    data.activeSession = null;
    updateRecords();
    save();
    window.clearInterval(tickTimer);
    window.clearTimeout(revealTimer);
    lastReport = { title: session.type === "memory" ? "Entrenamiento de memoria" : session.challengeReport ? "Desafío y cálculo mental" : "Entrenamiento de cálculo", duration: "20:00", accuracy: saved.accuracy, exercises: saved.exercisesCompleted, recall: saved.bestRecall || "—" };
    if (session.full && session.type === "memory") {
      toast("Memoria completada. Comienza el bloque de cálculo.");
      startSession("arithmetic", { full: true });
      return;
    }
    render();
    toast("Sesión de 20 minutos completada. ¡Buen trabajo!");
  }

  function updateRecords() {
    const completed = FocoStatistics.trainingSessions(data);
    const accuracies = completed.map(function (session) { return session.accuracy; }).filter(Number.isFinite);
    data.records.bestAccuracy = accuracies.length ? Math.max.apply(null, accuracies) : null;
    data.records.bestMemory = FocoStatistics.memoryBest(data);
    const dates = Array.from(new Set(completed.map(function (session) { return session.completedAt.slice(0, 10); }))).sort();
    let current = 0;
    let best = 0;
    let previous = null;
    dates.forEach(function (date) {
      const currentDate = new Date(date + "T12:00:00");
      current = previous && currentDate.getTime() - previous.getTime() === 86400000 ? current + 1 : 1;
      best = Math.max(best, current);
      previous = currentDate;
    });
    data.records.bestStreak = best;
  }

  function deleteDayProgress() {
    if (data.activeSession && data.activeSession.programDay === selectedDay) {
      toast("Abandona primero la sesión activa de este día.");
      return;
    }
    const sessions = sessionsForProgramDay(selectedDay);
    if (!sessions.length) {
      toast("Este día no tiene progreso guardado.");
      return;
    }
    if (!window.confirm("¿Eliminar todo el progreso del día " + selectedDay + "? Se borrarán " + sessions.length + " registro(s), incluidos los ejercicios de sesiones interrumpidas. Esta acción no se puede deshacer.")) return;
    data.sessions = data.sessions.filter(function (session) { return session.programDay !== selectedDay; });
    updateRecords();
    save();
    render();
    toast("Se eliminó el progreso del día " + selectedDay + ".");
  }

  function abandonSession() {
    const session = data.activeSession;
    if (!session) return;
    if (!window.confirm("¿Abandonar esta sesión? Los ejercicios terminados se guardarán, pero no contará como sesión completada.")) return;
    window.clearInterval(tickTimer);
    window.clearTimeout(revealTimer);
    session.elapsedSeconds = SESSION_LENGTH - session.remainingSeconds;
    data.sessions.push({
      id: session.id, type: session.type, completed: false, full: session.full,
      activity: session.activity, method: session.method, level: session.level,
      programDay: session.programDay, programDate: session.programDate,
      startedAt: session.startedAt, completedAt: new Date().toISOString(),
      elapsedSeconds: session.elapsedSeconds, accuracy: averageScore(session),
      averageResponseSeconds: averageResponse(session),
      exercisesCompleted: session.completedExercises, exerciseResults: session.exerciseResults,
      bestRecall: session.bestRecall || 0, challengeReport: session.challengeReport || null
    });
    data.activeSession = null;
    save();
    render();
    toast("Progreso de los ejercicios terminados guardado.");
  }

  function addExerciseResult(session, accuracy, extra) {
    session.exerciseResults.push(Object.assign({ accuracy }, extra || {}));
    session.completedExercises += 1;
  }

  function nextMemoryTask(session) {
    session.exerciseIndex += 1;
    session.task = createMemoryTask(session.level, session.exerciseIndex);
    save();
    render();
  }

  function evaluateMemory(form) {
    const session = data.activeSession;
    const task = session && session.task;
    if (!task || task.done) return;
    const input = form.elements.answer;
    const result = FocoMemory.evaluate(task, input.value);
    result.responseSeconds = Math.max(0, Math.round((Date.now() - (task.recallStartedAt || Date.now())) / 100) / 10);
    task.done = true;
    task.result = result;
    session.bestRecall = Math.max(session.bestRecall || 0, result.recalled);
    addExerciseResult(session, result.accuracy, { type: task.type, recalled: result.recalled, total: result.total, responseSeconds: result.responseSeconds });
    save();
    render();
  }

  function handleMemoryDistractor(form) {
    const session = data.activeSession;
    const task = session && session.task;
    if (!task) return;
    const current = task.distractions[task.distractionIndex];
    if (!FocoMemory.parseDistractionAnswer(form.elements.answer.value, current.answer)) {
      task.distractErrors = (task.distractErrors || 0) + 1;
    }
    task.distractionIndex += 1;
    if (task.distractionIndex >= task.distractions.length) task.phase = "recall";
    save();
    render();
  }

  function evaluateArithmetic(form) {
    const session = data.activeSession;
    const task = session && session.task;
    if (!task || task.done) return;
    const value = Number(form.elements.answer.value.trim());
    const correct = Number.isFinite(value) && value === task.answer;
    task.responseSeconds = Math.max(0, Math.round((Date.now() - (task.startedAt || Date.now())) / 100) / 10);
    task.done = true;
    task.correct = correct;
    addExerciseResult(session, correct ? 100 : 0, { type: "calculation", method: task.method, responseSeconds: task.responseSeconds });
    save();
    render();
  }

  function handleChallengeSubmit(form) {
    const session = data.activeSession;
    const challenge = session && session.challenge;
    if (!challenge) return;
    if (challenge.phase === "solve") {
      const value = Number(form.elements.answer.value.trim());
      challenge.answers[challenge.index] = Number.isFinite(value) ? value : null;
      challenge.index += 1;
      if (challenge.index >= 20) challenge.phase = "distract";
    } else if (challenge.phase === "distract") {
      const current = challenge.distractors[challenge.distractionIndex];
      challenge.distractionIndex += 1;
      if (challenge.distractionIndex >= challenge.distractors.length) {
        challenge.index = 0;
        challenge.phase = "recall";
      }
    } else if (challenge.phase === "recall") {
      challenge.recall[challenge.index] = {
        operation: form.elements.namedItem("operation").value.trim(),
        result: form.elements.namedItem("result").value.trim()
      };
      challenge.index += 1;
      if (challenge.index >= 20) {
        challenge.report = FocoArithmetic.evaluateChallenge(challenge, Math.floor((Date.now() - challenge.startedAt) / 1000));
        challenge.phase = "report";
        session.challengeReport = challenge.report;
        addExerciseResult(session, challenge.report.calculationAccuracy, { type: "challenge" });
      }
    }
    save();
    render();
  }

  function renderActiveSession() {
    const session = data.activeSession;
    if (!session) return "";
    const paused = session.paused;
    const title = session.type === "memory" ? "Entrenamiento de memoria" : session.activity === "challenge" ? "Desafío de 20 operaciones" : "Cálculo mental";
    const subtitle = session.full ? "Bloque " + (session.type === "memory" ? "1 de 2" : "2 de 2") + " · Día " + session.programDay : "Día " + session.programDay + " · Nivel " + session.level;
    const progress = Math.round((SESSION_LENGTH - session.remainingSeconds) / SESSION_LENGTH * 100);
    const top = '<div class="session-top"><div><div class="eyebrow">' + esc(subtitle) + '</div><h1>' + esc(title) + '</h1><div class="session-status"><span class="status-dot ' + (paused ? "paused" : "") + '"></span>' + (paused ? "Sesión pausada" : "Sesión en curso") + '</div></div><div class="timer ' + (paused ? "paused" : "") + '" id="session-timer">' + formatTime(session.remainingSeconds) + '</div></div><div class="session-progress progress-bar"><span style="width:' + progress + '%"></span></div>';
    const controls = '<div class="session-actions"><button class="button danger ghost" data-action="abandon">Abandonar sesión</button><div class="heading-actions"><button class="button" data-action="pause">' + (paused ? "Reanudar" : "Pausar") + '</button></div></div>';
    let content;
    if (paused) content = '<section class="panel exercise-panel"><div class="empty-state"><h2>Entrenamiento en pausa</h2><p>El temporizador está detenido. Reanuda cuando estés listo.</p><button class="button primary" data-action="pause">Reanudar sesión</button></div></section>';
    else if (session.type === "memory") content = renderMemoryExercise(session);
    else if (session.challenge && session.challenge.phase !== "practice") content = renderChallenge(session);
    else content = renderArithmeticExercise(session);
    return '<div class="training-active fade-in">' + top + content + controls + '</div>';
  }

  function renderMemoryExercise(session) {
    const task = session.task;
    if (!task) return '<section class="panel exercise-panel"><div class="empty-state">Preparando ejercicio…</div></section>';
    if (task.phase === "study") {
      if (!task.studyDeadline) task.studyDeadline = Date.now() + task.showMs;
      if (task.studyDeadline <= Date.now()) {
        task.phase = task.type === "interference" ? "distract" : "recall";
        if (task.phase === "recall") task.recallStartedAt = Date.now();
        save();
        return renderMemoryExercise(session);
      }
    }
    let body = '<div class="eyebrow">EJERCICIO ' + (session.completedExercises + 1) + ' · ' + esc(task.title) + '</div><h2>' + esc(task.title) + '</h2><p class="instructions">' + esc(task.instruction) + '</p>';
    if (task.done) {
      const result = task.result;
      body += '<div class="feedback ' + (result.accuracy >= 70 ? "" : "error") + '">' + result.recalled + ' de ' + result.total + ' elementos recordados · ' + result.correctPositions + ' en posición correcta · ' + result.accuracy + '% de precisión. Omisiones: ' + result.omissions + ' · Errores: ' + result.errors + '.<br><span class="small">Secuencia esperada: ' + esc(result.expected.join(task.type === "words" ? " · " : " ")) + '</span></div><div class="session-actions"><span class="muted small">El resultado se guardó en esta sesión.</span><button class="button primary" data-action="next-memory">Siguiente ejercicio →</button></div>';
    } else if (task.type === "interference" && task.phase === "distract") {
      const current = task.distractions[task.distractionIndex];
      body += '<div class="exercise-content"><div class="operation-display">' + current.a + ' + ' + current.b + '</div><p class="muted small">Distracción ' + (task.distractionIndex + 1) + ' de 3</p><form class="exercise-form" data-form="memory-distract"><input name="answer" inputmode="numeric" autocomplete="off" placeholder="Tu respuesta" required aria-label="Resultado de la suma"><button class="button primary">Responder</button></form></div>';
    } else if (task.phase === "study") {
      body += '<div class="exercise-content"><div class="sequence-display ' + (task.type === "words" ? "stimulus-word" : "") + '">' + esc(task.stimulus) + '</div><div class="feedback neutral" id="study-hint">Observa con atención; el estímulo se ocultará automáticamente.</div></div>';
      window.clearTimeout(revealTimer);
      revealTimer = window.setTimeout(function () {
        if (data.activeSession && data.activeSession.task === task && task.phase === "study") {
          task.phase = task.type === "interference" ? "distract" : "recall";
          if (task.phase === "recall") task.recallStartedAt = Date.now();
          save();
          render();
        }
      }, Math.max(0, task.studyDeadline - Date.now()));
    } else if (task.phase === "recall") {
      if (!task.recallStartedAt) task.recallStartedAt = Date.now();
      const placeholder = task.type === "words" ? "Escribe las palabras separadas por coma" : "Separa los números con espacios o comas";
      body += '<div class="exercise-content"><div class="sequence-display sequence-hidden">Estímulo oculto · escribe lo que recuerdes</div><form class="exercise-form" data-form="memory"><input name="answer" autocomplete="off" placeholder="' + placeholder + '" required aria-label="Tu recuerdo"><button class="button primary">Comprobar recuerdo</button></form><div class="form-hint">La información original permanece oculta durante la recuperación.</div></div>';
    }
    return '<section class="panel exercise-panel">' + body + '</section>';
  }

  function renderArithmeticExercise(session) {
    const task = session.task;
    if (!task) return '<section class="panel exercise-panel"><div class="empty-state">Preparando ejercicio…</div></section>';
    const method = FocoArithmetic.METHODS.find(function (item) { return item.id === session.method; });
    let body = '<div class="eyebrow">EJERCICIO ' + (session.completedExercises + 1) + (session.activity === "method" ? " · MÉTODO GUIADO" : " · PRÁCTICA") + '</div><h2>' + (session.activity === "method" ? esc(method ? method.name : "Método") : "Resuelve mentalmente") + '</h2>';
    if (task.done) {
      body += '<div class="operation-display">' + esc(task.text) + '</div><div class="feedback ' + (task.correct ? "" : "error") + '">' + (task.correct ? "Correcto." : "No es correcto.") + ' Resultado: <b>' + task.answer + '</b>.' + (task.method && task.method !== "mixed" ? '<div class="method-steps">' + (task.steps || []).map(function (step) { return '<span>' + esc(step) + '</span>'; }).join("") + '</div>' : "") + '</div><div class="session-actions"><span class="muted small">La respuesta queda registrada en esta sesión.</span><button class="button primary" data-action="next-math">Siguiente operación →</button></div>';
    } else {
      body += '<p class="instructions">' + esc(session.activity === "method" && method ? method.description : "Elige mentalmente una estrategia. El método no se indicará antes de responder.") + '</p><div class="exercise-content"><div class="operation-display">' + esc(task.text) + '</div><form class="exercise-form" data-form="arithmetic"><input name="answer" inputmode="decimal" autocomplete="off" placeholder="Tu resultado" required aria-label="Resultado de la operación"><button class="button primary">Comprobar</button></form><div class="form-hint">No se muestra la solución hasta que envíes tu respuesta.</div></div>';
    }
    return '<section class="panel exercise-panel">' + body + '</section>';
  }

  function renderChallenge(session) {
    const challenge = session.challenge;
    if (challenge.phase === "solve") {
      const problem = challenge.operations[challenge.index];
      return '<section class="panel exercise-panel"><div class="eyebrow">FASE 1 · RESOLUCIÓN</div><div class="challenge-intro"><div><h2>Resuelve y retén</h2><p class="instructions">Resuelve mentalmente. La respuesta correcta no se mostrará hasta terminar el desafío.</p></div><div class="challenge-count">' + (challenge.index + 1) + '<small class="muted"> / 20</small></div></div><div class="operation-display">' + esc(problem.text) + '</div><form class="exercise-form" data-form="challenge"><input name="answer" inputmode="numeric" autocomplete="off" placeholder="Tu resultado" required aria-label="Resultado de la operación"><button class="button primary">Guardar y continuar</button></form></section>';
    }
    if (challenge.phase === "distract") {
      const current = challenge.distractors[challenge.distractionIndex];
      return '<section class="panel exercise-panel"><div class="eyebrow">FASE 2 · INTERFERENCIA</div><h2>Despeja la memoria de trabajo</h2><p class="instructions">Resuelve estas tres sumas antes de recuperar las 20 operaciones. La secuencia original ya está oculta.</p><div class="operation-display">' + esc(current.text) + '</div><p class="muted small">Distracción ' + (challenge.distractionIndex + 1) + ' de 3</p><form class="exercise-form" data-form="challenge"><input name="answer" inputmode="numeric" autocomplete="off" placeholder="Tu respuesta" required aria-label="Resultado de la suma"><button class="button primary">Continuar</button></form></section>';
    }
    if (challenge.phase === "recall") {
      return '<section class="panel exercise-panel"><div class="eyebrow">FASE 3 · RECUPERACIÓN</div><div class="challenge-intro"><div><h2>Recuerda la asociación</h2><p class="instructions">Escribe la operación y el resultado que asocias con esta posición. No se mostrarán las operaciones originales.</p></div><div class="challenge-count">' + (challenge.index + 1) + '<small class="muted"> / 20</small></div></div><div class="challenge-row"><span class="row-index">' + String(challenge.index + 1).padStart(2, "0") + '</span><span class="row-operation">Operación recordada</span><span class="muted small">Resultado</span></div><form class="exercise-form" data-form="challenge-recall"><input name="operation" autocomplete="off" placeholder="Ej. 43 × 11" required aria-label="Operación recordada"><input name="result" inputmode="numeric" autocomplete="off" placeholder="Resultado" required aria-label="Resultado recordado"><button class="button primary">Guardar recuerdo</button></form></section>';
    }
    if (challenge.phase === "report") {
      const report = challenge.report;
      return '<section class="panel exercise-panel"><div class="eyebrow">INFORME DEL DESAFÍO</div><h2>20 operaciones · resultados</h2><p class="instructions">Cada métrica se puntúa de forma independiente. Una asociación solo cuenta cuando coinciden operación, resultado y posición.</p><div class="report-grid">' +
        reportStat(report.calculationsCorrect + "/20", "Cálculos correctos · " + report.calculationAccuracy + "%") +
        reportStat(report.operationsRemembered + "/20", "Operaciones recordadas") +
        reportStat(report.resultsRemembered + "/20", "Resultados recordados") +
        reportStat(report.associationsCorrect + "/20", "Asociaciones correctas") +
        reportStat(report.orderedAssociations + "/20", "Asociaciones en orden") +
        reportStat(formatTime(report.elapsedSeconds), "Tiempo del desafío") + '</div><div class="session-actions"><span class="muted small">La sesión de cálculo continúa hasta completar los 20 minutos.</span><button class="button primary" data-action="next-math">Continuar práctica →</button></div></section>';
    }
    return "";
  }

  function renderCalendar() {
    const startDay = calendarMonth * 30 + 1;
    const endDay = Math.min(startDay + 29, 90);
    const firstDate = FocoProgression.dayDate(data, startDay);
    const firstWeekday = (new Date(firstDate + "T12:00:00").getDay() + 6) % 7;
    const cells = [];
    for (let blank = 0; blank < firstWeekday; blank += 1) cells.push('<div class="calendar-day empty"></div>');
    for (let day = startDay; day <= endDay; day += 1) {
      const date = FocoProgression.dayDate(data, day);
      const status = FocoStatistics.dayStatus(data, date);
      const isFuture = date > today();
      const cls = [status.complete ? "complete" : "", status.memory ? "has-memory" : "", status.math ? "has-math" : "", isFuture ? "future" : "", selectedDay === day ? "selected" : ""].filter(Boolean).join(" ");
      const label = status.complete ? "Completo" : status.memory && status.math ? "Memoria + cálculo" : status.memory ? "Memoria" : status.math ? "Cálculo" : isFuture ? "Pendiente" : "Sin iniciar";
      cells.push('<button class="calendar-day ' + cls + '" data-day="' + day + '" ' + (isFuture ? "disabled" : "") + '><span class="day-num">' + day + '</span><div class="day-status">' + esc(label) + '</div></button>');
    }
    const selectedDate = FocoProgression.dayDate(data, selectedDay);
    const selectedSessions = sessionsForProgramDay(selectedDay);
    const futureDay = selectedDate > today();
    const activeOnSelectedDay = data.activeSession && data.activeSession.programDay === selectedDay;
    return '<div class="page-heading"><div><div class="eyebrow">PROGRAMA PERSONAL</div><h1>Calendario de 90 días</h1><p>Los días no completados permanecen disponibles para recuperar.</p></div></div><div class="calendar-toolbar"><button class="button small-button" data-month="-1" ' + (calendarMonth === 0 ? "disabled" : "") + '>← Anterior</button><b>Mes ' + (calendarMonth + 1) + ' del programa · ' + esc(dateLabel(firstDate, { day: "numeric", month: "short" })) + ' – ' + esc(dateLabel(FocoProgression.dayDate(data, endDay), { day: "numeric", month: "short" })) + '</b><button class="button small-button" data-month="1" ' + (calendarMonth === 2 ? "disabled" : "") + '>Siguiente →</button><span class="muted small">Fecha del programa: ' + esc(dateLabel(selectedDate)) + '</span></div><section class="panel"><div class="calendar-grid">' + WEEKDAYS.map(function (day) { return '<div class="calendar-weekday">' + day + '</div>'; }).join("") + cells.join("") + '</div><div class="calendar-legend small muted section-spacer">● Memoria <span style="color:var(--orange)">●</span> Cálculo <span style="color:var(--accent)">●</span> Día completo</div></section><section class="panel calendar-detail"><div class="panel-heading"><div><h2>Día ' + selectedDay + ' · ' + esc(dateLabel(selectedDate)) + '</h2><span class="muted">Cada sesión se registra por separado, sin reemplazar el historial.</span></div><div class="heading-actions"><button class="button small-button" data-start="memory" ' + (futureDay ? "disabled" : "") + '>Recuperar memoria</button><button class="button small-button" data-start="arithmetic" ' + (futureDay ? "disabled" : "") + '>Recuperar cálculo</button><button class="button danger small-button" data-action="delete-day" ' + (!selectedSessions.length || futureDay || activeOnSelectedDay ? "disabled" : "") + '>Eliminar progreso del día</button></div></div>' +
      (selectedSessions.length ? selectedSessions.map(function (session) {
        return '<div class="calendar-session"><span><b>' + (session.type === "memory" ? "Memoria" : "Cálculo") + '</b> · ' + (session.completed ? "Completada" : "Interrumpida") + ' · ' + dateLabel(session.completedAt.slice(0, 10)) + '</span><span>' + (session.completed ? session.accuracy + "% precisión" : session.exercisesCompleted + " ejercicios guardados") + '</span></div>';
      }).join("") : '<div class="empty-state">Aún no hay sesiones en este día. Elige un bloque para entrenar o recuperar.</div>') + '</section>';
  }

  function renderStats() {
    const memory = FocoStatistics.trainingSessions(data, "memory");
    const math = FocoStatistics.trainingSessions(data, "arithmetic");
    const all = FocoStatistics.trainingSessions(data);
    const recent = all.filter(function (session) { return new Date(session.completedAt).getTime() >= Date.now() - 7 * 86400000; });
    const recentAvg = FocoStatistics.average(recent.map(function (session) { return session.accuracy; }));
    const general = FocoStatistics.average(all.map(function (session) { return session.accuracy; }));
    const weekly = FocoStatistics.weeklyComparison(data, "arithmetic");
    const change = weekly.change === null ? "—" : (weekly.change > 0 ? "+" : "") + Math.round(weekly.change) + " pp";
    const memorySeries = FocoStatistics.dailySeries(data, "bestRecall", "memory", 14);
    const mathSeries = FocoStatistics.dailySeries(data, "accuracy", "arithmetic", 14);
    const avgRecall = memory.length ? Math.round(FocoStatistics.average(memory.map(function (session) { return session.bestRecall || 0; }))) : null;
    const responseTimes = all.map(function (session) { return session.averageResponseSeconds; }).filter(Number.isFinite);
    const speedSeries = all.filter(function (session) { return Number.isFinite(session.averageResponseSeconds); }).slice(-14).map(function (session) {
      return { date: session.completedAt.slice(5, 10), value: session.averageResponseSeconds };
    });
    const levelSeries = all.slice(-14).map(function (session) {
      return { date: session.completedAt.slice(5, 10), value: session.level };
    });
    return '<div class="page-heading"><div><div class="eyebrow">DATOS DE ENTRENAMIENTO</div><h1>Tu evolución.</h1><p>Las métricas se calculan solo con sesiones completadas; las sesiones interrumpidas conservan sus ejercicios, pero no se mezclan en los promedios.</p></div></div><div class="stats-grid">' +
      statCard("Precisión de cálculo", mathSeries, "Por sesión · escala porcentual", "Precisión", 100) +
      statCard("Recuerdo de memoria", memorySeries, "Mejor número de elementos por sesión", "Elementos", null) +
      statCard("Tiempo por respuesta", speedSeries, "Promedio de respuesta · menos segundos es más rápido", "s", null) +
      statCard("Nivel alcanzado", levelSeries, "Nivel registrado al completar cada sesión", "Nivel", 5) +
      '<section class="panel stats-card"><div class="panel-heading"><div><h2>Resumen de rendimiento</h2><span class="muted">Comparación de promedios</span></div></div><div class="stats-kpi-row"><div class="stats-kpi"><b>' + (general === null ? "—" : Math.round(general) + "%") + '</b><span>Promedio general</span></div><div class="stats-kpi"><b>' + (recentAvg === null ? "—" : Math.round(recentAvg) + "%") + '</b><span>Últimos 7 días</span></div></div><div class="stats-kpi-row"><div class="stats-kpi"><b>' + change + '</b><span>Cambio semanal en cálculo</span></div><div class="stats-kpi"><b>' + (avgRecall === null ? "—" : avgRecall) + '</b><span>Recuerdo medio por ejercicio</span></div></div><div class="feedback neutral">La comparación semanal usa los últimos 7 días frente a los 7 días anteriores. Los valores con pocos datos deben interpretarse con cautela.</div></section>' +
      '<section class="panel stats-card"><div class="panel-heading"><div><h2>Nivel y tiempo</h2><span class="muted">Evolución basada en resultados</span></div></div><div class="stats-kpi-row"><div class="stats-kpi"><b>' + data.level + ' / 5</b><span>' + esc(FocoProgression.levelLabel(data.level)) + '</span></div><div class="stats-kpi"><b>' + Math.round(FocoStatistics.totalMinutes(data)) + ' min</b><span>Entrenamiento completado</span></div></div><div class="level-progress-label"><span>Nivel manual/adaptativo actual</span><span>' + data.level + ' de 5</span></div><div class="progress-bar"><span style="width:' + data.level * 20 + '%"></span></div><p class="muted small section-spacer">Tiempo promedio por ejercicio: ' + (responseTimes.length ? (Math.round(FocoStatistics.average(responseTimes) * 10) / 10) + " s en " + responseTimes.length + " sesiones." : "aún no hay mediciones.") + '</p></section>' +
      '<section class="panel stats-card"><div class="panel-heading"><div><h2>Rendimiento semanal</h2><span class="muted">Precisión aritmética promedio</span></div></div>' + weeklyBars(data) + '</section></div>';
  }

  function statCard(title, series, subtitle, unit, max) {
    const values = series.map(function (point) { return point.value; });
    const best = values.length ? Math.max.apply(null, values) : null;
    const average = FocoStatistics.average(values);
    return '<section class="panel stats-card"><div class="panel-heading"><div><h2>' + esc(title) + '</h2><span class="muted">' + esc(subtitle) + '</span></div></div><div class="stats-kpi-row"><div class="stats-kpi"><b>' + (best === null ? "—" : Math.round(best) + (unit === "Precisión" ? "%" : "")) + '</b><span>Mejor resultado</span></div><div class="stats-kpi"><b>' + (average === null ? "—" : Math.round(average) + (unit === "Precisión" ? "%" : "")) + '</b><span>Promedio</span></div></div>' + barChart(series, max) + '</section>';
  }

  function barChart(series, max) {
    if (!series.length) return '<div class="empty-state">Aún no hay sesiones completadas.</div>';
    const largest = max || Math.max.apply(null, series.map(function (point) { return point.value; })) || 1;
    return '<div class="bar-chart" role="img" aria-label="Gráfico de ' + series.length + ' sesiones">' + series.map(function (point) {
      const height = Math.max(2, Math.min(100, point.value / largest * 100));
      return '<div class="bar-column" title="' + esc(point.date) + ': ' + Math.round(point.value) + '"><i style="height:' + height + '%"></i><small>' + esc(point.date.slice(8)) + '</small></div>';
    }).join("") + '</div>';
  }

  function weeklyBars(dataSet) {
    const byDate = {};
    FocoStatistics.trainingSessions(dataSet, "arithmetic").forEach(function (session) {
      const date = session.completedAt.slice(0, 10);
      if (!byDate[date]) byDate[date] = [];
      byDate[date].push(session.accuracy);
    });
    const days = [];
    for (let ago = 6; ago >= 0; ago -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - ago);
      const key = FocoStorage.localDate(date);
      days.push({ date: key, value: FocoStatistics.average(byDate[key] || []) });
    }
    return days.some(function (item) { return item.value !== null; }) ? barChart(days.filter(function (item) { return item.value !== null; }), 100) : '<div class="empty-state">Completa sesiones de cálculo para ver la comparación semanal.</div>';
  }

  function renderSettings() {
    return '<div class="page-heading"><div><div class="eyebrow">PREFERENCIAS Y DATOS</div><h1>Ajustes.</h1><p>Administra el nivel y los datos almacenados en este navegador.</p></div></div><div class="settings-grid">' +
      '<section class="panel settings-section"><div class="panel-heading"><h2>Entrenamiento</h2></div><div class="setting-row"><div><strong>Nivel manual</strong><small>El cambio tiene efecto en los próximos ejercicios.</small></div><select class="select-input" id="level-select" aria-label="Nivel de entrenamiento">' + [1, 2, 3, 4, 5].map(function (level) { return '<option value="' + level + '" ' + (data.level === level ? "selected" : "") + '>Nivel ' + level + ' · ' + esc(FocoProgression.levelLabel(level)) + '</option>'; }).join("") + '</select></div><div class="setting-row"><div><strong>Tiempo de exposición</strong><small>Modifica cuánto se muestra cada estímulo de memoria.</small></div><select class="select-input" id="exposure-select" aria-label="Tiempo de exposición"><option value="slower" ' + (data.prefs.exposure === "slower" ? "selected" : "") + '>Más tiempo</option><option value="standard" ' + (data.prefs.exposure === "standard" ? "selected" : "") + '>Estándar</option><option value="faster" ' + (data.prefs.exposure === "faster" ? "selected" : "") + '>Menos tiempo</option></select></div><div class="feedback neutral">' + esc(FocoProgression.recommend(data).text) + '</div><p class="muted small">Subir: tres sesiones consecutivas con al menos 90 %. Mantener: entre 70 % y 89 %. Dos sesiones seguidas por debajo del 70 % sugieren bajar temporalmente un nivel. La velocidad y el recuerdo máximo también se registran; el nivel nunca cambia automáticamente.</p></section>' +
      '<section class="panel settings-section"><div class="panel-heading"><h2>Aspecto</h2></div><div class="setting-row"><div><strong>Tema</strong><small>El tema oscuro está activado de forma predeterminada.</small></div><button class="button" data-action="theme">' + (data.prefs.theme === "dark" ? "Cambiar a claro" : "Cambiar a oscuro") + '</button></div></section>' +
      '<section class="panel settings-section"><div class="panel-heading"><h2>Exportar e importar</h2></div><p class="muted small">Exporta una copia JSON de sesiones, nivel, preferencias y progreso. Puedes importarla en otro navegador o dispositivo.</p><div class="heading-actions"><button class="button primary" data-action="export">Exportar JSON</button><label class="button" for="import-file">Importar JSON</label><input id="import-file" class="file-input" type="file" accept="application/json,.json"></div></section>' +
      '<section class="panel settings-section"><div class="panel-heading"><h2>Reinicio</h2></div><p class="muted small">El reinicio elimina permanentemente los datos guardados en este navegador. Exporta una copia si deseas conservarlos.</p><button class="button danger" data-action="reset">Reiniciar programa…</button></section></div>';
  }

  function renderError(error) {
    app().innerHTML = '<section class="panel"><div class="eyebrow">NO SE PUDO INICIAR</div><h1>El almacenamiento no está disponible.</h1><p class="muted">' + esc(error.message) + '</p><p class="muted small">Permite LocalStorage en este navegador y vuelve a cargar la página. Tus archivos no se han modificado.</p></section>';
  }

  function render() {
    if (!data) return;
    applyTheme();
    const routes = {
      dashboard: renderDashboard,
      train: renderTrain,
      calendar: renderCalendar,
      stats: renderStats,
      settings: renderSettings
    };
    app().innerHTML = (routes[page] || renderDashboard)();
    document.querySelectorAll("[data-nav]").forEach(function (item) { item.classList.toggle("active", item.dataset.nav === page); });
  }

  function startRequested(type) {
    if (type === "memory" || type === "arithmetic" || type === "full" || type === "challenge" || type === "method") {
      if (type === "challenge" && data.level < 3) {
        toast("El desafío se desbloquea al alcanzar el nivel 3.");
        return;
      }
      startSession(type);
    }
  }

  function exportFile() {
    const blob = new Blob([FocoStorage.exportData(data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "foco-entrenamiento-" + today() + ".json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast("Archivo JSON exportado.");
  }

  function importFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onerror = function () { toast("No se pudo leer el archivo seleccionado."); };
    reader.onload = function () {
      try {
        const imported = FocoStorage.importData(String(reader.result));
        if (!window.confirm("La importación reemplazará los datos actuales guardados en este navegador. ¿Continuar?")) return;
        data = imported;
        selectedDay = Math.max(1, Math.min(90, Number(data.prefs.selectedDay) || currentDay()));
        save();
        applyTheme();
        page = "dashboard";
        render();
        toast("Datos importados correctamente.");
        if (data.activeSession && !data.activeSession.paused) beginTicker();
      } catch (error) {
        notifyError(error);
      }
    };
    reader.readAsText(file);
  }

  function handleClick(event) {
    const nav = event.target.closest("[data-nav]");
    if (nav) {
      setPage(nav.dataset.nav);
      return;
    }
    const start = event.target.closest("[data-start]");
    if (start) {
      startRequested(start.dataset.start);
      return;
    }
    const method = event.target.closest("[data-method]");
    if (method) {
      chosenMethod = method.dataset.method;
      data.prefs.method = chosenMethod;
      methodLesson = false;
      methodUnderstood = false;
      save();
      render();
      return;
    }
    const day = event.target.closest("[data-day]");
    if (day && !day.disabled) {
      selectedDay = Number(day.dataset.day);
      data.prefs.selectedDay = selectedDay;
      save();
      render();
      return;
    }
    const month = event.target.closest("[data-month]");
    if (month && !month.disabled) {
      calendarMonth = Math.max(0, Math.min(2, calendarMonth + Number(month.dataset.month)));
      const minDay = calendarMonth * 30 + 1;
      const maxDay = minDay + 29;
      if (selectedDay < minDay || selectedDay > maxDay) selectedDay = minDay;
      render();
      return;
    }
    const action = event.target.closest("[data-action]");
    if (!action) return;
    try {
      switch (action.dataset.action) {
        case "pause": setSessionPaused(!data.activeSession.paused); break;
        case "abandon": abandonSession(); break;
        case "next-memory": nextMemoryTask(data.activeSession); break;
        case "open-method-lesson":
          methodLesson = true;
          methodUnderstood = false;
          render();
          break;
        case "close-method-lesson":
          methodLesson = false;
          methodUnderstood = false;
          render();
          break;
        case "start-method":
          if (!methodUnderstood) {
            toast("Lee la explicación y confirma que entiendes el método antes de iniciar.");
            break;
          }
          methodLesson = false;
          startSession("method");
          break;
        case "delete-day": deleteDayProgress(); break;
        case "next-math":
          if (data.activeSession.challenge && data.activeSession.challenge.phase === "report") {
            data.activeSession.challenge.phase = "practice";
          }
          data.activeSession.task = FocoArithmetic.createProblem(data.activeSession.level, data.activeSession.method);
          data.activeSession.task.startedAt = Date.now();
          data.activeSession.activity = data.activeSession.activity === "challenge" ? "regular" : data.activeSession.activity;
          save(); render(); break;
        case "mixed": chosenMethod = "mixed"; startSession("arithmetic"); break;
        case "theme":
          data.prefs.theme = data.prefs.theme === "dark" ? "light" : "dark";
          save(); render(); break;
        case "export": exportFile(); break;
        case "reset":
          if (window.confirm("¿Reiniciar el programa? Se eliminarán permanentemente el progreso, el historial y las preferencias guardadas.")) {
            window.clearInterval(tickTimer);
            window.clearTimeout(revealTimer);
            data = FocoStorage.freshData();
            selectedDay = 1;
            lastReport = null;
            save();
            setPage("dashboard");
            toast("Programa reiniciado.");
          }
          break;
        default: break;
      }
    } catch (error) {
      notifyError(error);
    }
  }

  function handleSubmit(event) {
    const form = event.target.closest("[data-form]");
    if (!form) return;
    event.preventDefault();
    try {
      switch (form.dataset.form) {
        case "memory": evaluateMemory(form); break;
        case "memory-distract": handleMemoryDistractor(form); break;
        case "arithmetic": evaluateArithmetic(form); break;
        case "challenge": handleChallengeSubmit(form); break;
        case "challenge-recall": handleChallengeSubmit(form); break;
        default: break;
      }
    } catch (error) {
      notifyError(error);
    }
  }

  function handleChange(event) {
    if (event.target.id === "level-select") {
      try {
        FocoProgression.setLevel(data, Number(event.target.value));
        save();
        render();
        toast("Nivel actualizado. Los resultados históricos no cambian.");
      } catch (error) {
        notifyError(error);
      }
    }
    if (event.target.id === "import-file") {
      importFile(event.target.files && event.target.files[0]);
      event.target.value = "";
    }
    if (event.target.id === "exposure-select") {
      if (!["slower", "standard", "faster"].includes(event.target.value)) {
        toast("Selecciona un tiempo de exposición válido.");
        render();
        return;
      }
      data.prefs.exposure = event.target.value;
      save();
      toast("Tiempo de exposición actualizado.");
    }
    if (event.target.id === "method-understood") {
      methodUnderstood = event.target.checked;
      const startButton = $('[data-action="start-method"]');
      if (startButton) startButton.disabled = !methodUnderstood;
    }
  }

  function init() {
    $("#today-label").textContent = new Date().toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
    document.addEventListener("click", handleClick);
    document.addEventListener("submit", handleSubmit);
    document.addEventListener("change", handleChange);
    $("#mobile-menu").addEventListener("click", function () { $("#sidebar").classList.toggle("open"); });
    $("#theme-toggle").addEventListener("click", function () {
      if (!data) return;
      data.prefs.theme = data.prefs.theme === "dark" ? "light" : "dark";
      save();
      render();
    });
    try {
      data = FocoStorage.load();
      selectedDay = Math.max(1, Math.min(90, Number(data.prefs.selectedDay) || currentDay()));
      chosenMethod = data.prefs.method || "mixed";
      if (data.activeSession) {
        page = "train";
        if (data.activeSession.type === "memory" && data.activeSession.task && data.activeSession.task.phase === "study") {
          data.activeSession.task.phase = data.activeSession.task.type === "interference" ? "distract" : "recall";
          save();
        }
        if (!data.activeSession.paused) beginTicker();
      }
      render();
    } catch (error) {
      renderError(error);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
}());

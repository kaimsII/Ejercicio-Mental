(function () {
  "use strict";

  const WORDS = [
    "motor", "ventana", "montaña", "cuaderno", "planeta", "llave", "bosque", "reloj",
    "puente", "naranja", "brújula", "camino", "espejo", "jardín", "nube", "barco",
    "cobre", "pluma", "isla", "tambor", "cereza", "linterna", "techo", "río",
    "botella", "campana", "arena", "pintura", "tecla", "torre", "cuerda", "semilla"
  ];

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function shuffled(source) {
    const list = source.slice();
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = randomInt(0, i);
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  function sequenceLength(level, index) {
    return Math.min(10, [4, 6, 8, 12, 20][level - 1] || 4, 2 + level + Math.floor(index / 4));
  }

  function create(level, index) {
    const typeIndex = index % 4;
    const length = sequenceLength(level, index);
    if (typeIndex === 0) {
      const sequence = Array.from({ length }, function () { return randomInt(0, 9); });
      const reverse = level >= 2 && index % 2 === 1;
      return {
        type: "numeric", title: "Memoria numérica", phase: "study", sequence,
        direction: reverse ? "inversa" : "directa",
        instruction: "Observa la secuencia. Cuando desaparezca, escríbela " + (reverse ? "en orden inverso." : "en el mismo orden."),
        stimulus: sequence.join("   "),
        showMs: Math.max(2200, Math.min(7500, 1500 + sequence.length * 480)),
        bestRecall: sequence.length
      };
    }
    if (typeIndex === 1) {
      const words = shuffled(WORDS).slice(0, Math.max(3, Math.min(12, 2 + level + Math.floor(index / 5))));
      return {
        type: "words", title: "Memoria de palabras", phase: "study", sequence: words,
        instruction: "Memoriza estas palabras. Después, escribe las que recuerdes; el orden no importa.",
        stimulus: words.join("  ·  "),
        showMs: Math.max(3500, Math.min(9000, 2600 + words.length * 470)),
        bestRecall: words.length
      };
    }
    if (typeIndex === 2) {
      const kind = level >= 3 && Math.random() > 0.5 ? "words" : "numeric";
      const sequence = kind === "words"
        ? shuffled(WORDS).slice(0, Math.min(8, 3 + level))
        : Array.from({ length: Math.min(10, 3 + level) }, function () { return randomInt(1, 9); });
      const distractions = Array.from({ length: 3 }, function () {
        const a = randomInt(2, 15);
        const b = randomInt(1, 10);
        return { a, b, answer: a + b };
      });
      return {
        type: "interference", title: "Memoria con interferencia", phase: "study", sequence,
        sequenceKind: kind, stimulus: sequence.join(kind === "words" ? "  ·  " : "   "),
        instruction: "Memoriza la secuencia. Luego resuelve tres sumas sencillas antes de recordarla.",
        showMs: Math.max(3000, Math.min(8500, 2400 + sequence.length * 480)),
        distractions, distractionIndex: 0, bestRecall: sequence.length
      };
    }
    const sequence = Array.from({ length: Math.min(10, 3 + level + Math.floor(index / 6)) }, function () { return randomInt(0, 9); });
    const mode = ["inverso", "pares", "ascendente"][index % 3];
    let expected = sequence.slice();
    if (mode === "inverso") expected.reverse();
    if (mode === "pares") expected = expected.filter(function (n) { return n % 2 === 0; });
    if (mode === "ascendente") expected.sort(function (a, b) { return a - b; });
    return {
      type: "working", title: "Memoria de trabajo", phase: "study", sequence, expected,
      mode, instruction: "Memoriza los números y, cuando se oculten, escríbelos " + mode + ".",
      stimulus: sequence.join("   "),
      showMs: Math.max(2800, Math.min(8000, 2100 + sequence.length * 430)),
      bestRecall: expected.length
    };
  }

  function normalizeWords(value) {
    return value.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  }

  function isWordTask(task) {
    return task.type === "words" || (task.type === "interference" && task.sequenceKind === "words");
  }

  function parseResponse(task, response) {
    if (isWordTask(task)) {
      return String(response).split(/[\s,;.!?]+/).map(normalizeWords).filter(Boolean);
    }
    if (Array.isArray(response)) {
      return response.map(function (item) {
        const value = String(item).trim();
        if (!value) return null;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : NaN;
      });
    }
    return String(response).trim().split(/[\s,;]+/).filter(Boolean).map(function (item) {
      const parsed = Number(item);
      return Number.isFinite(parsed) ? parsed : NaN;
    });
  }

  function evaluate(task, response) {
    const actual = parseResponse(task, response);
    const expected = (task.type === "working" ? task.expected : task.sequence).slice();
    if (task.type === "numeric" && task.direction === "inversa") expected.reverse();
    const wordMode = isWordTask(task);
    const normalizedExpected = wordMode ? expected.map(normalizeWords) : expected;
    let recalled = 0;
    let positions = 0;
    let errors = 0;
    const mistakes = [];
    const matched = new Set();
    if (wordMode) {
      actual.forEach(function (value, actualIndex) {
        const expectedIndex = normalizedExpected.findIndex(function (expectedValue, index) {
          return expectedValue === value && !matched.has(index);
        });
        if (expectedIndex >= 0) matched.add(expectedIndex);
        else mistakes.push("Respuesta " + (actualIndex + 1) + ": «" + value + "» " +
          (normalizedExpected.indexOf(value) >= 0 ? "está repetida." : "no era una de las palabras esperadas."));
      });
      recalled = matched.size;
      positions = recalled;
      errors = mistakes.length;
    } else {
      actual.forEach(function (value) {
        if (value === null || Number.isNaN(value)) return;
        const index = normalizedExpected.findIndex(function (expectedValue, expectedIndex) {
          return expectedValue === value && !matched.has(expectedIndex);
        });
        if (index >= 0) matched.add(index);
      });
      recalled = matched.size;
      normalizedExpected.forEach(function (expectedValue, index) {
        const value = actual[index];
        if (value === expectedValue) {
          positions += 1;
        } else if (value !== null && value !== undefined) {
          errors += 1;
          mistakes.push(Number.isNaN(value)
            ? "Casilla " + (index + 1) + ": la respuesta no es un número válido; debía ser " + expectedValue + "."
            : "Posición " + (index + 1) + ": escribiste " + value + "; debía ser " + expectedValue + ".");
        }
      });
      for (let index = normalizedExpected.length; index < actual.length; index += 1) {
        const value = actual[index];
        if (value === null || value === undefined) continue;
        errors += 1;
        mistakes.push(Number.isNaN(value)
          ? "Casilla " + (index + 1) + ": la respuesta no es un número válido y no había un número esperado en esa posición."
          : "Casilla " + (index + 1) + ": escribiste " + value + ", pero no había un número esperado en esa posición.");
      }
    }
    const missingIndices = normalizedExpected.map(function (_, index) { return index; }).filter(function (index) {
      return !matched.has(index);
    });
    const accuracy = normalizedExpected.length
      ? Math.round((wordMode ? recalled : (recalled + positions) / 2) / normalizedExpected.length * 100)
      : 0;
    return {
      accuracy,
      recalled,
      total: normalizedExpected.length,
      omissions: Math.max(0, normalizedExpected.length - recalled),
      errors,
      expected,
      correctPositions: positions,
      mistakes,
      omissionDetails: missingIndices.map(function (index) {
        return wordMode
          ? expected[index]
          : "Posición " + (index + 1) + ": faltó " + expected[index];
      })
    };
  }

  function parseDistractionAnswer(value, expected) {
    const answer = Number(value.trim());
    return Number.isFinite(answer) && answer === expected;
  }

  window.FocoMemory = { create, evaluate, parseDistractionAnswer };
}());

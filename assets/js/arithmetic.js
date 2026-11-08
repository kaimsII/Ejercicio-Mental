(function () {
  "use strict";

  const METHODS = [
    {
      id: "distributive", name: "Descomposición distributiva", description: "Separa un factor y multiplica cada parte.",
      example: "14 × 6 = (10 × 6) + (4 × 6) = 60 + 24 = 84",
      lesson: ["Descompón uno de los factores en partes fáciles: decenas y unidades, por ejemplo.", "Multiplica cada parte por el otro factor.", "Suma los productos parciales. La propiedad distributiva garantiza que el resultado no cambia."],
      worked: ["14 = 10 + 4", "10 × 6 = 60", "4 × 6 = 24", "60 + 24 = 84"]
    },
    {
      id: "compensation", name: "Compensación", description: "Redondea a un número cómodo y corrige la diferencia.",
      example: "19 × 7 = (20 × 7) − 7 = 140 − 7 = 133",
      lesson: ["Cambia un factor por un número cercano que sea fácil de multiplicar, como 10, 20, 50 o 100.", "Calcula el producto con ese número redondo.", "Corrige el resultado por la diferencia entre el número redondo y el original: resta si redondeaste hacia arriba; suma si redondeaste hacia abajo."],
      worked: ["19 está 1 por debajo de 20.", "20 × 7 = 140", "Como usamos 1 de más, restamos 1 × 7.", "140 − 7 = 133"]
    },
    {
      id: "trachtenberg", name: "Trachtenberg: × 11", description: "En un número de dos cifras, suma sus dígitos en el centro.",
      example: "78 × 11 → 7 | (7 + 8) | 8 → 858",
      lesson: ["Para multiplicar un número de dos cifras por 11, conserva el dígito de las decenas a la izquierda y el de las unidades a la derecha.", "Suma las dos cifras originales y escribe esa suma en el centro.", "Si la suma central es 10 o más, escribe su cifra de unidades en el centro y lleva 1 a la cifra de la izquierda. Este acarreo es esencial."],
      worked: ["78 × 11: deja 7 a la izquierda y 8 a la derecha.", "7 + 8 = 15: escribe 5 en el centro y lleva 1 a la izquierda.", "Suma el acarreo: 7 + 1 = 8. Resultado: 858."]
    },
    {
      id: "doubling", name: "Duplicación y división entre dos", description: "Multiplica por 10 y divide entre 2, o usa equivalencias.",
      example: "48 × 5 = (48 × 10) ÷ 2 = 480 ÷ 2 = 240",
      lesson: ["Reemplaza el factor por una equivalencia conveniente: 5 = 10 ÷ 2, 25 = 100 ÷ 4 y 50 = 100 ÷ 2.", "Multiplica el otro factor por 10 o 100.", "Divide ese producto por 2 o 4 para compensar la equivalencia."],
      worked: ["5 equivale a 10 ÷ 2.", "48 × 10 = 480", "480 ÷ 2 = 240."]
    },
    {
      id: "dividend", name: "Descomposición del dividendo", description: "Divide partes fáciles por separado y suma cocientes.",
      example: "96 ÷ 8 = (80 ÷ 8) + (16 ÷ 8) = 10 + 2 = 12",
      lesson: ["Separa el dividendo en sumandos que sean divisibles exactamente por el divisor.", "Divide cada parte por separado.", "Suma los cocientes parciales para obtener el cociente total."],
      worked: ["96 = 80 + 16; ambas partes son divisibles por 8.", "80 ÷ 8 = 10", "16 ÷ 8 = 2", "10 + 2 = 12."]
    },
    {
      id: "factor", name: "Factorización del divisor", description: "Divide sucesivamente entre factores del divisor.",
      example: "144 ÷ 12 = 144 ÷ 3 ÷ 4 = 48 ÷ 4 = 12",
      lesson: ["Expresa el divisor como un producto de factores sencillos.", "Divide el dividendo por un factor y luego por el otro. Dividir sucesivamente entre ambos equivale a dividir por su producto.", "Comprueba el cociente multiplicándolo por el divisor original."],
      worked: ["12 = 3 × 4", "144 ÷ 3 = 48", "48 ÷ 4 = 12", "Comprobación: 12 × 12 = 144."]
    },
    {
      id: "divide5", name: "División por 5", description: "Multiplica el dividendo por 2 y divide entre 10.",
      example: "135 ÷ 5 = (135 × 2) ÷ 10 = 270 ÷ 10 = 27",
      lesson: ["Como 5 × 2 = 10, multiplicar el dividendo por 2 y después dividirlo entre 10 conserva el mismo cociente.", "Mueve la coma decimal una posición a la izquierda al dividir entre 10.", "La regla también funciona con resultados decimales."],
      worked: ["135 × 2 = 270", "270 ÷ 10 = 27", "Por tanto, 135 ÷ 5 = 27."]
    },
    {
      id: "multiples", name: "Múltiplos conocidos", description: "Encuentra múltiplos cómodos y suma sus factores.",
      example: "156 ÷ 12 = (120 ÷ 12) + (36 ÷ 12) = 10 + 3 = 13",
      lesson: ["Busca un múltiplo fácil del divisor que no supere el dividendo.", "Resta ese múltiplo para encontrar lo que falta.", "Expresa el resto como otro múltiplo del divisor y suma cuántos grupos encontraste."],
      worked: ["12 × 10 = 120", "156 − 120 = 36", "36 = 12 × 3", "10 + 3 = 13."]
    },
    {
      id: "mixed", name: "Práctica mezclada", description: "Alterna operaciones y elige una estrategia mental.",
      example: "Identifica primero una descomposición o equivalencia útil.",
      lesson: ["Lee la operación y decide qué la haría más sencilla: separar en partes, redondear y corregir, usar una equivalencia o calcular con múltiplos.", "Estima el tamaño del resultado para detectar errores de cálculo.", "Resuelve sin pistas de método. Después de responder, podrás revisar el procedimiento."],
      worked: ["Ejemplo: 19 × 7 está cerca de 20 × 7.", "20 × 7 = 140; corrige restando 7.", "Resultado estimado y exacto: 133."]
    }
  ];

  function int(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function operation(level) {
    const weights = level === 1 ? ["+", "-", "×", "÷"] : ["+", "-", "×", "÷", "×", "+"];
    const sign = weights[int(0, weights.length - 1)];
    let a;
    let b;
    let answer;
    if (sign === "+") {
      const max = [20, 99, 999, 999, 9999][level - 1] || 99;
      if (level === 1) {
        a = int(1, 9);
        b = int(1, 9);
      } else {
        a = int(Math.ceil(max / 2), max);
        b = int(10, Math.max(10, Math.floor(max / 2)));
      }
      answer = a + b;
    } else if (sign === "-") {
      const max = [20, 99, 999, 9999, 99999][level - 1] || 99;
      if (level === 1) {
        a = int(1, 9);
        b = int(1, a);
      } else {
        a = int(Math.ceil(max / 2), max);
        b = int(level === 2 ? 10 : 1, a);
      }
      answer = a - b;
    } else if (sign === "×") {
      if (level === 1) { a = int(2, 9); b = int(2, 9); }
      else if (level === 2) { a = int(12, 49); b = int(2, 9); }
      else if (level === 3) { a = int(12, 99); b = int(3, 19); }
      else { a = int(20, level === 5 ? 199 : 99); b = int(11, level === 5 ? 99 : 99); }
      answer = a * b;
    } else {
      const divisor = level === 1 ? int(2, 9) : level === 2 ? int(2, 12) : int(2, level === 3 ? 19 : 30);
      const quotient = int(2, level === 1 ? 12 : level === 2 ? 40 : 100);
      a = divisor * quotient;
      b = divisor;
      answer = quotient;
    }
    return { a, b, sign, answer, text: a + " " + sign + " " + b };
  }

  function methodProblem(id, level) {
    let a, b, answer, text, steps = [];
    if (id === "distributive") {
      a = int(12, level < 3 ? 39 : 99);
      b = int(2, level < 3 ? 9 : 19);
      const tens = Math.floor(a / 10) * 10;
      const units = a % 10;
      answer = a * b;
      text = a + " × " + b;
      steps = [a + " = " + tens + " + " + units, tens + " × " + b + " = " + (tens * b), units + " × " + b + " = " + (units * b), (tens * b) + " + " + (units * b) + " = " + answer];
    } else if (id === "compensation") {
      const bases = [10, 20, 50, 100];
      const base = bases[int(0, level < 3 ? 1 : 3)];
      const near = base + (Math.random() < 0.5 ? -1 : 1);
      b = int(2, 12);
      a = near;
      answer = a * b;
      text = a + " × " + b;
      const rounded = (near < base ? base : base);
      steps = [base + " × " + b + " = " + (base * b), "Ajuste: " + (near < base ? "resta" : "suma") + " " + Math.abs(near - base) + " × " + b, base * b + (near < base ? " − " : " + ") + Math.abs(near - base) * b + " = " + answer];
      if (rounded !== base) throw new Error("Error interno generando compensación.");
    } else if (id === "trachtenberg") {
      a = int(12, 98);
      b = 11;
      answer = a * 11;
      const digits = String(a).split("").map(Number);
      const d1 = digits[0];
      const d2 = digits[1];
      text = a + " × 11";
      steps = [d1 + " | (" + d1 + " + " + d2 + ") | " + d2, "Suma central: " + (d1 + d2) + (d1 + d2 >= 10 ? "; lleva 1 a la cifra izquierda." : "."), "Resultado: " + answer];
    } else if (id === "doubling") {
      const factor = [5, 25, 50][int(0, level < 3 ? 0 : 2)];
      a = int(12, level < 3 ? 99 : 300);
      b = factor;
      answer = a * b;
      text = a + " × " + b;
      if (factor === 5) steps = [a + " × 10 = " + (a * 10), (a * 10) + " ÷ 2 = " + answer];
      else if (factor === 25) steps = [a + " × 100 = " + (a * 100), (a * 100) + " ÷ 4 = " + answer];
      else steps = [a + " × 100 = " + (a * 100), (a * 100) + " ÷ 2 = " + answer];
    } else if (id === "dividend") {
      b = int(2, 12);
      const quotient = int(8, 30);
      a = b * quotient;
      answer = quotient;
      text = a + " ÷ " + b;
      const firstPart = Math.floor(a / (b * 10)) * b * 10;
      steps = [a + " = " + firstPart + " + " + (a - firstPart), firstPart + " ÷ " + b + " = " + (firstPart / b), (a - firstPart) + " ÷ " + b + " = " + ((a - firstPart) / b), "Suma los cocientes: " + answer];
    } else if (id === "factor") {
      const factorA = int(2, 5);
      const factorB = int(2, 6);
      const quotient = int(4, 20);
      b = factorA * factorB;
      a = b * quotient;
      answer = quotient;
      text = a + " ÷ " + b;
      steps = [b + " = " + factorA + " × " + factorB, a + " ÷ " + factorA + " = " + (a / factorA), (a / factorA) + " ÷ " + factorB + " = " + answer];
    } else if (id === "divide5") {
      a = int(10, 500) * 5;
      b = 5;
      answer = a / 5;
      text = a + " ÷ 5";
      steps = [a + " × 2 = " + (a * 2), (a * 2) + " ÷ 10 = " + answer];
    } else if (id === "multiples") {
      b = int(3, 15);
      const quotient = int(10, 25);
      a = b * quotient;
      answer = quotient;
      text = a + " ÷ " + b;
      const chunks = Math.floor(quotient / 10) * 10;
      steps = [b + " × " + chunks + " = " + (b * chunks), a + " − " + (b * chunks) + " = " + (a - b * chunks), "El resto equivale a " + (quotient - chunks) + " grupos de " + b + ".", chunks + " + " + (quotient - chunks) + " = " + answer];
    } else {
      return operation(level);
    }
    return { a, b, answer, text, steps, method: id };
  }

  function createProblem(level, method) {
    const id = method === "mixed" ? (Math.random() < 0.55 ? "mixed" : METHODS[int(0, 7)].id) : method;
    const problem = id === "mixed" ? operation(level) : methodProblem(id, level);
    problem.method = id;
    return problem;
  }

  function createChallenge(level) {
    const operations = Array.from({ length: 20 }, function () {
      let problem = operation(Math.max(2, level));
      if (level >= 4 && Math.random() > 0.45) {
        const a = int(15, level === 5 ? 149 : 99);
        const b = int(11, level === 5 ? 49 : 29);
        problem = { a, b, sign: "×", answer: a * b, text: a + " × " + b };
      }
      return problem;
    });
    const distractors = Array.from({ length: 3 }, function () {
      const a = int(2, 20), b = int(1, 15);
      return { text: a + " + " + b, answer: a + b };
    });
    return { phase: "solve", operations, answers: [], index: 0, distractors, distractionIndex: 0, recall: [], startedAt: Date.now() };
  }

  function normalizeOperation(text) {
    return text.toLocaleLowerCase("es").replace(/[\s=]/g, "").replace(/[x*]/g, "×").replace(/[/:]/g, "÷").replace(/−/g, "-");
  }

  function evaluateChallenge(challenge, elapsedSeconds) {
    let calculationCorrect = 0;
    let operationsRemembered = 0;
    let resultsRemembered = 0;
    let associationsCorrect = 0;
    let orderedAssociations = 0;
    const usedOperations = new Set();
    const usedResults = new Set();
    const usedAssociations = new Set();
    const rows = challenge.operations.map(function (problem, index) {
      const answer = Number(challenge.answers[index]);
      if (answer === problem.answer) calculationCorrect += 1;
      const response = challenge.recall[index] || {};
      const recalledOperation = normalizeOperation(response.operation || "");
      const recalledResult = response.result === "" ? NaN : Number(response.result);
      let operationIndex = -1;
      let resultIndex = -1;
      let associationIndex = -1;
      for (let candidate = 0; candidate < challenge.operations.length; candidate += 1) {
        if (operationIndex < 0 && !usedOperations.has(candidate) && recalledOperation === normalizeOperation(challenge.operations[candidate].text)) operationIndex = candidate;
        if (resultIndex < 0 && !usedResults.has(candidate) && recalledResult === challenge.operations[candidate].answer) resultIndex = candidate;
        const candidateRecall = challenge.operations[candidate];
        if (associationIndex < 0 && !usedAssociations.has(candidate) && recalledOperation === normalizeOperation(candidateRecall.text) && recalledResult === candidateRecall.answer) associationIndex = candidate;
      }
      const operationCorrect = operationIndex >= 0;
      const resultCorrect = resultIndex >= 0;
      const associationCorrect = associationIndex >= 0;
      if (operationCorrect) { operationsRemembered += 1; usedOperations.add(operationIndex); }
      if (resultCorrect) { resultsRemembered += 1; usedResults.add(resultIndex); }
      if (associationCorrect) {
        associationsCorrect += 1;
        usedAssociations.add(associationIndex);
      }
      const inOrder = recalledOperation === normalizeOperation(problem.text) && recalledResult === problem.answer;
      if (inOrder) orderedAssociations += 1;
      return { operation: problem.text, result: problem.answer, calculated: answer, operationCorrect, resultCorrect, associationCorrect, inOrder };
    });
    return {
      calculationsCorrect: calculationCorrect,
      calculationAccuracy: Math.round(calculationCorrect / 20 * 100),
      operationsRemembered,
      resultsRemembered,
      associationsCorrect,
      orderedAssociations,
      elapsedSeconds,
      rows
    };
  }

  window.FocoArithmetic = { METHODS, createProblem, createChallenge, evaluateChallenge, normalizeOperation };
}());

let stepsData = [];

/* 🎲 Sample Generator */
function loadSample() {
  const samples = [
`S -> AB | B
A -> a | ε
B -> b`,

`S -> AC | B
A -> a
C -> c | BC
B -> b`,

`S -> AB
A -> B
B -> A`,

`S -> AB | ε
A -> a | ε
B -> b | ε`
  ];

  document.getElementById("grammarInput").value =
    samples[Math.floor(Math.random() * samples.length)];
}

/* 📚 Toggle Theory */
function toggleTheory() {
  document.getElementById("theoryBox").classList.toggle("hidden");
}

/* 🚀 Main Function */
function simplifyGrammar() {
  const input = document.getElementById("grammarInput").value;
  const errorDiv = document.getElementById("error");
  errorDiv.innerText = "";

  let grammar = parseGrammar(input);
  if (!grammar) {
    errorDiv.innerText = "❌ Invalid format!";
    return;
  }

  stepsData = [];

  let step1 = removeNullProductions(grammar);
  stepsData.push({
    title: "Step 1: Remove Null (ε) Productions",
    content: step1,
    explanation: `
• Identify nullable variables.
• Generate combinations by removing them.
• Remove ε-productions.
• Keep ε only for start symbol.
`
  });

  let step2 = removeUnitProductions(step1);
  stepsData.push({
    title: "Step 2: Remove Unit Productions",
    content: step2,
    explanation: `
• Remove A → B type rules.
• Use BFS closure.
• Replace with actual productions.
`
  });

  let step3 = removeUselessSymbols(step2);

  // 🔥 Advanced Start Symbol Fix
  step3 = fixStartSymbol(step3);

  stepsData.push({
    title: "Step 3: Remove Useless Symbols",
    content: step3,
    explanation: `
• Remove non-generating symbols.
• Remove unreachable symbols.
• Keep only useful productions.
`
  });

  stepsData.push({
    title: "🎯 Final Simplified Grammar",
    content: step3,
    final: true,
    explanation: `
• Fully simplified CFG.
• Language preserved.
• Ready for CNF conversion.
`
  });

  displayStep();
}

/* 🔍 Parser */
function parseGrammar(input) {
  let grammar = {};
  let lines = input.split("\n");

  for (let line of lines) {
    if (!line.trim()) continue;

    let parts = line.split(/->|→/);
    if (parts.length !== 2) return null;

    let lhs = parts[0].trim();
    if (!/^[A-Z]$/.test(lhs)) return null;

    let rhs = parts[1]
      .split("|")
      .map(s => s.trim().replace(/epsilon|eps/gi, "ε"))
      .filter(Boolean);

    grammar[lhs] = [...new Set(rhs)];
  }

  grammar._start = Object.keys(grammar)[0];
  return grammar;
}

function isUpper(ch) {
  return /^[A-Z]$/.test(ch);
}

/* 🔵 STEP 1 */
function removeNullProductions(grammar) {
  let nullable = new Set();
  let changed = true;
  const start = grammar._start;

  while (changed) {
    changed = false;
    for (let A in grammar) {
      if (A === "_start" || nullable.has(A)) continue;

      for (let prod of (grammar[A] || [])) {
        if (
          prod === "ε" ||
          [...prod].every(ch => isUpper(ch) && nullable.has(ch))
        ) {
          nullable.add(A);
          changed = true;
          break;
        }
      }
    }
  }

  let newGrammar = {};

  for (let A in grammar) {
    if (A === "_start") continue;

    let set = new Set();

    for (let prod of (grammar[A] || [])) {
      if (prod === "ε") continue;

      let variants = generateVariants(prod, nullable);

      variants.forEach(v => {
        if (v !== "") {
          set.add(v);
        } else if (A === start) {
          set.add("ε");
        }
      });
    }

    newGrammar[A] = [...set];
  }

  if (nullable.has(start)) {
    newGrammar[start] = newGrammar[start] || [];
    if (!newGrammar[start].includes("ε")) {
      newGrammar[start].push("ε");
    }
  }

  newGrammar._start = start;
  return sortGrammar(newGrammar);
}

/* 🔥 Safe Variant Generator */
function generateVariants(prod, nullable) {
  if (prod.length > 12) return [prod]; // safety guard

  let res = [""];

  for (let ch of prod) {
    let temp = [];

    for (let r of res) {
      temp.push(r + ch);
      if (nullable.has(ch)) temp.push(r);
    }

    res = temp;

    if (res.length > 2048) break; // prevent explosion
  }

  return [...new Set(res)];
}

/* 🟡 STEP 2 */
function removeUnitProductions(grammar) {
  let newG = {};
  const start = grammar._start;
  let vars = Object.keys(grammar).filter(k => k !== "_start");

  for (let A of vars) {
    let closure = new Set([A]);
    let queue = [A];

    while (queue.length) {
      let X = queue.shift();

      for (let prod of (grammar[X] || [])) {
        if (prod.length === 1 && isUpper(prod)) {
          if (!closure.has(prod)) {
            closure.add(prod);
            queue.push(prod);
          }
        }
      }
    }

    let result = new Set();

    for (let B of closure) {
      for (let prod of (grammar[B] || [])) {
        if (!(prod.length === 1 && isUpper(prod))) {
          result.add(prod);
        }
      }
    }

    newG[A] = [...result];
  }

  newG._start = start;
  return sortGrammar(newG);
}

/* 🔴 STEP 3 */
function removeUselessSymbols(grammar) {
  const start = grammar._start;

  let generating = new Set();
  let changed = true;

  while (changed) {
    changed = false;

    for (let A in grammar) {
      if (A === "_start" || generating.has(A)) continue;

      for (let prod of (grammar[A] || [])) {
        if ([...prod].every(ch => !isUpper(ch) || generating.has(ch))) {
          generating.add(A);
          changed = true;
          break;
        }
      }
    }
  }

  if (!generating.has(start)) {
    return { _start: start, [start]: [] };
  }

  let filtered = {};

  for (let A of generating) {
    filtered[A] = (grammar[A] || []).filter(prod =>
      [...prod].every(ch => !isUpper(ch) || generating.has(ch))
    );
  }

  let reachable = new Set([start]);
  let queue = [start];

  while (queue.length) {
    let A = queue.shift();

    for (let prod of (filtered[A] || [])) {
      for (let ch of prod) {
        if (isUpper(ch) && !reachable.has(ch)) {
          reachable.add(ch);
          queue.push(ch);
        }
      }
    }
  }

  let final = { _start: start };

  for (let A of reachable) {
    final[A] = filtered[A] || [];
  }

  return sortGrammar(final);
}

/* 🔥 Start Symbol Fix */
function fixStartSymbol(grammar) {
  const start = grammar._start;

  let appears = false;

  for (let A in grammar) {
    if (A === "_start") continue;

    for (let prod of (grammar[A] || [])) {
      if (prod.includes(start)) {
        appears = true;
        break;
      }
    }
  }

  if (grammar[start]?.includes("ε") && appears) {
    let newStart = start + "0";

    while (grammar[newStart]) {
      newStart += "0";
    }

    grammar[newStart] = [start, "ε"];
    grammar._start = newStart;
  }

  return grammar;
}

/* ✨ SORT */
function sortGrammar(g) {
  for (let A in g) {
    if (Array.isArray(g[A])) {
      g[A] = [...new Set(g[A])].sort();
    }
  }
  return g;
}

/* 🖥️ DISPLAY */
function displayStep() {
  let container = document.getElementById("steps");
  container.innerHTML = "";

  stepsData.forEach(step => {
    container.innerHTML += `
      <div class="card ${step.final ? "final-result" : ""}">
        <h2>${step.title}</h2>
        <p><b>Explanation:</b> ${step.explanation}</p>
        <pre>${formatGrammar(step.content)}</pre>
      </div>
    `;
  });

  document.getElementById("stepIndicator").innerText =
    `Total Steps: ${stepsData.length}`;
}

/* ✨ FORMAT */
function formatGrammar(g) {
  let out = "";
  const start = g._start;

  if (!g[start] || g[start].length === 0) {
    out += `${start} → ∅\n`;
  } else {
    out += `${start} → ${g[start].join(" | ")}\n`;
  }

  for (let A in g) {
    if (A === "_start" || A === start) continue;

    if (!g[A] || g[A].length === 0) {
      out += `${A} → ∅\n`;
    } else {
      out += `${A} → ${g[A].join(" | ")}\n`;
    }
  }

  return out.trim() || "∅ Empty Language";
}
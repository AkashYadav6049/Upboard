window.UP = window.UP || {};

UP.mulberry = function (seed) {
  let a = seed | 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

UP.dailySeed = function () {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
};

UP.shuffle = function (arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

UP.pick = function (arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
};

UP.clamp = (n, a, b) => Math.max(a, Math.min(b, n));

UP.el = function (html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
};

UP.$ = (sel, root = document) => root.querySelector(sel);
UP.$$ = (sel, root = document) => [...root.querySelectorAll(sel)];

UP.toast = function (msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(UP._toast);
  UP._toast = setTimeout(() => (t.hidden = true), 1800);
};

UP.storageKey = "upboard-playground-v1";

UP.loadStats = function () {
  try {
    return JSON.parse(localStorage.getItem(UP.storageKey)) || UP.defaultStats();
  } catch {
    return UP.defaultStats();
  }
};

UP.defaultStats = function () {
  return {
    xp: 0,
    gems: 12,
    streak: 0,
    lastPlay: "",
    plays: 0,
    best: {},
    playedToday: {},
  };
};

UP.saveStats = function (s) {
  localStorage.setItem(UP.storageKey, JSON.stringify(s));
};

UP.todayStr = function () {
  return new Date().toISOString().slice(0, 10);
};

UP.touchStreak = function (s) {
  const today = UP.todayStr();
  if (s.lastPlay === today) return s;
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const ystr = y.toISOString().slice(0, 10);
  s.streak = s.lastPlay === ystr ? (s.streak || 0) + 1 : 1;
  s.lastPlay = today;
  if (s.streak === 1) s.gems += 2;
  if (s.streak % 7 === 0) s.gems += 15;
  return s;
};

UP.awardXP = function (gameId, amount, extra) {
  const s = UP.loadStats();
  UP.touchStreak(s);
  const n = Math.max(0, Math.round(amount));
  s.xp += n;
  s.plays += 1;
  if (extra && extra.gems) s.gems += extra.gems;
  if (extra && extra.best != null) {
    const prev = s.best[gameId];
    if (prev == null || extra.best > prev) s.best[gameId] = extra.best;
  }
  const today = UP.todayStr();
  if (!s.playedToday[today]) s.playedToday[today] = {};
  s.playedToday[today][gameId] = true;
  UP.saveStats(s);
  UP.renderHud();
  return n;
};

UP.renderHud = function () {
  const s = UP.loadStats();
  const xp = document.getElementById("hud-xp");
  const gems = document.getElementById("hud-gems");
  const streak = document.getElementById("hud-streak");
  if (xp) xp.textContent = s.xp;
  if (gems) gems.textContent = s.gems;
  if (streak) streak.textContent = s.streak;
};

UP.resultHTML = function (title, body, xp, actions) {
  return `<div class="result">
    <h2>${title}</h2>
    <p>${body}</p>
    <p class="xp">+${xp} XP</p>
    ${actions || `<button class="primary" data-home>Back to games</button>
    <button class="ghost wide" data-again>Play again</button>`}
  </div>`;
};

UP.bindNav = function (root, onAgain) {
  root.addEventListener("click", (e) => {
    if (e.target.closest("[data-home]")) location.hash = "#/";
    if (e.target.closest("[data-again]") && onAgain) onAgain();
  });
};

UP.norm = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .trim();

UP.evalExpr = function (expr) {
  if (!/^[\d+\-*/().\s]+$/.test(expr)) throw new Error("bad");
  const fn = new Function(`return (${expr})`);
  const v = fn();
  if (!Number.isFinite(v)) throw new Error("nan");
  return v;
};

UP.usedDigits = function (expr) {
  return (expr.match(/\d+/g) || []).map(Number);
};

UP.sameMultiset = function (a, b) {
  if (a.length !== b.length) return false;
  const c = a.slice().sort((x, y) => x - y);
  const d = b.slice().sort((x, y) => x - y);
  return c.every((v, i) => v === d[i]);
};

UP.CATALOG = [
  { id: "2048", name: "2048", desc: "Merge tiles to reach 2048.", tag: "Anyone · logic", cat: "logic", art: "432 · 128", color: "#f0a05a" },
  { id: "twentyfour", name: "24 Game", desc: "Combine four numbers with + − × ÷ to make exactly 24.", tag: "Anyone · maths", cat: "maths", art: "24", color: "#2a9d8f" },
  { id: "colourclash", name: "Colour Clash", desc: "Tap the colour of the ink, not the word it spells.", tag: "Anyone · focus", cat: "focus", art: "RED", color: "#4c8dba" },
  { id: "connections", name: "Connections", desc: "Sort 16 words into 4 hidden groups of 4.", tag: "Anyone · word groups", cat: "words", art: "GRID", color: "#6d5cae" },
  { id: "rebus", name: "Emoji Rebus", desc: "Guess the word or phrase hidden in the emojis.", tag: "Anyone · words", cat: "words", art: "🧈🦋", color: "#e85d4c" },
  { id: "capitals", name: "Flags & Capitals", desc: "Name the capital of each country, against the clock.", tag: "Class 6–10 · Geography", cat: "geo", art: "🇮🇳", color: "#52796f", study: true },
  { id: "gkquiz", name: "GK Quiz", desc: "Five general-knowledge questions a round.", tag: "Anyone · general knowledge", cat: "gk", art: "? ✓", color: "#1e3d59" },
  { id: "higherlower", name: "Higher or Lower", desc: "Guess which is bigger and build the longest streak.", tag: "Anyone · trivia", cat: "trivia", art: "▲ ▼", color: "#c45c7a" },
  { id: "keyword", name: "Keyword", desc: "Six words, one hidden connecting keyword.", tag: "Anyone · words", cat: "words", art: "CAT", color: "#e4b84a" },
  { id: "mathsprint", name: "Math Sprint", desc: "Solve 10 quick arithmetic problems against the clock.", tag: "Anyone · maths", cat: "maths", art: "7×8", color: "#e85d4c" },
  { id: "mirror", name: "Mirror Image", desc: "Pick the correct mirror image of the figure.", tag: "Anyone · reasoning", cat: "reasoning", art: "R | Я", color: "#4c8dba" },
  { id: "nonogram", name: "Nonogram", desc: "Use the number clues to fill the grid and reveal the picture.", tag: "Anyone · logic", cat: "logic", art: "■ □", color: "#1e3d59" },
  { id: "sequence", name: "Number Sequence", desc: "Spot the pattern and pick the next number in the series.", tag: "Anyone · reasoning", cat: "reasoning", art: "2 6 12 ?", color: "#2a9d8f" },
  { id: "memory", name: "Periodic Table Memory", desc: "Flip cards to find matching element pairs.", tag: "Class 11–12 · Chemistry", cat: "chem", art: "H · O", color: "#52796f", study: true },
  { id: "pipes", name: "Pipes", desc: "Rotate the pieces to connect every pipe into one network.", tag: "Anyone · logic", cat: "logic", art: "┐└─", color: "#2a9d8f" },
  { id: "queens", name: "Queens", desc: "Place one crown per row, column & colour — none touching.", tag: "Anyone · logic", cat: "logic", art: "♛", color: "#e4b84a" },
  { id: "spellingbee", name: "Spelling Bee", desc: "Make words from 7 letters. Every word must use the centre.", tag: "Anyone · words", cat: "words", art: "HIVE", color: "#e4b84a" },
  { id: "sudoku", name: "Sudoku", desc: "Fill the 6×6 grid so every row, column & box has 1–6.", tag: "Anyone · numbers", cat: "numbers", art: "5 3 6", color: "#1e3d59" },
  { id: "synonyms", name: "Synonyms & Antonyms", desc: "Pick the word that means the same — or the opposite.", tag: "Anyone · vocabulary", cat: "words", art: "= / ≠", color: "#6d5cae" },
  { id: "truefalse", name: "True or False", desc: "Twelve rapid-fire statements against the clock.", tag: "Anyone · general knowledge", cat: "gk", art: "✓ ✕", color: "#e85d4c" },
  { id: "wordguess", name: "Word Guess", desc: "Guess the hidden 5-letter word in 6 tries.", tag: "Anyone · words", cat: "words", art: "PLAY", color: "#52796f" },
  { id: "wordsearch", name: "Word Search", desc: "Find all the hidden words in the letter grid.", tag: "Anyone · words", cat: "words", art: "FIND", color: "#4c8dba" },
  { id: "zip", name: "Zip", desc: "Draw one path through every cell, in number order.", tag: "Anyone · logic", cat: "logic", art: "1—2—3", color: "#2a9d8f" },
];

UP.iconHTML = function (id) {
  const icons = {
    "2048": `<div class="ico ico-2048" aria-hidden="true"><i>4</i><i>32</i><i>128</i><i>16</i></div>`,
    twentyfour: `<div class="ico ico-24" aria-hidden="true"><b>24</b><em>6 8 3 4</em></div>`,
    colourclash: `<div class="ico ico-clash" aria-hidden="true"><b>RED</b><span><i></i><i></i><i></i><i></i></span></div>`,
    connections: `<div class="ico ico-conn" aria-hidden="true"><i></i><i></i><i></i><i></i></div>`,
    rebus: `<div class="ico ico-rebus" aria-hidden="true">🧈🦋</div>`,
    capitals: `<div class="ico ico-flag" aria-hidden="true">🇮🇳</div>`,
    gkquiz: `<div class="ico ico-gk" aria-hidden="true"><b>?</b><span>✓</span></div>`,
    higherlower: `<div class="ico ico-hl" aria-hidden="true"><b>▲</b><em>vs</em><b>▼</b></div>`,
    keyword: `<div class="ico ico-key" aria-hidden="true"><i>C</i><i>A</i><i>T</i></div>`,
    mathsprint: `<div class="ico ico-math" aria-hidden="true"><b>7 × 8</b><em>= 56</em></div>`,
    mirror: `<div class="ico ico-mirror" aria-hidden="true"><b>R</b><i></i><b>Я</b></div>`,
    nonogram: `<div class="ico ico-ng" aria-hidden="true"><i></i><i class="on"></i><i></i><i class="on"></i><i class="on"></i><i class="on"></i><i></i><i class="on"></i><i></i></div>`,
    sequence: `<div class="ico ico-seq" aria-hidden="true"><b>2</b><b>6</b><b>12</b><b>?</b></div>`,
    memory: `<div class="ico ico-mem" aria-hidden="true"><i>H</i><i>O</i></div>`,
    pipes: `<div class="ico ico-pipes" aria-hidden="true">┐└─</div>`,
    queens: `<div class="ico ico-queen" aria-hidden="true">♛♛♛</div>`,
    spellingbee: `<div class="ico ico-bee" aria-hidden="true"><i></i><b>A</b></div>`,
    sudoku: `<div class="ico ico-sdk" aria-hidden="true"><span>5</span><span>3</span><span></span><span>6</span><span></span><span>1</span><span></span><span>2</span><span>4</span></div>`,
    synonyms: `<div class="ico ico-syn" aria-hidden="true"><i>BRAVE</i><i>BOLD</i><em>= / ≠</em></div>`,
    truefalse: `<div class="ico ico-tf" aria-hidden="true"><b>✓</b><b>✕</b></div>`,
    wordguess: `<div class="ico ico-wg" aria-hidden="true"><i>P</i><i>L</i><i>A</i><i>Y</i></div>`,
    wordsearch: `<div class="ico ico-ws" aria-hidden="true">FIND</div>`,
    zip: `<div class="ico ico-zip" aria-hidden="true"><b>1</b><i></i><b>2</b><i></i><b>3</b></div>`,
  };
  return icons[id] || `<div class="ico"></div>`;
};

UP.GAMES = {};
UP.register = function (id, impl) {
  UP.GAMES[id] = impl;
};

UP.resetGameListeners = function () {
  if (typeof UP._cleanup === "function") {
    try {
      UP._cleanup();
    } catch (_) {}
    UP._cleanup = null;
  }
};

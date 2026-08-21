(function () {
  function shell(container, meta, daily, body) {
    UP.resetGameListeners();
    container.innerHTML = `
      <div class="game-shell">
        <div class="game-nav">
          <a class="back" href="#/">← Games</a>
          <div class="mode-toggle">
            <button data-mode="daily" class="${daily ? "on" : ""}">Daily</button>
            <button data-mode="play" class="${daily ? "" : "on"}">Practice</button>
          </div>
        </div>
        <div class="game-head">
          <div class="game-head-icon">${UP.iconHTML(meta.id)}</div>
          <div>
            <h1>${meta.name}</h1>
            <p>${meta.desc}</p>
          </div>
        </div>
        <div class="stage" id="stage">${body}</div>
      </div>`;
    container.querySelectorAll("[data-mode]").forEach((b) => {
      b.onclick = () => {
        location.hash = b.dataset.mode === "daily" ? `#/game/${meta.id}` : `#/game/${meta.id}/practice`;
      };
    });
    return container.querySelector("#stage");
  }
  function rngFor(daily, salt) {
    return UP.mulberry((daily ? UP.dailySeed() : (Math.random() * 1e9) | 0) + (salt || 0));
  }
  function finish(stage, title, body, xp, again) {
    stage.innerHTML = UP.resultHTML(title, body, xp);
    UP.bindNav(stage, again);
  }

  /* ---------- 24 Game ---------- */
  function fmt24(n) {
    if (!Number.isFinite(n)) return "?";
    if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
    return String(Math.round(n * 100) / 100);
  }
  function apply24(a, op, b) {
    if (op === "+") return a + b;
    if (op === "-") return a - b;
    if (op === "*") return a * b;
    if (op === "/") return Math.abs(b) < 1e-9 ? null : a / b;
    return null;
  }
  UP.register("twentyfour", function (root, meta, daily) {
    const stage = shell(root, meta, daily, "");
    const nums = UP.TWENTYFOUR[(daily ? UP.dailySeed() : Date.now()) % UP.TWENTYFOUR.length].slice();
    let tiles = nums.map((n, i) => ({ id: i, n }));
    let nextId = nums.length;
    let pick = null;
    let op = null;
    let history = [];
    const OP_LABEL = { "+": "+", "-": "−", "*": "×", "/": "÷" };
    function won() {
      const xp = UP.awardXP("twentyfour", 50, { gems: 1 });
      finish(stage, "Exactly 24", "You combined every number into 24.", xp, () => UP.GAMES.twentyfour(root, meta, false));
    }
    function clickTile(id) {
      if (pick == null || !op) {
        pick = pick === id ? null : id;
        draw();
        return;
      }
      if (pick === id) {
        pick = null;
        draw();
        return;
      }
      const A = tiles.find((t) => t.id === pick);
      const B = tiles.find((t) => t.id === id);
      const v = apply24(A.n, op, B.n);
      if (v == null || !Number.isFinite(v)) return UP.toast("Can't divide by zero");
      history.push(tiles.map((t) => ({ id: t.id, n: t.n })));
      tiles = tiles.filter((t) => t.id !== A.id && t.id !== B.id);
      tiles.push({ id: nextId++, n: v });
      pick = null;
      op = null;
      if (tiles.length === 1) {
        draw();
        if (Math.abs(tiles[0].n - 24) < 1e-6) return won();
        UP.toast("That's " + fmt24(tiles[0].n) + " — not 24. Undo and try again.");
        return;
      }
      draw();
    }
    function draw() {
      const hint = !pick ? "Tap a number, then an operator, then another number" : op ? "Tap the second number" : "Tap +, −, × or ÷";
      stage.innerHTML = `
        <div class="tf24">
          <div class="tf24-goal" aria-label="Target 24">24</div>
          <p class="tf24-hint">${hint}</p>
          <div class="tf24-tiles">
            ${tiles
              .map(
                (t) => `<button class="${pick === t.id ? "on" : ""}" data-id="${t.id}">${fmt24(t.n)}</button>`
              )
              .join("")}
          </div>
          <div class="tf24-ops">
            ${["+", "-", "*", "/"]
              .map((o) => `<button class="${op === o ? "on" : ""}" data-op="${o}">${OP_LABEL[o]}</button>`)
              .join("")}
          </div>
          <div class="tf24-actions">
            <button class="ghost" id="undo24" ${history.length ? "" : "disabled"}>Undo</button>
            <button class="ghost" id="reset24">Reset</button>
          </div>
        </div>`;
      stage.querySelectorAll(".tf24-tiles button").forEach((b) => {
        b.onclick = () => clickTile(+b.dataset.id);
      });
      stage.querySelectorAll(".tf24-ops button").forEach((b) => {
        b.onclick = () => {
          if (pick == null) return UP.toast("Pick a number first");
          op = op === b.dataset.op ? null : b.dataset.op;
          draw();
        };
      });
      stage.querySelector("#undo24").onclick = () => {
        if (!history.length) return;
        tiles = history.pop();
        pick = null;
        op = null;
        draw();
      };
      stage.querySelector("#reset24").onclick = () => {
        tiles = nums.map((n, i) => ({ id: i, n }));
        nextId = nums.length;
        pick = null;
        op = null;
        history = [];
        draw();
      };
    }
    draw();
  });

  /* ---------- Colour Clash ---------- */
  const COLS = [
    { name: "RED", css: "#e85d4c" },
    { name: "BLUE", css: "#3d7ea6" },
    { name: "GREEN", css: "#2a9d8f" },
    { name: "YELLOW", css: "#e4b84a" },
  ];
  UP.register("colourclash", function (root, meta, daily) {
    const stage = shell(root, meta, daily, "");
    const rng = rngFor(daily, 11);
    const total = 12;
    let i = 0, score = 0, t0 = Date.now();
    function nextInkWord() {
      let w = UP.pick(COLS, rng);
      let ink = UP.pick(COLS, rng);
      if (rng() < 0.75) while (ink.name === w.name) ink = UP.pick(COLS, rng);
      return { w, ink };
    }
    let cur = nextInkWord();
    function draw() {
      if (i >= total) {
        const sec = ((Date.now() - t0) / 1000).toFixed(1);
        const xp = UP.awardXP("colourclash", score * 8 + (score === total ? 20 : 0), { best: score });
        finish(stage, "Focus check", `${score}/${total} in ${sec}s`, xp, () => UP.GAMES.colourclash(root, meta, false));
        return;
      }
      stage.innerHTML = `<div class="bar"><span class="meta">${i + 1} / ${total} · tap the INK colour</span></div>
        <div class="stroop-word" style="color:${cur.ink.css}">${cur.w.name}</div>
        <div class="color-btns">${COLS.map((c) => `<button style="background:${c.css}" data-n="${c.name}">${c.name}</button>`).join("")}</div>`;
      stage.querySelectorAll("[data-n]").forEach((b) => {
        b.onclick = () => {
          if (b.dataset.n === cur.ink.name) score++;
          i++;
          cur = nextInkWord();
          draw();
        };
      });
    }
    draw();
  });

  /* ---------- Flags & Capitals ---------- */
  UP.register("capitals", function (root, meta, daily) {
    const stage = shell(root, meta, daily, "");
    const rng = rngFor(daily, 21);
    const qs = UP.shuffle(UP.CAPITALS, rng).slice(0, 8);
    let i = 0, score = 0, left = 20, timer;
    function options(item) {
      const others = UP.shuffle(UP.CAPITALS.filter((x) => x.country !== item.country), rng).slice(0, 3);
      return UP.shuffle([item, ...others], rng);
    }
    function tick() {
      left--;
      const el = stage.querySelector(".timer");
      if (el) el.textContent = left + "s";
      if (left <= 0) end();
    }
    function end() {
      clearInterval(timer);
      const xp = UP.awardXP("capitals", score * 10 + 5, { best: score });
      finish(stage, "Time!", `${score} / ${qs.length} capitals`, xp, () => UP.GAMES.capitals(root, meta, false));
    }
    function draw() {
      if (i >= qs.length) {
        clearInterval(timer);
        const xp = UP.awardXP("capitals", score * 12 + 10, { best: score, gems: score === qs.length ? 2 : 0 });
        finish(stage, "Map master", `${score} / ${qs.length} correct`, xp, () => UP.GAMES.capitals(root, meta, false));
        return;
      }
      const item = qs[i];
      const opts = options(item);
      stage.innerHTML = `<div class="bar"><span class="meta">${i + 1} / ${qs.length}</span><span class="timer">${left}s</span></div>
        <div class="flag">${item.flag}</div>
        <p class="prompt" style="font-size:22px">Capital of ${item.country}?</p>
        <div class="choices">${opts.map((o) => `<button class="choice" data-c="${o.capital}">${o.capital}</button>`).join("")}</div>`;
      stage.querySelectorAll(".choice").forEach((b) => {
        b.onclick = () => {
          if (b.dataset.c === item.capital) score++;
          i++;
          draw();
        };
      });
    }
    timer = setInterval(tick, 1000);
    UP._cleanup = () => clearInterval(timer);
    draw();
  });

  /* ---------- GK Quiz ---------- */
  UP.register("gkquiz", function (root, meta, daily) {
    const stage = shell(root, meta, daily, "");
    const rng = rngFor(daily, 31);
    const qs = UP.shuffle(UP.GK, rng).slice(0, 5);
    let i = 0, score = 0;
    function draw() {
      if (i >= qs.length) {
        const xp = UP.awardXP("gkquiz", score * 16 + 8, { best: score, gems: score === 5 ? 2 : 0 });
        finish(stage, "Quiz complete", `${score} / 5 correct`, xp, () => UP.GAMES.gkquiz(root, meta, false));
        return;
      }
      const q = qs[i];
      stage.innerHTML = `<div class="bar"><span class="meta">Question ${i + 1} of 5</span></div>
        <p class="prompt" style="font-size:22px">${q.q}</p>
        <div class="choices">${q.options.map((o, idx) => `<button class="choice" data-i="${idx}">${o}</button>`).join("")}</div>`;
      stage.querySelectorAll(".choice").forEach((b) => {
        b.onclick = () => {
          const idx = +b.dataset.i;
          if (idx === q.a) {
            score++;
            b.classList.add("good");
          } else {
            b.classList.add("bad");
            stage.querySelectorAll(".choice")[q.a].classList.add("good");
          }
          setTimeout(() => {
            i++;
            draw();
          }, 700);
        };
      });
    }
    draw();
  });

  /* ---------- Higher or Lower ---------- */
  UP.register("higherlower", function (root, meta, daily) {
    const stage = shell(root, meta, daily, "");
    const rng = rngFor(daily, 41);
    const deck = UP.shuffle(UP.HIGHERLOWER, rng);
    let i = 0, streak = 0;
    function fmt(v) {
      return v >= 1e6 ? v.toLocaleString("en-IN") : String(v);
    }
    function draw(reveal) {
      const a = deck[i], b = deck[i + 1];
      if (!b) {
        const xp = UP.awardXP("higherlower", 12 * streak + 10, { best: streak, gems: streak >= 8 ? 2 : 0 });
        finish(stage, "Deck complete", `Streak ${streak}`, xp, () => UP.GAMES.higherlower(root, meta, false));
        return;
      }
      stage.innerHTML = `<div class="bar"><span class="meta">Streak ${streak}</span></div>
        <div class="hl-pair">
          <div class="hl-card"><b>${a.name}</b><div class="val">${fmt(a.value)}</div><span>${a.unit}</span></div>
          <div class="vs">VS</div>
          <div class="hl-card"><b>${b.name}</b><div class="val">${reveal ? fmt(b.value) : "?"}</div><span>${b.unit}</span></div>
        </div>
        <div class="ops" style="margin-top:14px">
          <button class="primary" data-h="h">Higher ▲</button>
          <button class="danger" data-h="l">Lower ▼</button>
        </div>`;
      stage.querySelectorAll("[data-h]").forEach((btn) => {
        btn.onclick = () => {
          const higher = b.value >= a.value;
          const ok = btn.dataset.h === "h" ? higher : !higher;
          if (ok) {
            streak++;
            i++;
            draw();
          } else {
            const xp = UP.awardXP("higherlower", Math.max(6, streak * 10), { best: streak });
            finish(stage, "Streak snapped", `${b.name} is ${fmt(b.value)} ${b.unit}. Streak ${streak}.`, xp, () => UP.GAMES.higherlower(root, meta, false));
          }
        };
      });
    }
    draw();
  });

  /* ---------- Math Sprint ---------- */
  function makeMath(rng) {
    const ops = ["+", "-", "×"];
    const op = UP.pick(ops, rng);
    let a, b, ans;
    if (op === "+") {
      a = 2 + ((rng() * 40) | 0);
      b = 2 + ((rng() * 40) | 0);
      ans = a + b;
    } else if (op === "-") {
      a = 10 + ((rng() * 40) | 0);
      b = 1 + ((rng() * a) | 0);
      ans = a - b;
    } else {
      a = 2 + ((rng() * 12) | 0);
      b = 2 + ((rng() * 12) | 0);
      ans = a * b;
    }
    return { text: `${a} ${op} ${b}`, ans };
  }
  UP.register("mathsprint", function (root, meta, daily) {
    const stage = shell(root, meta, daily, "");
    const rng = rngFor(daily, 51);
    const qs = Array.from({ length: 10 }, () => makeMath(rng));
    let i = 0, score = 0, left = 45, timer;
    function tick() {
      left--;
      const el = stage.querySelector(".timer");
      if (el) el.textContent = left + "s";
      if (left <= 0) done();
    }
    function done() {
      clearInterval(timer);
      const xp = UP.awardXP("mathsprint", score * 9 + 5, { best: score });
      finish(stage, "Sprint over", `${score} / 10 correct`, xp, () => UP.GAMES.mathsprint(root, meta, false));
    }
    function draw() {
      if (i >= qs.length) return done();
      const q = qs[i];
      stage.innerHTML = `<div class="bar"><span class="meta">${i + 1} / 10</span><span class="timer">${left}s</span></div>
        <p class="prompt">${q.text}</p>
        <div class="guess-row">
          <input id="g" type="number" inputmode="numeric" placeholder="Answer" />
          <button class="primary" id="go">Go</button>
        </div>`;
      const inp = stage.querySelector("#g");
      inp.focus();
      const go = () => {
        if (+inp.value === q.ans) score++;
        i++;
        draw();
      };
      stage.querySelector("#go").onclick = go;
      inp.onkeydown = (e) => {
        if (e.key === "Enter") go();
      };
    }
    timer = setInterval(tick, 1000);
    UP._cleanup = () => clearInterval(timer);
    draw();
  });

  /* ---------- Number Sequence ---------- */
  UP.register("sequence", function (root, meta, daily) {
    const stage = shell(root, meta, daily, "");
    const rng = rngFor(daily, 61);
    const qs = UP.shuffle(UP.SEQUENCES, rng).slice(0, 6);
    let i = 0, score = 0;
    function draw() {
      if (i >= qs.length) {
        const xp = UP.awardXP("sequence", score * 12 + 8, { best: score });
        finish(stage, "Patterns spotted", `${score} / ${qs.length}`, xp, () => UP.GAMES.sequence(root, meta, false));
        return;
      }
      const q = qs[i];
      stage.innerHTML = `<div class="bar"><span class="meta">${i + 1} / ${qs.length}</span></div>
        <p class="prompt">${q.seq.join(" , ")} , ?</p>
        <div class="choices">${q.options.map((o) => `<button class="choice" data-v="${o}">${o}</button>`).join("")}</div>`;
      stage.querySelectorAll(".choice").forEach((b) => {
        b.onclick = () => {
          const ok = +b.dataset.v === q.a;
          if (ok) {
            score++;
            b.classList.add("good");
          } else {
            b.classList.add("bad");
            UP.toast("Rule: " + q.rule);
          }
          setTimeout(() => {
            i++;
            draw();
          }, 700);
        };
      });
    }
    draw();
  });

  /* ---------- True / False ---------- */
  UP.register("truefalse", function (root, meta, daily) {
    const stage = shell(root, meta, daily, "");
    const rng = rngFor(daily, 71);
    const qs = UP.shuffle(UP.TRUEFALSE, rng).slice(0, 12);
    let i = 0, score = 0, left = 40, timer;
    function tick() {
      left--;
      const el = stage.querySelector(".timer");
      if (el) el.textContent = left + "s";
      if (left <= 0) done();
    }
    function done() {
      clearInterval(timer);
      const xp = UP.awardXP("truefalse", score * 7 + 6, { best: score });
      finish(stage, "That's a wrap", `${score} / 12 true-or-false`, xp, () => UP.GAMES.truefalse(root, meta, false));
    }
    function draw() {
      if (i >= qs.length) return done();
      const q = qs[i];
      stage.innerHTML = `<div class="bar"><span class="meta">${i + 1} / 12</span><span class="timer">${left}s</span></div>
        <p class="prompt" style="font-size:22px">${q.s}</p>
        <div class="ops">
          <button class="primary" data-a="1">True ✓</button>
          <button class="danger" data-a="0">False ✕</button>
        </div>`;
      stage.querySelectorAll("[data-a]").forEach((b) => {
        b.onclick = () => {
          const ans = b.dataset.a === "1";
          if (ans === q.a) score++;
          i++;
          draw();
        };
      });
    }
    timer = setInterval(tick, 1000);
    UP._cleanup = () => clearInterval(timer);
    draw();
  });

  /* ---------- Periodic memory ---------- */
  UP.register("memory", function (root, meta, daily) {
    const stage = shell(root, meta, daily, "");
    const rng = rngFor(daily, 81);
    const pairs = UP.shuffle(UP.ELEMENTS, rng).slice(0, 8);
    const cards = UP.shuffle(
      pairs.flatMap((el, i) => [
        { id: i, text: el[0], sub: "symbol" },
        { id: i, text: el[1], sub: "Z=" + el[2] },
      ]),
      rng
    );
    const open = [];
    const gone = new Set();
    let locked = false, moves = 0;
    function draw() {
      stage.innerHTML = `<div class="bar"><span class="meta">${gone.size / 2} / 8 pairs · ${moves} flips</span></div>
        <div class="mem" id="mem"></div>`;
      const mem = stage.querySelector("#mem");
      cards.forEach((card, idx) => {
        const b = document.createElement("button");
        if (gone.has(idx)) b.className = "gone";
        else if (open.includes(idx)) {
          b.className = "open";
          b.innerHTML = `${card.text}<br><small>${card.sub}</small>`;
        } else b.textContent = "?";
        b.onclick = () => {
          if (locked || gone.has(idx) || open.includes(idx)) return;
          open.push(idx);
          if (open.length === 2) {
            moves++;
            const [x, y] = open;
            if (cards[x].id === cards[y].id) {
              gone.add(x);
              gone.add(y);
              open.length = 0;
              if (gone.size === cards.length) {
                const xp = UP.awardXP("memory", Math.max(20, 80 - moves * 2), { gems: 1 });
                finish(stage, "All matched", `${moves} moves`, xp, () => UP.GAMES.memory(root, meta, false));
                return;
              }
            } else {
              locked = true;
              setTimeout(() => {
                open.length = 0;
                locked = false;
                draw();
              }, 800);
            }
          }
          draw();
        };
        mem.appendChild(b);
      });
    }
    draw();
  });

  /* ---------- Mirror Image ---------- */
  const PAL = ["#e85d4c", "#2a9d8f", "#1e3d59", "#e4b84a", "#6d5cae"];
  function figSvg(cells, flip) {
    const size = 90;
    const cell = 28;
    const gap = 3;
    let rects = "";
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++) {
        const srcC = flip ? 2 - c : c;
        const v = cells[r * 3 + srcC];
        if (v < 0) continue;
        const x = 4 + c * (cell + gap);
        const y = 4 + r * (cell + gap);
        rects += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="6" fill="${PAL[v % PAL.length]}"/>`;
      }
    return `<svg width="${size}" height="${size}" viewBox="0 0 90 90">${rects}</svg>`;
  }
  function rotate90(cells) {
    const n = [cells[6], cells[3], cells[0], cells[7], cells[4], cells[1], cells[8], cells[5], cells[2]];
    return n;
  }
  function mirrorV(cells) {
    return [cells[6], cells[7], cells[8], cells[3], cells[4], cells[5], cells[0], cells[1], cells[2]];
  }
  UP.register("mirror", function (root, meta, daily) {
    const stage = shell(root, meta, daily, "");
    const rng = rngFor(daily, 91);
    const total = 6;
    let i = 0, score = 0;
    function makeFig() {
      let cells;
      for (let t = 0; t < 30; t++) {
        cells = Array.from({ length: 9 }, () => (rng() > 0.45 ? (rng() * 5) | 0 : -1));
        const mh = [];
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) mh.push(cells[r * 3 + (2 - c)]);
        if (mh.some((v, idx) => v !== cells[idx]) && cells.filter((v) => v >= 0).length >= 4) return cells;
      }
      return cells;
    }
    function draw() {
      if (i >= total) {
        const xp = UP.awardXP("mirror", score * 12 + 8, { best: score });
        finish(stage, "Reasoning round", `${score} / ${total} mirrors`, xp, () => UP.GAMES.mirror(root, meta, false));
        return;
      }
      const fig = makeFig();
      const correct = fig;
      const opts = UP.shuffle(
        [
          { id: 0, html: figSvg(correct, true) },
          { id: 1, html: figSvg(fig, false) },
          { id: 2, html: figSvg(rotate90(fig), false) },
          { id: 3, html: figSvg(mirrorV(fig), false) },
        ],
        rng
      );
      stage.innerHTML = `<div class="bar"><span class="meta">${i + 1} / ${total} · pick the LEFT–RIGHT mirror</span></div>
        <div class="mirror-fig">${figSvg(fig, false)}</div>
        <div class="mopts">${opts.map((o, idx) => `<button class="opt" data-i="${idx}">${o.html}</button>`).join("")}</div>`;
      stage.querySelectorAll(".opt").forEach((b) => {
        b.onclick = () => {
          const idx = +b.dataset.i;
          if (opts[idx].id === 0) {
            score++;
            b.classList.add("good");
          } else {
            b.classList.add("bad");
            opts.forEach((o, k) => {
              if (o.id === 0) stage.querySelectorAll(".opt")[k].classList.add("good");
            });
          }
          setTimeout(() => {
            i++;
            draw();
          }, 700);
        };
      });
    }
    draw();
  });
})();

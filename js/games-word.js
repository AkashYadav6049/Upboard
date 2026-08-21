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
  function rngFor(daily) {
    return UP.mulberry(daily ? UP.dailySeed() * 17 + 3 : (Math.random() * 1e9) | 0);
  }
  function finish(stage, title, body, xp, again) {
    stage.innerHTML = UP.resultHTML(title, body, xp);
    UP.bindNav(stage, again);
  }
  const RIGHT_WAIT = 1700;
  function afterRight(fn) {
    const t = setTimeout(fn, RIGHT_WAIT);
    const prev = UP._cleanup;
    UP._cleanup = () => {
      clearTimeout(t);
      if (typeof prev === "function") prev();
    };
  }
  function freeze(root) {
    root.querySelectorAll("button, input").forEach((el) => {
      el.disabled = true;
    });
  }

  /* ---------- Connections ---------- */
  UP.register("connections", function (root, meta, daily) {
    const stage = shell(root, meta, daily, "");
    const rng = rngFor(daily);
    const puz = UP.CONNECTIONS[(daily ? UP.dailySeed() : (rng() * 99) | 0) % UP.CONNECTIONS.length];
    const groups = puz.groups;
    const lookup = {};
    groups.forEach((g, i) => g.words.forEach((w) => (lookup[w] = i)));
    let tiles = UP.shuffle(groups.flatMap((g) => g.words), rng);
    const solved = [];
    let pick = [];
    let lives = 4;
    function draw() {
      stage.innerHTML = `<div class="bar"><span class="meta">${lives} mistake${lives === 1 ? "" : "s"} left</span></div>
        <div id="solved"></div>
        <div class="conn-grid" id="cg"></div>
        <button class="primary wide" id="submit" ${pick.length !== 4 ? "disabled" : ""}>Submit</button>
        <button class="ghost wide" id="desel">Deselect</button>`;
      const box = stage.querySelector("#solved");
      solved.forEach((gi) => {
        const g = groups[gi];
        box.innerHTML += `<div class="solved" style="background:${g.color}"><span class="sub">${g.name}</span>${g.words.join(" · ")}</div>`;
      });
      const cg = stage.querySelector("#cg");
      tiles.forEach((w) => {
        const b = document.createElement("button");
        b.textContent = w;
        if (pick.includes(w)) b.classList.add("on");
        b.onclick = () => {
          if (pick.includes(w)) pick = pick.filter((x) => x !== w);
          else if (pick.length < 4) pick.push(w);
          draw();
        };
        cg.appendChild(b);
      });
      stage.querySelector("#desel").onclick = () => {
        pick = [];
        draw();
      };
      stage.querySelector("#submit").onclick = () => {
        const ids = pick.map((w) => lookup[w]);
        if (ids.every((x) => x === ids[0])) {
          freeze(stage);
          stage.querySelectorAll(".conn-grid button.on").forEach((b) => b.classList.add("good"));
          afterRight(() => {
            solved.push(ids[0]);
            tiles = tiles.filter((w) => !pick.includes(w));
            pick = [];
            if (solved.length === 4) {
              const xp = UP.awardXP("connections", 40 + lives * 15, { gems: lives >= 3 ? 2 : 0 });
              finish(stage, "Connected!", `You found every group${lives < 4 ? "" : " with lives to spare"}.`, xp, () => UP.GAMES.connections(root, meta, false));
              return;
            }
            draw();
          });
        } else {
          lives--;
          UP.toast("One away? Not quite.");
          pick = [];
          if (lives <= 0) {
            const xp = UP.awardXP("connections", 10);
            finish(stage, "Out of tries", groups.map((g) => `${g.name}: ${g.words.join(", ")}`).join("<br>"), xp, () => UP.GAMES.connections(root, meta, false));
            return;
          }
          draw();
        }
      };
    }
    draw();
  });

  /* ---------- Rebus ---------- */
  UP.register("rebus", function (root, meta, daily) {
    const stage = shell(root, meta, daily, "");
    const rng = rngFor(daily);
    const items = daily ? UP.shuffle(UP.REBUS, rng).slice(0, 5) : UP.shuffle(UP.REBUS, rng).slice(0, 5);
    let i = 0, score = 0;
    function ok(guess, item) {
      const g = UP.norm(guess).replace(/\s/g, "");
      const answers = [item.answer, ...(item.alts || [])].map((a) => UP.norm(a).replace(/\s/g, ""));
      return answers.includes(g);
    }
    function draw() {
      if (i >= items.length) {
        const xp = UP.awardXP("rebus", 12 * score + 8, { best: score });
        finish(stage, "Rebus round over", `${score} / ${items.length} decoded`, xp, () => UP.GAMES.rebus(root, meta, false));
        return;
      }
      const it = items[i];
      stage.innerHTML = `<div class="bar"><span class="meta">${i + 1} / ${items.length} · ${it.hint}</span></div>
        <div class="emoji">${it.emojis}</div>
        <div class="guess-row">
          <input id="g" placeholder="Your guess" autocomplete="off" />
          <button class="primary" id="go">Guess</button>
        </div>`;
      const inp = stage.querySelector("#g");
      inp.focus();
      const go = () => {
        if (inp.disabled) return;
        freeze(stage);
        if (ok(inp.value, it)) {
          score++;
          inp.classList.add("good");
          stage.querySelector("#go").classList.add("good");
        } else {
          inp.classList.add("bad");
          inp.value = it.answer;
        }
        afterRight(() => {
          i++;
          draw();
        });
      };
      stage.querySelector("#go").onclick = go;
      inp.onkeydown = (e) => {
        if (e.key === "Enter") go();
      };
    }
    draw();
  });

  /* ---------- Keyword ---------- */
  UP.register("keyword", function (root, meta, daily) {
    const stage = shell(root, meta, daily, "");
    const rng = rngFor(daily);
    const item = UP.pick(UP.KEYWORDS, rng);
    let tries = 3;
    function match(g) {
      const n = UP.norm(g);
      return n === UP.norm(item.answer) || (item.alts || []).some((a) => UP.norm(a) === n);
    }
    function draw(msg) {
      stage.innerHTML = `<div class="bar"><span class="meta">${tries} ${tries === 1 ? "try" : "tries"} left</span></div>
        <p class="prompt" style="font-size:18px;display:flex;flex-wrap:wrap;gap:8px;justify-content:center">
          ${item.words.map((w) => `<span class="pill">${w}</span>`).join("")}
        </p>
        <div class="guess-row">
          <input id="g" placeholder="The hidden keyword" autocomplete="off" />
          <button class="primary" id="go">Guess</button>
        </div>
        ${msg ? `<p style="text-align:center;margin-top:10px;color:var(--muted)">${msg}</p>` : ""}`;
      const inp = stage.querySelector("#g");
      inp.focus();
      const go = () => {
        if (inp.disabled) return;
        freeze(stage);
        if (match(inp.value)) {
          inp.classList.add("good");
          stage.querySelector("#go").classList.add("good");
          afterRight(() => {
            const xp = UP.awardXP("keyword", 20 + tries * 12, { gems: tries === 3 ? 1 : 0 });
            finish(stage, "Keyword found", `The link was <b>${item.answer}</b>.`, xp, () => UP.GAMES.keyword(root, meta, false));
          });
          return;
        }
        inp.classList.add("bad");
        tries--;
        afterRight(() => {
          if (tries <= 0) {
            const xp = UP.awardXP("keyword", 6);
            finish(stage, "Not this time", `The keyword was <b>${item.answer}</b>.`, xp, () => UP.GAMES.keyword(root, meta, false));
            return;
          }
          draw("Warm-up: think of the category they share.");
        });
      };
      stage.querySelector("#go").onclick = go;
      inp.onkeydown = (e) => {
        if (e.key === "Enter") go();
      };
    }
    draw();
  });

  /* ---------- Word Guess ---------- */
  UP.register("wordguess", function (root, meta, daily) {
    const stage = shell(root, meta, daily, "");
    const rng = rngFor(daily);
    const answer = daily ? UP.WORDS5[UP.dailySeed() % UP.WORDS5.length] : UP.pick(UP.WORDS5, rng);
    const rows = Array.from({ length: 6 }, () => ["", "", "", "", ""]);
    const colors = Array.from({ length: 6 }, () => ["", "", "", "", ""]);
    let r = 0, c = 0, locked = false;
    const keyState = {};
    const KB = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
    function scoreGuess(guess) {
      const res = Array(5).fill("absent");
      const ans = answer.split("");
      const used = Array(5).fill(false);
      for (let i = 0; i < 5; i++) {
        if (guess[i] === ans[i]) {
          res[i] = "correct";
          used[i] = true;
        }
      }
      for (let i = 0; i < 5; i++) {
        if (res[i] === "correct") continue;
        const j = ans.findIndex((ch, k) => !used[k] && ch === guess[i]);
        if (j >= 0) {
          res[i] = "present";
          used[j] = true;
        }
      }
      return res;
    }
    function draw() {
      const grid = rows
        .map(
          (row, ri) =>
            `<div class="wordle-row">${row
              .map((ch, ci) => `<div class="tile ${colors[ri][ci] || (ch ? "filled" : "")}">${ch}</div>`)
              .join("")}</div>`
        )
        .join("");
      stage.innerHTML = `<div class="bar"><span class="meta">${daily ? "Same word for everyone today" : "Practice word"}</span></div>
        <div class="wordle">${grid}</div>
        <div class="kb" id="kb"></div>`;
      const kb = stage.querySelector("#kb");
      KB.forEach((line, li) => {
        const row = document.createElement("div");
        row.className = "kb-row";
        if (li === 2) {
          const ent = document.createElement("button");
          ent.className = "widek";
          ent.textContent = "Enter";
          ent.onclick = submit;
          row.appendChild(ent);
        }
        [...line].forEach((ch) => {
          const b = document.createElement("button");
          b.textContent = ch;
          if (keyState[ch]) b.classList.add(keyState[ch]);
          b.onclick = () => type(ch);
          row.appendChild(b);
        });
        if (li === 2) {
          const del = document.createElement("button");
          del.className = "widek";
          del.textContent = "⌫";
          del.onclick = back;
          row.appendChild(del);
        }
        kb.appendChild(row);
      });
    }
    function type(ch) {
      if (locked || r >= 6) return;
      if (c < 5) {
        rows[r][c] = ch;
        c++;
        draw();
      }
    }
    function back() {
      if (locked) return;
      if (c > 0) {
        c--;
        rows[r][c] = "";
        draw();
      }
    }
    function submit() {
      if (locked) return;
      if (c < 5) return UP.toast("Need 5 letters");
      const guess = rows[r].join("");
      if (!UP.WORDS5.includes(guess)) return UP.toast("Not in word list");
      const res = scoreGuess(guess);
      colors[r] = res;
      res.forEach((st, i) => {
        const ch = guess[i];
        const rank = { correct: 3, present: 2, absent: 1 };
        if (!keyState[ch] || rank[st] > rank[keyState[ch]]) keyState[ch] = st;
      });
      if (guess === answer) {
        locked = true;
        draw();
        afterRight(() => {
          const xp = UP.awardXP("wordguess", 90 - r * 10, { gems: r === 0 ? 5 : 1, best: 6 - r });
          finish(stage, "Nice!", `Got it in ${r + 1} ${r === 0 ? "try" : "tries"}.`, xp, () => UP.GAMES.wordguess(root, meta, false));
        });
        return;
      }
      r++;
      c = 0;
      if (r >= 6) {
        locked = true;
        draw();
        afterRight(() => {
          const xp = UP.awardXP("wordguess", 8);
          finish(stage, "The word was " + answer.toUpperCase(), "Six tries gone — next round?", xp, () => UP.GAMES.wordguess(root, meta, false));
        });
        return;
      }
      draw();
    }
    draw();
    const onKey = (e) => {
      if (e.key === "Enter") submit();
      else if (e.key === "Backspace") back();
      else if (/^[a-zA-Z]$/.test(e.key)) type(e.key.toLowerCase());
    };
    document.addEventListener("keydown", onKey);
    UP._cleanup = () => document.removeEventListener("keydown", onKey);
  });

  /* ---------- Spelling Bee ---------- */
  function beeValid(word, center, letters) {
    const set = new Set((center + letters.join("")).toLowerCase());
    const w = word.toLowerCase();
    if (w.length < 4) return false;
    if (!w.includes(center.toLowerCase())) return false;
    return [...w].every((ch) => set.has(ch));
  }
  UP.register("spellingbee", function (root, meta, daily) {
    const stage = shell(root, meta, daily, "");
    const puz = UP.BEE[(daily ? UP.dailySeed() : Date.now()) % UP.BEE.length];
    const answers = [...new Set(puz.words.map((w) => w.toLowerCase()).filter((w) => beeValid(w, puz.center, puz.letters)))];
    const found = [];
    let typed = "";
    let outer = puz.letters.slice();
    let flash = "";
    let beeLock = false;
    const hexPos = [
      [91, 8],
      [160, 48],
      [160, 124],
      [91, 164],
      [22, 124],
      [22, 48],
    ];
    function pangram(w) {
      const need = new Set((puz.center + puz.letters.join("")).toLowerCase());
      return [...need].every((ch) => w.includes(ch));
    }
    function draw() {
      const score = found.reduce((s, w) => s + (w.length === 4 ? 1 : w.length) + (pangram(w) ? 7 : 0), 0);
      stage.innerHTML = `<div class="bar"><span class="meta">${found.length} / ${answers.length} words · ${score} pts</span></div>
        <div class="hive" id="hive"></div>
        <p class="prompt${flash ? " good" : ""}" style="font-size:22px;min-height:32px">${flash || typed || " "}</p>
        <div class="ops">
          <button id="del">Delete</button>
          <button id="shuffle">Shuffle</button>
          <button id="enter">Enter</button>
        </div>
        <div class="found-list">${found.map((w, fi) => `<span class="${flash && fi === found.length - 1 ? "fresh" : ""}">${w}</span>`).join("")}</div>`;
      const hive = stage.querySelector("#hive");
      const letters = outer;
      const mk = (ch, x, y, center) => {
        const b = document.createElement("button");
        b.className = "hex" + (center ? " center" : "");
        b.style.left = x + "px";
        b.style.top = y + "px";
        b.textContent = ch;
        b.onclick = () => {
          if (beeLock) return;
          typed += ch;
          draw();
        };
        hive.appendChild(b);
      };
      mk(puz.center, 91, 86, true);
      letters.forEach((ch, i) => mk(ch, hexPos[i][0], hexPos[i][1], false));
      stage.querySelector("#del").onclick = () => {
        typed = typed.slice(0, -1);
        draw();
      };
      stage.querySelector("#shuffle").onclick = () => {
        outer = UP.shuffle(puz.letters, Math.random);
        draw();
      };
      stage.querySelector("#enter").onclick = () => {
        if (beeLock) return;
        const w = typed.toLowerCase();
        typed = "";
        if (answers.includes(w) && !found.includes(w)) {
          found.push(w);
          flash = w;
          beeLock = true;
          draw();
          afterRight(() => {
            flash = "";
            beeLock = false;
            if (found.length === answers.length) {
              const xp = UP.awardXP("spellingbee", 80, { gems: 3 });
              finish(stage, "Queen Bee!", "You found every word.", xp, () => UP.GAMES.spellingbee(root, meta, false));
              return;
            }
            draw();
          });
          return;
        }
        if (found.includes(w)) UP.toast("Already found");
        else UP.toast("Not in the hive list");
        draw();
      };
    }
    draw();
  });

  /* ---------- Word Search ---------- */
  function genSearch(theme, rng) {
    const n = 10;
    const grid = Array.from({ length: n }, () => Array(n).fill(""));
    const placed = [];
    const dirs = [
      [0, 1],
      [1, 0],
      [1, 1],
      [0, -1],
      [1, -1],
    ];
    theme.words.forEach((word) => {
      for (let t = 0; t < 80; t++) {
        const [dr, dc] = dirs[(rng() * dirs.length) | 0];
        const r0 = (rng() * n) | 0;
        const c0 = (rng() * n) | 0;
        let ok = true;
        const cells = [];
        for (let i = 0; i < word.length; i++) {
          const r = r0 + dr * i, c = c0 + dc * i;
          if (r < 0 || c < 0 || r >= n || c >= n) {
            ok = false;
            break;
          }
          if (grid[r][c] && grid[r][c] !== word[i]) {
            ok = false;
            break;
          }
          cells.push([r, c]);
        }
        if (!ok) continue;
        cells.forEach(([r, c], i) => (grid[r][c] = word[i]));
        placed.push({ word, cells });
        return;
      }
    });
    const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++) if (!grid[r][c]) grid[r][c] = alpha[(rng() * 26) | 0];
    return { n, grid, placed, words: placed.map((p) => p.word) };
  }
  function sameLine(a, b) {
    const cells = [];
    const dr = Math.sign(b[0] - a[0]);
    const dc = Math.sign(b[1] - a[1]);
    if (!dr && !dc) return [a];
    if (dr && dc && Math.abs(b[0] - a[0]) !== Math.abs(b[1] - a[1])) return null;
    if (dr && !dc && b[1] !== a[1]) return null;
    if (dc && !dr && b[0] !== a[0]) return null;
    let r = a[0], c = a[1];
    cells.push([r, c]);
    while (r !== b[0] || c !== b[1]) {
      r += dr;
      c += dc;
      cells.push([r, c]);
    }
    return cells;
  }

  UP.register("wordsearch", function (root, meta, daily) {
    const stage = shell(root, meta, daily, "");
    const rng = rngFor(daily);
    const theme = UP.pick(UP.SEARCH_THEMES, rng);
    const board = genSearch(theme, rng);
    const found = new Set();
    const hit = new Set();
    let start = null;
    let hover = null;
    function endDrag() {
      if (!start || !hover) return;
      const line = sameLine(start, hover);
      start = hover = null;
      if (!line) return draw();
      const word = line.map(([r, c]) => board.grid[r][c]).join("");
      const rev = word.split("").reverse().join("");
      const match = board.placed.find((p) => p.word === word || p.word === rev);
      if (match && !found.has(match.word)) {
        found.add(match.word);
        match.cells.forEach(([r, c]) => hit.add(r + "," + c));
        if (found.size === board.words.length) {
          draw();
          afterRight(() => {
            const xp = UP.awardXP("wordsearch", 50, { gems: 1 });
            finish(stage, "All found", theme.title + " complete.", xp, () => UP.GAMES.wordsearch(root, meta, false));
          });
          return;
        }
      }
      draw();
    }
    UP._cleanup = () => {
      document.removeEventListener("mouseup", endDrag);
    };
    document.addEventListener("mouseup", endDrag);
    function paintSel() {
      const sel = new Set();
      if (start && hover) {
        const line = sameLine(start, hover);
        if (line) line.forEach(([r, c]) => sel.add(r + "," + c));
      }
      stage.querySelectorAll(".ws span").forEach((el) => {
        const k = el.dataset.r + "," + el.dataset.c;
        el.classList.toggle("sel", sel.has(k));
        el.classList.toggle("hit", hit.has(k));
      });
    }
    function draw() {
      stage.innerHTML = `<div class="bar"><span class="meta">${theme.title} · ${found.size} / ${board.words.length}</span></div>
        <div class="ws" id="ws" style="grid-template-columns:repeat(${board.n},28px)"></div>
        <div class="words-col">${board.words.map((w) => `<b class="${found.has(w) ? "done" : ""}">${w}</b>`).join("")}</div>`;
      const ws = stage.querySelector("#ws");
      for (let r = 0; r < board.n; r++)
        for (let c = 0; c < board.n; c++) {
          const s = document.createElement("span");
          s.textContent = board.grid[r][c];
          s.dataset.r = r;
          s.dataset.c = c;
          const k = r + "," + c;
          if (hit.has(k)) s.classList.add("hit");
          s.onmousedown = (e) => {
            e.preventDefault();
            start = [r, c];
            hover = [r, c];
            paintSel();
          };
          s.onmouseenter = () => {
            if (start) {
              hover = [r, c];
              paintSel();
            }
          };
          ws.appendChild(s);
        }
    }
    draw();
  });

  /* ---------- Synonyms ---------- */
  UP.register("synonyms", function (root, meta, daily) {
    const stage = shell(root, meta, daily, "");
    const rng = rngFor(daily);
    const qs = UP.shuffle(UP.SYNONYMS, rng).slice(0, 8);
    let i = 0, score = 0;
    function draw() {
      if (i >= qs.length) {
        const xp = UP.awardXP("synonyms", 10 * score + 8, { best: score });
        finish(stage, "Vocab round done", `${score} / ${qs.length} correct`, xp, () => UP.GAMES.synonyms(root, meta, false));
        return;
      }
      const q = qs[i];
      stage.innerHTML = `<div class="bar"><span class="meta">${i + 1} / ${qs.length}</span></div>
        <p class="prompt">${q.word}</p>
        <p style="text-align:center;margin-bottom:12px;color:var(--muted)">${q.type === "syn" ? "Pick the synonym" : "Pick the antonym"}</p>
        <div class="choices">${q.options.map((o, idx) => `<button class="choice" data-i="${idx}">${o}</button>`).join("")}</div>`;
      stage.querySelectorAll(".choice").forEach((b) => {
        b.onclick = () => {
          if (b.disabled) return;
          freeze(stage);
          const idx = +b.dataset.i;
          if (idx === q.a) {
            score++;
            b.classList.add("good");
          } else {
            b.classList.add("bad");
            stage.querySelectorAll(".choice")[q.a].classList.add("good");
          }
          afterRight(() => {
            i++;
            draw();
          });
        };
      });
    }
    draw();
  });
})();

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
    return UP.mulberry(daily ? UP.dailySeed() : (Math.random() * 1e9) | 0);
  }

  function finish(stage, title, body, xp, again) {
    stage.innerHTML = UP.resultHTML(title, body, xp);
    UP.bindNav(stage, again);
  }

  /* ---------- 2048 ---------- */
  UP.register("2048", function (root, meta, daily) {
    const stage = shell(root, meta, daily, "");
    const rng = rngFor(daily);
    let grid = Array.from({ length: 4 }, () => Array(4).fill(0));
    let score = 0;
    let won = false;
    let over = false;

    function empties() {
      const e = [];
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (!grid[r][c]) e.push([r, c]);
      return e;
    }
    function add() {
      const e = empties();
      if (!e.length) return;
      const [r, c] = e[Math.floor(rng() * e.length)];
      grid[r][c] = rng() < 0.9 ? 2 : 4;
    }
    function slide(row) {
      const arr = row.filter((v) => v);
      for (let i = 0; i < arr.length - 1; i++) {
        if (arr[i] === arr[i + 1]) {
          arr[i] *= 2;
          score += arr[i];
          arr[i + 1] = 0;
        }
      }
      const out = arr.filter((v) => v);
      while (out.length < 4) out.push(0);
      return out;
    }
    function rotate() {
      const n = Array.from({ length: 4 }, () => Array(4).fill(0));
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) n[c][3 - r] = grid[r][c];
      grid = n;
    }
    function move(dir) {
      if (over) return;
      const snap = JSON.stringify(grid);
      if (dir === "up") {
        rotate(); rotate(); rotate();
        grid = grid.map(slide);
        rotate();
      } else if (dir === "down") {
        rotate();
        grid = grid.map(slide);
        rotate(); rotate(); rotate();
      } else if (dir === "left") {
        grid = grid.map(slide);
      } else {
        grid = grid.map((row) => slide(row.reverse()).reverse());
      }
      if (JSON.stringify(grid) !== snap) {
        add();
        draw();
        if (grid.flat().includes(2048) && !won) {
          won = true;
          const xp = UP.awardXP("2048", 80 + Math.min(score / 20, 80), { best: score, gems: 3 });
          UP.toast("You reached 2048! +" + xp + " XP — keep going");
        }
        if (!empties().length && !canMove()) {
          over = true;
          const xp = UP.awardXP("2048", Math.min(40 + score / 40, 90), { best: score });
          setTimeout(() => finish(stage, "Game over", `Score ${score}`, xp, () => UP.GAMES["2048"](root, meta, false)), 400);
        }
      }
    }
    function canMove() {
      for (let r = 0; r < 4; r++)
        for (let c = 0; c < 4; c++) {
          const v = grid[r][c];
          if ((c < 3 && grid[r][c + 1] === v) || (r < 3 && grid[r + 1][c] === v)) return true;
        }
      return false;
    }
    function draw() {
      stage.innerHTML = `
        <div class="bar"><span class="meta">Score ${score}${daily ? " · daily board" : ""}</span>
          <button class="ghost" id="n2048">New</button></div>
        <div class="g2048" id="b2048"></div>
        <div class="pad">
          <span></span><button data-d="up">↑</button><span></span>
          <button data-d="left">←</button><button data-d="down">↓</button><button data-d="right">→</button>
        </div>
        <p class="meta" style="text-align:center;margin-top:10px;color:var(--muted)">Arrow keys or swipe</p>`;
      const b = stage.querySelector("#b2048");
      grid.flat().forEach((v) => {
        const d = document.createElement("div");
        d.className = "cell" + (v ? " t" + v : "");
        d.textContent = v || "";
        b.appendChild(d);
      });
      stage.querySelectorAll("[data-d]").forEach((btn) => (btn.onclick = () => move(btn.dataset.d)));
      stage.querySelector("#n2048").onclick = () => UP.GAMES["2048"](root, meta, false);
    }
    add();
    add();
    draw();
    const onKey = (e) => {
      const map = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
      if (map[e.key]) {
        e.preventDefault();
        move(map[e.key]);
      }
    };
    document.addEventListener("keydown", onKey);
    let sx, sy;
    const onStart = (e) => {
      const t = e.touches ? e.touches[0] : e;
      sx = t.clientX;
      sy = t.clientY;
    };
    const onEnd = (e) => {
      const t = e.changedTouches ? e.changedTouches[0] : e;
      const dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.hypot(dx, dy) < 24) return;
      if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? "right" : "left");
      else move(dy > 0 ? "down" : "up");
    };
    stage.addEventListener("touchstart", onStart, { passive: true });
    stage.addEventListener("touchend", onEnd);
    UP._cleanup = () => document.removeEventListener("keydown", onKey);
  });

  /* ---------- Sudoku 6×6 ---------- */
  function genSudoku(rng) {
    const g = Array.from({ length: 6 }, () => Array(6).fill(0));
    const ok = (r, c, v) => {
      for (let i = 0; i < 6; i++) if (g[r][i] === v || g[i][c] === v) return false;
      const br = Math.floor(r / 2) * 2, bc = Math.floor(c / 3) * 3;
      for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) if (g[br + i][bc + j] === v) return false;
      return true;
    };
    const fill = (pos) => {
      if (pos === 36) return true;
      const r = (pos / 6) | 0, c = pos % 6;
      for (const v of UP.shuffle([1, 2, 3, 4, 5, 6], rng)) {
        if (ok(r, c, v)) {
          g[r][c] = v;
          if (fill(pos + 1)) return true;
          g[r][c] = 0;
        }
      }
      return false;
    };
    fill(0);
    const puzzle = g.map((row) => row.slice());
    UP.shuffle([...Array(36).keys()], rng).slice(0, 16).forEach((p) => {
      puzzle[(p / 6) | 0][p % 6] = 0;
    });
    return { puzzle, solution: g };
  }

  UP.register("sudoku", function (root, meta, daily) {
    const stage = shell(root, meta, daily, "");
    const { puzzle, solution } = genSudoku(rngFor(daily));
    const val = puzzle.map((r) => r.slice());
    let sel = null;
    function draw() {
      stage.innerHTML = `<div class="bar"><span class="meta">${daily ? "Daily puzzle" : "Practice"} · 6×6</span>
        <button class="primary" id="check">Check</button></div>
        <div class="sudoku" id="sdk"></div>
        <div class="numpad">${[1,2,3,4,5,6].map((n) => `<button data-n="${n}">${n}</button>`).join("")}<button data-n="0">⌫</button></div>`;
      const sdk = stage.querySelector("#sdk");
      for (let r = 0; r < 6; r++)
        for (let c = 0; c < 6; c++) {
          const d = document.createElement("div");
          d.className = "s" + (puzzle[r][c] ? " fixed" : "") + (r === 1 || r === 3 ? " r" + (r + 1) : "");
          d.textContent = val[r][c] || "";
          d.onclick = () => {
            sel = [r, c];
            draw();
          };
          if (sel) {
            const [sr, sc] = sel;
            const sameBox = Math.floor(r / 2) === Math.floor(sr / 2) && Math.floor(c / 3) === Math.floor(sc / 3);
            if (r === sr && c === sc) d.classList.add("sel");
            else if (r === sr || c === sc || sameBox) d.classList.add("peer");
            if (val[r][c] && val[sr][sc] && val[r][c] === val[sr][sc] && !(r === sr && c === sc)) d.classList.add("same");
          }
          sdk.appendChild(d);
        }
      stage.querySelectorAll("[data-n]").forEach((b) => {
        b.onclick = () => {
          if (!sel) return UP.toast("Tap a square first");
          if (puzzle[sel[0]][sel[1]]) return UP.toast("That square is given");
          val[sel[0]][sel[1]] = +b.dataset.n;
          draw();
        };
      });
      stage.querySelector("#check").onclick = () => {
        let good = true;
        for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) if (val[r][c] !== solution[r][c]) good = false;
        if (!good) return UP.toast("Not quite — keep going");
        const xp = UP.awardXP("sudoku", daily ? 70 : 45, { gems: daily ? 2 : 0 });
        finish(stage, "Solved!", "Every row, column and box checks out.", xp, () => UP.GAMES.sudoku(root, meta, false));
      };
    }
    draw();
  });

  /* ---------- Nonogram ---------- */
  function clues(line) {
    const out = [];
    let n = 0;
    line.forEach((v) => {
      if (v) n++;
      else if (n) {
        out.push(n);
        n = 0;
      }
    });
    if (n) out.push(n);
    return out.length ? out : [0];
  }

  UP.register("nonogram", function (root, meta, daily) {
    const stage = shell(root, meta, daily, "");
    const rng = rngFor(daily);
    const puz = UP.pick(UP.NONOGRAMS, rng);
    const n = puz.grid.length;
    const rows = puz.grid.map(clues);
    const cols = [];
    for (let c = 0; c < n; c++) cols.push(clues(puz.grid.map((r) => r[c])));
    const mark = Array.from({ length: n }, () => Array(n).fill(0));
    let mode = 1;
    function draw() {
      const maxR = Math.max(...rows.map((x) => x.length));
      const maxC = Math.max(...cols.map((x) => x.length));
      let html = `<div class="bar"><span class="meta">${puz.name} · ${n}×${n}</span>
        <button class="ghost" id="mode">${mode === 1 ? "Fill" : "X mark"}</button></div>
        <div class="board-wrap"><table style="border-collapse:collapse;margin:0 auto">`;
      for (let cr = 0; cr < maxC; cr++) {
        html += "<tr>";
        for (let i = 0; i < maxR; i++) html += "<td></td>";
        for (let c = 0; c < n; c++) {
          const clue = cols[c][cols[c].length - maxC + cr];
          html += `<td style="text-align:center;font-size:11px;font-weight:800;color:var(--muted);height:16px">${clue || ""}</td>`;
        }
        html += "</tr>";
      }
      for (let r = 0; r < n; r++) {
        html += "<tr>";
        for (let i = 0; i < maxR; i++) {
          const clue = rows[r][rows[r].length - maxR + i];
          html += `<td style="text-align:right;padding:0 4px;font-size:11px;font-weight:800;color:var(--muted)">${clue || ""}</td>`;
        }
        for (let c = 0; c < n; c++) {
          const m = mark[r][c];
          html += `<td class="ng-cell ${m === 1 ? "fill" : m === 2 ? "mark" : ""}" data-r="${r}" data-c="${c}">${m === 2 ? "×" : ""}</td>`;
        }
        html += "</tr>";
      }
      html += `</table></div><button class="primary wide" id="check">Check picture</button>`;
      stage.innerHTML = html;
      stage.querySelector("#mode").onclick = () => {
        mode = mode === 1 ? 2 : 1;
        draw();
      };
      stage.querySelectorAll(".ng-cell").forEach((cell) => {
        cell.onclick = () => {
          const r = +cell.dataset.r, c = +cell.dataset.c;
          mark[r][c] = mark[r][c] === mode ? 0 : mode;
          draw();
        };
      });
      stage.querySelector("#check").onclick = () => {
        let good = true;
        for (let r = 0; r < n; r++)
          for (let c = 0; c < n; c++) if ((mark[r][c] === 1) !== !!puz.grid[r][c]) good = false;
        if (!good) return UP.toast("Clues aren’t satisfied yet");
        const xp = UP.awardXP("nonogram", 55, { gems: 1 });
        finish(stage, "Picture revealed", puz.name, xp, () => UP.GAMES.nonogram(root, meta, false));
      };
    }
    draw();
  });

  /* ---------- Pipes ---------- */
  const Nbit = 1, Ebit = 2, Sbit = 4, Wbit = 8;
  function rotMask(m) {
    let n = 0;
    if (m & Nbit) n |= Ebit;
    if (m & Ebit) n |= Sbit;
    if (m & Sbit) n |= Wbit;
    if (m & Wbit) n |= Nbit;
    return n;
  }
  function pipeGlyph(m) {
    const map = {
      0: "·",
      1: "╵",
      2: "╶",
      4: "╷",
      8: "╴",
      5: "│",
      10: "─",
      3: "└",
      6: "┌",
      12: "┐",
      9: "┘",
      7: "├",
      14: "┬",
      13: "┤",
      11: "┴",
      15: "┼",
    };
    return map[m] || "?";
  }
  function genPipes(n, rng) {
    const mask = Array.from({ length: n }, () => Array(n).fill(0));
    const seen = Array.from({ length: n }, () => Array(n).fill(false));
    const dirs = [
      [ -1, 0, Nbit, Sbit ],
      [ 0, 1, Ebit, Wbit ],
      [ 1, 0, Sbit, Nbit ],
      [ 0, -1, Wbit, Ebit ],
    ];
    function dfs(r, c) {
      seen[r][c] = true;
      for (const [dr, dc, bit, opp] of UP.shuffle(dirs, rng)) {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || cc < 0 || rr >= n || cc >= n || seen[rr][cc]) continue;
        mask[r][c] |= bit;
        mask[rr][cc] |= opp;
        dfs(rr, cc);
      }
    }
    dfs(0, 0);
    const shown = mask.map((row) => row.map((m) => {
      let x = m, k = (rng() * 4) | 0;
      while (k--) x = rotMask(x);
      return x;
    }));
    return { mask, shown, n };
  }
  function pipesSolved(shown) {
    const n = shown.length;
    const need = (r, c, bit, rr, cc, opp) => {
      const a = !!(shown[r][c] & bit);
      const b = rr >= 0 && cc >= 0 && rr < n && cc < n && !!(shown[rr][cc] & opp);
      return a === b;
    };
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++) {
        if ((shown[r][c] & Nbit) && r === 0) return false;
        if ((shown[r][c] & Sbit) && r === n - 1) return false;
        if ((shown[r][c] & Wbit) && c === 0) return false;
        if ((shown[r][c] & Ebit) && c === n - 1) return false;
        if (!need(r, c, Ebit, r, c + 1, Wbit)) return false;
        if (!need(r, c, Sbit, r + 1, c, Nbit)) return false;
      }
    const seen = Array.from({ length: n }, () => Array(n).fill(false));
    const q = [[0, 0]];
    seen[0][0] = true;
    while (q.length) {
      const [r, c] = q.pop();
      const m = shown[r][c];
      const nb = [
        [m & Nbit, r - 1, c],
        [m & Ebit, r, c + 1],
        [m & Sbit, r + 1, c],
        [m & Wbit, r, c - 1],
      ];
      for (const [ok, rr, cc] of nb) {
        if (!ok || rr < 0 || cc < 0 || rr >= n || cc >= n || seen[rr][cc]) continue;
        seen[rr][cc] = true;
        q.push([rr, cc]);
      }
    }
    return seen.every((row) => row.every(Boolean));
  }

  UP.register("pipes", function (root, meta, daily) {
    const stage = shell(root, meta, daily, "");
    const { shown, n } = genPipes(6, rngFor(daily));
    function draw() {
      stage.innerHTML = `<div class="bar"><span class="meta">Tap a tile to rotate</span></div>
        <div class="board-wrap"><div class="ng" style="grid-template-columns:repeat(${n},36px)" id="pg"></div></div>`;
      const pg = stage.querySelector("#pg");
      for (let r = 0; r < n; r++)
        for (let c = 0; c < n; c++) {
          const b = document.createElement("button");
          b.className = "p-cell";
          b.textContent = pipeGlyph(shown[r][c]);
          b.onclick = () => {
            shown[r][c] = rotMask(shown[r][c]);
            draw();
            if (pipesSolved(shown)) {
              const xp = UP.awardXP("pipes", 60, { gems: 1 });
              finish(stage, "All pipes connected", "The water can flow everywhere.", xp, () => UP.GAMES.pipes(root, meta, false));
            }
          };
          pg.appendChild(b);
        }
    }
    draw();
  });

  /* ---------- Queens ---------- */
  function genQueens(n, rng) {
    let perm = [...Array(n).keys()];
    for (let t = 0; t < 800; t++) {
      perm = UP.shuffle([...Array(n).keys()], rng);
      let ok = true;
      for (let i = 0; i < n - 1; i++) if (Math.abs(perm[i] - perm[i + 1]) <= 1) ok = false;
      if (ok) break;
    }
    const colors = Array.from({ length: n }, () => Array(n).fill(-1));
    for (let r = 0; r < n; r++) colors[r][perm[r]] = r;
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    let guard = 0;
    while (colors.some((row) => row.includes(-1)) && guard++ < 400) {
      const frontier = [];
      for (let r = 0; r < n; r++)
        for (let c = 0; c < n; c++)
          if (colors[r][c] >= 0) {
            for (const [dr, dc] of dirs) {
              const rr = r + dr, cc = c + dc;
              if (rr >= 0 && cc >= 0 && rr < n && cc < n && colors[rr][cc] < 0)
                frontier.push([rr, cc, colors[r][c]]);
            }
          }
      if (!frontier.length) break;
      const [r, c, col] = frontier[(rng() * frontier.length) | 0];
      if (colors[r][c] < 0) colors[r][c] = col;
    }
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++) if (colors[r][c] < 0) colors[r][c] = 0;
    return { n, colors };
  }
  const QCOLORS = ["#f4c9d4", "#cde4c7", "#c9d8f4", "#f8e3b0", "#e3d4f5", "#c8efe8", "#f5d0b0", "#d9d9d9"];

  UP.register("queens", function (root, meta, daily) {
    const stage = shell(root, meta, daily, "");
    const n = 6;
    const { colors } = genQueens(n, rngFor(daily));
    const place = Array.from({ length: n }, () => Array(n).fill(false));
    function conflicts() {
      const qs = [];
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (place[r][c]) qs.push([r, c]);
      const bad = new Set();
      const rows = {}, cols = {}, regs = {};
      qs.forEach(([r, c], i) => {
        (rows[r] ||= []).push(i);
        (cols[c] ||= []).push(i);
        (regs[colors[r][c]] ||= []).push(i);
      });
      [rows, cols, regs].forEach((map) => {
        Object.values(map).forEach((list) => {
          if (list.length > 1) list.forEach((i) => bad.add(i));
        });
      });
      for (let i = 0; i < qs.length; i++)
        for (let j = i + 1; j < qs.length; j++) {
          if (Math.max(Math.abs(qs[i][0] - qs[j][0]), Math.abs(qs[i][1] - qs[j][1])) === 1) {
            bad.add(i);
            bad.add(j);
          }
        }
      return { qs, bad };
    }
    function draw() {
      const { qs, bad } = conflicts();
      stage.innerHTML = `<div class="bar"><span class="meta">One crown per row, column & colour. None may touch.</span></div>
        <div class="board-wrap"><div class="ng" style="grid-template-columns:repeat(${n},40px)" id="qg"></div></div>`;
      const qg = stage.querySelector("#qg");
      for (let r = 0; r < n; r++)
        for (let c = 0; c < n; c++) {
          const b = document.createElement("button");
          b.className = "q-cell";
          b.style.background = QCOLORS[colors[r][c] % QCOLORS.length];
          const idx = qs.findIndex(([rr, cc]) => rr === r && cc === c);
          if (place[r][c]) {
            b.textContent = "♛";
            if (bad.has(idx)) b.classList.add("bad");
          }
          b.onclick = () => {
            place[r][c] = !place[r][c];
            draw();
            const st = conflicts();
            if (st.qs.length === n && st.bad.size === 0) {
              const xp = UP.awardXP("queens", 70, { gems: 2 });
              finish(stage, "Crowns placed", "Every region, row and column is safe.", xp, () => UP.GAMES.queens(root, meta, false));
            }
          };
          qg.appendChild(b);
        }
    }
    draw();
  });

  /* ---------- Zip ---------- */
  function genZip(n, rng, k) {
    const path = [];
    for (let r = 0; r < n; r++) {
      if (r % 2 === 0) for (let c = 0; c < n; c++) path.push([r, c]);
      else for (let c = n - 1; c >= 0; c--) path.push([r, c]);
    }
    if (rng() > 0.5) path.reverse();
    if (rng() > 0.5) {
      path.forEach((p) => {
        const t = p[0];
        p[0] = p[1];
        p[1] = t;
      });
    }
    const nums = {};
    for (let i = 0; i < k; i++) {
      const idx = i === k - 1 ? path.length - 1 : Math.round((i * (path.length - 1)) / (k - 1));
      nums[path[idx][0] + "," + path[idx][1]] = i + 1;
    }
    return { n, nums, k };
  }

  UP.register("zip", function (root, meta, daily) {
    const stage = shell(root, meta, daily, "");
    const n = 6;
    const { nums, k } = genZip(n, rngFor(daily), 6);
    let path = [];
    function key(r, c) {
      return r + "," + c;
    }
    function inPath(r, c) {
      return path.findIndex((p) => p[0] === r && p[1] === c);
    }
    function nextNum() {
      let m = 0;
      path.forEach(([r, c]) => {
        const v = nums[key(r, c)];
        if (v) m = Math.max(m, v);
      });
      return m + 1;
    }
    function draw() {
      stage.innerHTML = `<div class="bar"><span class="meta">Draw a path 1 → ${k} through every cell</span>
        <button class="ghost" id="undo">Undo</button></div>
        <div class="board-wrap"><div class="ng" style="grid-template-columns:repeat(${n},36px)" id="zg"></div></div>`;
      const zg = stage.querySelector("#zg");
      for (let r = 0; r < n; r++)
        for (let c = 0; c < n; c++) {
          const d = document.createElement("button");
          d.className = "z-cell";
          const v = nums[key(r, c)];
          if (v) {
            d.textContent = v;
            d.classList.add("num");
          }
          if (inPath(r, c) >= 0) d.classList.add("on");
          d.onmousedown = (e) => {
            e.preventDefault();
            tap(r, c);
          };
          d.onmouseenter = (e) => {
            if (e.buttons === 1) tap(r, c);
          };
          d.ontouchstart = (e) => {
            e.preventDefault();
            tap(r, c);
          };
          zg.appendChild(d);
        }
      stage.querySelector("#undo").onclick = () => {
        path.pop();
        draw();
      };
    }
    function tap(r, c) {
      const i = inPath(r, c);
      if (i >= 0) {
        path = path.slice(0, i + 1);
        draw();
        return;
      }
      if (!path.length) {
        if (nums[key(r, c)] !== 1) return;
        path = [[r, c]];
        draw();
        return;
      }
      const [pr, pc] = path[path.length - 1];
      if (Math.abs(pr - r) + Math.abs(pc - c) !== 1) return;
      const v = nums[key(r, c)];
      if (v && v !== nextNum()) return;
      path.push([r, c]);
      draw();
      if (path.length === n * n && nums[key(r, c)] === k) {
        const xp = UP.awardXP("zip", 65, { gems: 1 });
        finish(stage, "Zipped!", "One continuous path, numbers in order.", xp, () => UP.GAMES.zip(root, meta, false));
      }
    }
    draw();
  });
})();

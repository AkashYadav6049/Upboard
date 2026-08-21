(function () {
  const app = document.getElementById("app");

  function cleanup() {
    if (typeof UP._cleanup === "function") {
      try {
        UP._cleanup();
      } catch (_) {}
      UP._cleanup = null;
    }
  }

  function renderHub() {
    cleanup();
    const s = UP.loadStats();
    const cats = [
      { id: "all", label: "All games" },
      { id: "logic", label: "Logic" },
      { id: "words", label: "Words" },
      { id: "maths", label: "Maths" },
      { id: "gk", label: "GK" },
      { id: "reasoning", label: "Reasoning" },
    ];
    app.innerHTML = `
      <div class="section-head">
        <h2>All games</h2>
        <span>${UP.CATALOG.length} to play</span>
      </div>
      <div class="filter-row" id="filters">
        ${cats.map((c, i) => `<button class="filter-btn ${i === 0 ? "active" : ""}" data-cat="${c.id}">${c.label}</button>`).join("")}
      </div>
      <div class="grid" id="grid"></div>
      <div class="stats-row">
        <div class="panel faq">
          <h2>How it works</h2>
          <ul>
            <li>Jump in as a guest — nothing to install.</li>
            <li>Daily mode uses today’s date as a seed, so everyone shares the same puzzle.</li>
            <li>Practice rounds are unlimited and still award a little XP.</li>
            <li>XP, gems and your streak live in this browser only.</li>
          </ul>
          <details>
            <summary>Do I need an account?</summary>
            <p>No. Scores are saved on this device with local storage.</p>
          </details>
          <details>
            <summary>Which games help with studies?</summary>
            <p>Flags &amp; Capitals, GK Quiz, Periodic Table Memory, Math Sprint, the 24 Game, Synonyms &amp; Antonyms and Number Sequence.</p>
          </details>
        </div>
        <div class="panel">
          <h2>Your stats</h2>
          <div class="stat-grid">
            <div class="stat"><b>${s.xp}</b><span>Total XP</span></div>
            <div class="stat"><b>${s.gems}</b><span>Gems</span></div>
            <div class="stat"><b>${s.streak}</b><span>Day streak</span></div>
            <div class="stat"><b>${s.plays}</b><span>Rounds played</span></div>
          </div>
        </div>
      </div>`;

    const grid = document.getElementById("grid");
    function cardHTML(g) {
      return `<a class="game-card" href="#/game/${g.id}">
        <div class="card-art">${UP.iconHTML(g.id)}</div>
        <div class="card-body">
          <h3>${g.name}</h3>
          <p>${g.desc}</p>
          <span class="tag ${g.study ? "study" : ""}">${g.tag}</span>
        </div>
        <span class="chev" aria-hidden="true">›</span>
      </a>`;
    }
    function paint(cat) {
      const filtered = UP.CATALOG.filter((g) => {
        if (cat === "all") return true;
        if (cat === "gk") return g.cat === "gk" || g.cat === "trivia";
        if (cat === "maths") return g.cat === "maths" || g.cat === "numbers";
        if (cat === "logic") return g.cat === "logic" || g.cat === "focus";
        if (cat === "reasoning") return g.cat === "reasoning" || g.cat === "chem" || g.cat === "geo";
        return g.cat === cat;
      });
      grid.innerHTML = filtered.map((g) => cardHTML(g)).join("");
    }
    paint("all");
    document.getElementById("filters").onclick = (e) => {
      const b = e.target.closest("[data-cat]");
      if (!b) return;
      document.querySelectorAll(".filter-btn").forEach((x) => x.classList.toggle("active", x === b));
      paint(b.dataset.cat);
    };
  }

  function renderGame(id, practice) {
    cleanup();
    const meta = UP.CATALOG.find((g) => g.id === id);
    if (!meta || !UP.GAMES[id]) {
      app.innerHTML = `<div class="empty"><p>Unknown game.</p><p><a class="back" href="#/">← Games</a></p></div>`;
      return;
    }
    UP.GAMES[id](app, meta, !practice);
  }

  function route() {
    UP.renderHud();
    const hash = location.hash.replace(/^#/, "") || "/";
    const parts = hash.split("/").filter(Boolean);
    if (parts[0] === "game" && parts[1]) renderGame(parts[1], parts[2] === "practice");
    else renderHub();
  }

  window.addEventListener("hashchange", route);
  UP.renderHud();
  route();
})();

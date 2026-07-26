/*
 * Pixel Tetris — ambient background edition. Two tall columns live in the
 * page gutters and play themselves like slow phosphor weather. No frame:
 * the gutter whitespace is the field and the screen bottom is the floor.
 * Blocks are dithered phosphor sprites (top-lit gradient + Bayer noise),
 * the same grain and shading as the moon and galaxy. Lines dissolve with
 * a soft accent fade instead of a hard flash. Reveals only after the first
 * screen is scrolled past. Left: auto-AI. Right: click to take over.
 */
(() => {
  "use strict";
  const WIDE = "(min-width: 1280px)";
  const COLS = 10, GRAN = 4;
  const BAYER_4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  const TIER = { I: 0.96, O: 0.84, T: 0.74, S: 0.68, Z: 0.62, J: 0.74, L: 0.8 };

  const BASE = {
    I: [[1, 1, 1, 1]],
    O: [[1, 1], [1, 1]],
    T: [[0, 1, 0], [1, 1, 1]],
    S: [[0, 1, 1], [1, 1, 0]],
    Z: [[1, 1, 0], [0, 1, 1]],
    J: [[1, 0, 0], [1, 1, 1]],
    L: [[0, 0, 1], [1, 1, 1]],
  };
  const rotate = (m) => {
    const h = m.length, w = m[0].length;
    const out = Array.from({ length: w }, () => Array(h).fill(0));
    for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) out[x][h - 1 - y] = m[y][x];
    return out;
  };
  const SHAPES = {};
  for (const [key, base] of Object.entries(BASE)) {
    const rots = [base];
    let cur = base;
    for (let i = 0; i < 3; i += 1) { cur = rotate(cur); rots.push(cur); }
    SHAPES[key] = rots;
  }
  const KEYS = Object.keys(SHAPES);
  const bag = () => {
    const arr = [...KEYS];
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  const palette = () => {
    const s = getComputedStyle(document.documentElement);
    return {
      ink: s.getPropertyValue("--ink").trim(),
      accent: s.getPropertyValue("--accent").trim(),
      muted: s.getPropertyValue("--muted").trim(),
      line: s.getPropertyValue("--line").trim(),
    };
  };
  const makeSprite = (color, base, cell, scale) => {
    const c = document.createElement("canvas");
    c.width = cell; c.height = cell;
    const x = c.getContext("2d");
    x.fillStyle = color;
    const n = cell / GRAN;
    for (let gy = 0; gy < n; gy += 1) {
      for (let gx = 0; gx < n; gx += 1) {
        const light = 1 - ((gx + gy) / (2 * Math.max(1, n - 1))) * 0.5;
        const dith = (BAYER_4[gy & 3][gx & 3] / 16) * 0.32 - 0.1;
        const a = Math.max(0, Math.min(1, base * light + dith)) * scale;
        if (a < 0.05) continue;
        x.globalAlpha = a;
        x.fillRect(gx * GRAN, gy * GRAN, GRAN - 1, GRAN - 1);
      }
    }
    return c;
  };

  class Tetris {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.colors = palette();
      this.cell = 16;
      this.rows = 20;
      this.sprites = {};
      this.grid = [];
      this.queue = [];
      this.score = 0;
      this.lines = 0;
      this.over = false;
      this.resetting = false;
      this.clearing = null;
      this.assistPlan = null;
      this.current = null;
      this.resize(true);
      addEventListener("resize", () => this.resize(), { passive: true });
    }
    buildSprites() {
      this.sprites = { __active: makeSprite(this.colors.accent, 1, this.cell, 0.82) };
      for (const k of KEYS) this.sprites[k] = makeSprite(this.colors.ink, TIER[k] || 0.7, this.cell, 0.62);
    }
    refill() { while (this.queue.length < 7) this.queue.push(...bag()); }
    spawn() {
      this.currentKey = this.queue.shift();
      this.refill();
      this.crot = 0;
      this.current = SHAPES[this.currentKey][0];
      this.cx = Math.floor((COLS - this.current[0].length) / 2);
      this.cy = 0;
      this.assistPlan = null;
      if (this.collides(this.current, this.cx, this.cy)) { this.over = true; this.current = null; }
    }
    collides(shape, ox, oy) {
      for (let y = 0; y < shape.length; y += 1)
        for (let x = 0; x < shape[0].length; x += 1) {
          if (!shape[y][x]) continue;
          const gx = ox + x, gy = oy + y;
          if (gx < 0 || gx >= COLS || gy >= this.rows) return true;
          if (gy >= 0 && this.grid[gy][gx]) return true;
        }
      return false;
    }
    move(dx) { if (this.current && !this.collides(this.current, this.cx + dx, this.cy)) { this.cx += dx; return true; } return false; }
    rotate(dir = 1) {
      if (!this.current) return false;
      const rots = SHAPES[this.currentKey];
      const shape = rots[(this.crot + dir + 4) % 4];
      for (const kick of [0, -1, 1, -2, 2]) {
        if (!this.collides(shape, this.cx + kick, this.cy)) { this.crot = (this.crot + dir + 4) % 4; this.current = shape; this.cx += kick; return true; }
      }
      return false;
    }
    softDrop() { if (!this.current) return; if (!this.collides(this.current, this.cx, this.cy + 1)) { this.cy += 1; this.score += 1; } else this.lock(); }
    hardDrop() { if (!this.current) return; let d = 0; while (!this.collides(this.current, this.cx, this.cy + 1)) { this.cy += 1; d += 1; } this.score += d * 2; this.lock(); }
    ghostY() { let gy = this.cy; while (!this.collides(this.current, this.cx, gy + 1)) gy += 1; return gy; }
    lock() {
      if (!this.current) return;
      for (let y = 0; y < this.current.length; y += 1)
        for (let x = 0; x < this.current[0].length; x += 1)
          if (this.current[y][x]) {
            const gx = this.cx + x, gy = this.cy + y;
            if (gy >= 0 && gy < this.rows && gx >= 0 && gx < COLS) this.grid[gy][gx] = this.currentKey;
          }
      this.current = null;
      const full = [];
      for (let y = 0; y < this.rows; y += 1) if (this.grid[y].every((c) => c)) full.push(y);
      if (full.length) {
        this.clearing = { rows: full, at: performance.now() };
        this.lines += full.length;
        this.score += [0, 100, 300, 500, 800][full.length] || 0;
      } else this.spawn();
    }
    finishClear() {
      if (!this.clearing) return;
      const rows = this.clearing.rows.slice().sort((a, b) => a - b);
      for (const y of rows) { this.grid.splice(y, 1); this.grid.unshift(Array(COLS).fill(null)); }
      this.clearing = null;
      this.spawn();
    }
    evaluate(grid) {
      const h = Array(COLS).fill(0);
      for (let x = 0; x < COLS; x += 1) for (let y = 0; y < this.rows; y += 1) if (grid[y][x]) { h[x] = this.rows - y; break; }
      const agg = h.reduce((a, b) => a + b, 0);
      let holes = 0;
      for (let x = 0; x < COLS; x += 1) { let seen = false; for (let y = 0; y < this.rows; y += 1) { if (grid[y][x]) seen = true; else if (seen) holes += 1; } }
      let bump = 0; for (let i = 0; i < COLS - 1; i += 1) bump += Math.abs(h[i] - h[i + 1]);
      let lines = 0; for (let y = 0; y < this.rows; y += 1) if (grid[y].every((c) => c)) lines += 1;
      return 0.76 * lines - 0.51 * agg - 0.36 * holes - 0.18 * bump;
    }
    bestMove() {
      if (!this.current) return null;
      const rots = SHAPES[this.currentKey];
      let best = { score: -1e9, rot: 0, x: this.cx };
      for (let r = 0; r < rots.length; r += 1) {
        const shape = rots[r];
        for (let x = -2; x <= COLS; x += 1) {
          if (this.collides(shape, x, 0)) continue;
          let y = 0; while (!this.collides(shape, x, y + 1)) y += 1;
          const sim = this.grid.map((row) => row.slice());
          for (let py = 0; py < shape.length; py += 1)
            for (let px = 0; px < shape[0].length; px += 1)
              if (shape[py][px] && y + py >= 0 && y + py < this.rows && x + px >= 0 && x + px < COLS) sim[y + py][x + px] = this.currentKey;
          const sc = this.evaluate(sim);
          if (sc > best.score) best = { score: sc, rot: r, x };
        }
      }
      return best;
    }
    stepAssist() {
      if (!this.assistPlan) this.assistPlan = this.bestMove();
      if (!this.assistPlan) return;
      const t = this.assistPlan;
      if (this.crot !== t.rot) { this.rotate(1); return; }
      if (this.cx < t.x) { this.move(1); return; }
      if (this.cx > t.x) { this.move(-1); return; }
      this.softDrop();
    }
    resize(initial) {
      const stage = this.canvas.closest(".g-stage") || this.canvas.parentElement;
      const availW = (stage && stage.clientWidth) || 150;
      const availH = (stage && stage.clientHeight) || 400;
      const cell = Math.max(12, Math.floor(Math.min(availW / COLS, availH / 22) / GRAN) * GRAN);
      const rows = Math.max(16, Math.min(46, Math.floor(availH / cell)));
      if (cell !== this.cell || rows !== this.rows || initial) {
        this.cell = cell;
        this.rows = rows;
        this.grid = Array.from({ length: rows }, () => Array(COLS).fill(null));
        this.queue = []; this.refill();
        this.score = 0; this.lines = 0; this.over = false;
        this.clearing = null; this.current = null;
        this.buildSprites();
        this.spawn();
      }
      const ratio = Math.min(devicePixelRatio || 1, 2);
      const w = COLS * cell, h = rows * cell;
      this.canvas.width = w * ratio; this.canvas.height = h * ratio;
      this.canvas.style.width = w + "px"; this.canvas.style.height = h + "px";
      this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    reset() { this.grid = Array.from({ length: this.rows }, () => Array(COLS).fill(null)); this.queue = []; this.refill(); this.score = 0; this.lines = 0; this.over = false; this.clearing = null; this.current = null; this.spawn(); }
    drawCell(cx, cy, sprite) { this.ctx.drawImage(sprite, cx * this.cell, cy * this.cell); }
    drawGhost(cx, cy, color, alpha) {
      const ctx = this.ctx, c = this.cell, last = (this.cell / GRAN - 1) * GRAN;
      ctx.globalAlpha = alpha; ctx.fillStyle = color;
      ctx.fillRect(cx * c, cy * c, GRAN - 1, GRAN - 1);
      ctx.fillRect(cx * c + last, cy * c, GRAN - 1, GRAN - 1);
      ctx.fillRect(cx * c, cy * c + last, GRAN - 1, GRAN - 1);
      ctx.fillRect(cx * c + last, cy * c + last, GRAN - 1, GRAN - 1);
      ctx.globalAlpha = 1;
    }
    draw() {
      const ctx = this.ctx, c = this.colors, cell = this.cell, W = COLS * cell, H = this.rows * cell;
      ctx.clearRect(0, 0, W, H);
      // faint grid dots — the only trace of a field
      ctx.fillStyle = c.line;
      ctx.globalAlpha = 0.5;
      for (let y = 0; y < this.rows; y += 1) for (let x = 0; x < COLS; x += 1) ctx.fillRect(x * cell + cell / 2 - 1, y * cell + cell / 2 - 1, 1, 1);
      ctx.globalAlpha = 1;
      for (let y = 0; y < this.rows; y += 1) for (let x = 0; x < COLS; x += 1) if (this.grid[y][x]) this.drawCell(x, y, this.sprites[this.grid[y][x]] || this.sprites.I);
      if (this.current) {
        const gy = this.ghostY();
        for (let py = 0; py < this.current.length; py += 1) for (let px = 0; px < this.current[0].length; px += 1) if (this.current[py][px]) this.drawGhost(this.cx + px, gy + py, c.muted, 0.32);
        for (let py = 0; py < this.current.length; py += 1) for (let px = 0; px < this.current[0].length; px += 1) if (this.current[py][px]) this.drawCell(this.cx + px, this.cy + py, this.sprites.__active);
      }
      if (this.clearing) {
        const age = performance.now() - this.clearing.at;
        const p = Math.min(1, age / 420);
        const a = (1 - p) * 0.7;
        ctx.fillStyle = c.accent;
        for (const y of this.clearing.rows) { ctx.globalAlpha = a; ctx.fillRect(0, y * cell, W, cell); }
        ctx.globalAlpha = 1;
      }
      if (this.over) {
        ctx.fillStyle = c.line; ctx.globalAlpha = 0.4; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
        ctx.fillStyle = c.accent; ctx.font = `700 ${Math.max(10, cell * 0.7)}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`; ctx.textAlign = "center";
        ctx.fillText("REBOOTING", W / 2, H / 2);
      }
    }
  }

  function makeCabinet(side, label, withPrompt) {
    const aside = document.createElement("aside");
    aside.className = `gutter-game g-${side}`;
    aside.setAttribute("aria-hidden", "true");
    const prompt = withPrompt ? '<div class="g-prompt"><b>CLICK</b>TO PLAY</div>' : '';
    aside.innerHTML = `
      <div class="g-head">
        <span class="g-label">${label}</span>
        <span class="g-score">000000</span>
        <span class="g-lines-wrap"><i class="g-bullet"></i><span class="g-lines">000</span></span>
      </div>
      <div class="g-stage">
        <canvas class="g-board"></canvas>
        ${prompt}
      </div>`;
    return aside;
  }

  function init() {
    if (!matchMedia(WIDE).matches) return;
    const left = makeCabinet("l", "01 / AUTO", false);
    const right = makeCabinet("r", "02 / YOU", true);
    document.body.append(left, right);

    const auto = new Tetris(left.querySelector(".g-board"));
    const player = new Tetris(right.querySelector(".g-board"));

    let playerFocused = false;
    window.__tetrisPlaying = false;
    const setFocus = (on) => { playerFocused = on; window.__tetrisPlaying = on; right.classList.toggle("focused", on); };
    right.querySelector(".g-stage").addEventListener("click", () => setFocus(!playerFocused));
    addEventListener("keydown", (e) => { if (e.key === "Escape" && playerFocused) setFocus(false); });
    document.addEventListener("pointerdown", (e) => { if (playerFocused && !right.contains(e.target)) setFocus(false); });

    matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => {
      auto.colors = palette(); player.colors = palette(); auto.buildSprites(); player.buildSprites();
    });

    const reveal = () => document.body.classList.toggle("g-reveal", scrollY > innerHeight * 0.6);
    addEventListener("scroll", reveal, { passive: true });
    reveal();

    let running = true;
    document.addEventListener("visibilitychange", () => { running = !document.hidden; });

    const AUTO_STEP = 360, GRAVITY = 720, CLEAR_TIME = 420;
    let lastFrame = performance.now();
    let autoAcc = 0, playerAutoAcc = 0, gravAcc = 0;
    const lScore = left.querySelector(".g-score"), lLines = left.querySelector(".g-lines");
    const rScore = right.querySelector(".g-score"), rLines = right.querySelector(".g-lines");

    const loop = (now) => {
      requestAnimationFrame(loop);
      const dt = now - lastFrame; lastFrame = now;
      if (!running) return;

      for (const g of [auto, player]) {
        if (g.clearing && now - g.clearing.at > CLEAR_TIME) g.finishClear();
      }

      const driveAi = (g, acc, step) => {
        if (g.clearing || g.over) return acc;
        acc += dt;
        if (acc > step) { acc = 0; g.stepAssist(); if (g.over && !g.resetting) { g.resetting = true; setTimeout(() => { g.reset(); g.resetting = false; }, 1600); } }
        return acc;
      };
      autoAcc = driveAi(auto, autoAcc, AUTO_STEP);
      if (!playerFocused) playerAutoAcc = driveAi(player, playerAutoAcc, AUTO_STEP);
      else {
        if (!player.clearing && !player.over) { gravAcc += dt; if (gravAcc > GRAVITY) { gravAcc = 0; player.softDrop(); } }
        else gravAcc = 0;
      }

      auto.draw(); player.draw();
      for (const [el, g] of [[lScore, auto], [rScore, player]]) { const v = String(g.score).padStart(6, "0"); if (el.textContent !== v) el.textContent = v; }
      for (const [el, g] of [[lLines, auto], [rLines, player]]) { const v = String(g.lines).padStart(3, "0"); if (el.textContent !== v) el.textContent = v; }
    };
    requestAnimationFrame(loop);

    addEventListener("keydown", (e) => {
      if (!playerFocused) return;
      const k = e.key;
      if (!["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " ", "z", "Z", "x", "X"].includes(k)) return;
      e.preventDefault();
      player.assistPlan = null;
      if (k === "ArrowLeft") player.move(-1);
      else if (k === "ArrowRight") player.move(1);
      else if (k === "ArrowDown") { player.softDrop(); gravAcc = 0; }
      else if (k === "ArrowUp" || k === "x" || k === "X") player.rotate(1);
      else if (k === "z" || k === "Z") player.rotate(-1);
      else if (k === " ") player.hardDrop();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

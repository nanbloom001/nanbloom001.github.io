(() => {
  "use strict";

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const lightScheme = matchMedia("(prefers-color-scheme: light)");

  function palette() {
    const styles = getComputedStyle(document.documentElement);
    return {
      ink: styles.getPropertyValue("--ink").trim(),
      accent: styles.getPropertyValue("--accent").trim(),
    };
  }

  const easeOutCubic = (t) => 1 - (1 - t) ** 3;

  function setupCanvas(canvas, maxRatio = 2) {
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return null;
    const ratio = Math.min(devicePixelRatio || 1, maxRatio);
    canvas.width = Math.round(bounds.width * ratio);
    canvas.height = Math.round(bounds.height * ratio);
    const context = canvas.getContext("2d");
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { context, width: bounds.width, height: bounds.height };
  }

  // Block-display heading rendered as individual phosphor cells, so the same
  // point cloud can assemble on arrival and shatter on departure.
  class PixelBanner {
    constructor(canvas) {
      this.canvas = canvas;
      this.text = canvas.dataset.text || "";
      this.accentWord = (canvas.dataset.accent || "").trim().toUpperCase();
      this.maxPitch = Number(canvas.dataset.pitch || 10);
      this.frame = 0;
      this.resizeFrame = 0;
      this.entered = false;
      this.points = [];
      this.resizeObserver = new ResizeObserver(() => {
        cancelAnimationFrame(this.resizeFrame);
        this.resizeFrame = requestAnimationFrame(() => this.mount(!this.entered));
      });
      this.resizeObserver.observe(canvas);
    }

    mount(animate) {
      const stage = setupCanvas(this.canvas);
      if (!stage) return;
      this.stage = stage;
      const result = DotFont.makeBlockPoints(this.text, { cols: 7, rows: 9, maxPitch: this.maxPitch }, stage);
      const size = Number(this.canvas.dataset.cellSize) || Math.max(2, Math.round(result.pitch * 0.62));
      this.points = result.points.map((point) => ({
        x: point.x,
        y: point.y,
        characterIndex: point.characterIndex,
        size,
        accent: false,
      }));
      this.markAccents(result.pitch);
      this.entered = true;
      if (animate && !reducedMotion.matches) this.assemble();
      else this.drawStatic();
    }

    // The accent word must be the trailing word of the title. Cells are grouped
    // by their bottom text line first, because characterIndex restarts per line.
    markAccents(pitch) {
      if (!this.accentWord || !this.points.length) return;
      const span = [...this.accentWord].length;
      const bottom = Math.max(...this.points.map((point) => point.y));
      const lastLineTop = bottom - 8 * pitch - pitch / 2;
      const lastLine = this.points.filter((point) => point.y >= lastLineTop);
      const lineLength = Math.max(...lastLine.map((point) => point.characterIndex)) + 1;
      lastLine.forEach((point) => {
        if (point.characterIndex >= lineLength - span) point.accent = true;
      });
    }

    assemble() {
      cancelAnimationFrame(this.frame);
      const { width, height } = this.stage;
      const spread = Math.max(width, height);
      const particles = this.points.map((point) => {
        const angle = Math.random() * Math.PI * 2;
        const radius = spread * (0.25 + Math.random() * 0.55);
        return {
          ...point,
          fromX: point.x + Math.cos(angle) * radius,
          fromY: point.y + Math.sin(angle) * radius,
          delay: (point.x / Math.max(1, width)) * 260 + Math.random() * 220,
        };
      });
      const DURATION = 680;
      const colors = palette();
      let startedAt = 0;
      const step = (now) => {
        if (!startedAt) startedAt = now;
        const { context, width: w, height: h } = this.stage;
        context.clearRect(0, 0, w, h);
        let settled = true;
        for (const particle of particles) {
          const progress = Math.min(1, Math.max(0, (now - startedAt - particle.delay) / DURATION));
          if (progress < 1) settled = false;
          const eased = easeOutCubic(progress);
          const x = particle.fromX + (particle.x - particle.fromX) * eased;
          const y = particle.fromY + (particle.y - particle.fromY) * eased;
          const size = particle.size * (0.4 + 0.6 * eased);
          context.globalAlpha = 0.15 + 0.85 * eased;
          context.fillStyle = particle.accent ? colors.accent : colors.ink;
          context.fillRect(x - size / 2, y - size / 2, size, size);
        }
        context.globalAlpha = 1;
        if (settled) this.drawStatic();
        else this.frame = requestAnimationFrame(step);
      };
      this.frame = requestAnimationFrame(step);
    }

    drawStatic() {
      if (!this.stage) return;
      const { context, width, height } = this.stage;
      const colors = palette();
      context.clearRect(0, 0, width, height);
      for (const point of this.points) {
        context.fillStyle = point.accent ? colors.accent : colors.ink;
        context.fillRect(point.x - point.size / 2, point.y - point.size / 2, point.size, point.size);
      }
    }

    shatter(done) {
      cancelAnimationFrame(this.frame);
      if (!this.stage || !this.points.length) {
        done && done();
        return;
      }
      const { context, width, height } = this.stage;
      const colors = palette();
      const centerX = width / 2;
      const centerY = height / 2;
      const particles = this.points.map((point) => {
        const angle = Math.atan2(point.y - centerY, point.x - centerX) + (Math.random() - 0.5) * 1.2;
        const speed = 120 + Math.random() * 420;
        return { ...point, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 60 };
      });
      const DURATION = 460;
      let startedAt = 0;
      let last = 0;
      const step = (now) => {
        if (!startedAt) {
          startedAt = now;
          last = now;
        }
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        const progress = Math.min(1, (now - startedAt) / DURATION);
        context.clearRect(0, 0, width, height);
        context.globalAlpha = 1 - progress;
        for (const particle of particles) {
          particle.vy += 780 * dt;
          particle.x += particle.vx * dt;
          particle.y += particle.vy * dt;
          context.fillStyle = particle.accent ? colors.accent : colors.ink;
          context.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
        }
        context.globalAlpha = 1;
        if (progress < 1) {
          this.frame = requestAnimationFrame(step);
        } else {
          context.clearRect(0, 0, width, height);
          done && done();
        }
      };
      this.frame = requestAnimationFrame(step);
    }
  }

  // Small static stamps (dates) in the compact 5x7 face.
  class PixelStamp {
    constructor(canvas) {
      this.canvas = canvas;
      this.text = canvas.dataset.pixelDate || "";
      this.resizeFrame = 0;
      this.resizeObserver = new ResizeObserver(() => {
        cancelAnimationFrame(this.resizeFrame);
        this.resizeFrame = requestAnimationFrame(() => this.draw());
      });
      this.resizeObserver.observe(canvas);
    }

    draw() {
      const stage = setupCanvas(this.canvas);
      if (!stage) return;
      const result = DotFont.makeCompactPoints(this.text, { maxPitch: 3.4, pixelSize: 2 }, stage);
      stage.context.fillStyle = palette().ink;
      result.points.forEach((point) => {
        stage.context.fillRect(point.x - point.size / 2, point.y - point.size / 2, point.size, point.size);
      });
    }
  }

  // Sparse phosphor dust drifting up behind the page. Cells move a few px/s,
  // so updates are capped at ~30fps — indistinguishable, half the paint work.
  class DriftField {
    constructor(canvas) {
      this.canvas = canvas;
      this.context = canvas.getContext("2d");
      this.frame = 0;
      this.resizeFrame = 0;
      this.last = 0;
      this.accumulated = 0;
      this.colors = palette();
      this.resize();
      addEventListener("resize", () => {
        cancelAnimationFrame(this.resizeFrame);
        this.resizeFrame = requestAnimationFrame(() => this.resize());
      }, { passive: true });
      document.addEventListener("visibilitychange", () => {
        cancelAnimationFrame(this.frame);
        if (!document.hidden && !reducedMotion.matches) this.start();
      });
      reducedMotion.addEventListener("change", () => {
        cancelAnimationFrame(this.frame);
        if (reducedMotion.matches) this.draw();
        else this.start();
      });
      if (reducedMotion.matches) this.draw();
      else this.start();
    }

    resize() {
      const ratio = Math.min(devicePixelRatio || 1, 2);
      this.width = innerWidth;
      this.height = innerHeight;
      this.canvas.width = Math.round(this.width * ratio);
      this.canvas.height = Math.round(this.height * ratio);
      this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = Math.round(Math.min(44, Math.max(12, (this.width * this.height) / 36000)));
      this.cells = Array.from({ length: count }, () => this.spawn(true));
      if (reducedMotion.matches) this.draw();
    }

    spawn(anywhere) {
      return {
        x: Math.random() * this.width,
        y: anywhere ? Math.random() * this.height : this.height + 4,
        size: 4,
        speed: 4 + Math.random() * 11,
        drift: (Math.random() - 0.5) * 3,
        alpha: 0.05 + Math.random() * 0.15,
        accent: Math.random() < 0.09,
      };
    }

    refreshColors() {
      this.colors = palette();
      if (reducedMotion.matches) this.draw();
    }

    draw() {
      const { context } = this;
      context.clearRect(0, 0, this.width, this.height);
      for (const cell of this.cells) {
        context.globalAlpha = cell.alpha;
        context.fillStyle = cell.accent ? this.colors.accent : this.colors.ink;
        context.fillRect(Math.round(cell.x), Math.round(cell.y), cell.size, cell.size);
      }
      context.globalAlpha = 1;
    }

    start() {
      this.last = 0;
      this.accumulated = 0;
      const FRAME_BUDGET = 1000 / 30;
      const step = (now) => {
        if (!this.last) this.last = now;
        this.accumulated += now - this.last;
        this.last = now;
        if (this.accumulated >= FRAME_BUDGET) {
          const dt = Math.min(0.05, this.accumulated / 1000);
          this.accumulated = 0;
          for (let index = 0; index < this.cells.length; index += 1) {
            const cell = this.cells[index];
            cell.y -= cell.speed * dt;
            cell.x += cell.drift * dt;
            if (cell.y < -4) this.cells[index] = this.spawn(false);
          }
          this.draw();
        }
        this.frame = requestAnimationFrame(step);
      };
      this.frame = requestAnimationFrame(step);
    }
  }

  // Hand-drawn sprite bitmaps: "." empty, "#" ink, "o" accent.
  const SPRITES = {
    dog: {
      pixel: 4,
      sequence: [[0, 150], [1, 150]],
      frames: [
        [
          "...............##...",
          "..............#####.",
          ".#............###o#.",
          ".##...........######",
          "..###############...",
          "..###############...",
          "...#############....",
          "...##..##..##..##...",
          "...##..#....#..##...",
          "..###.........###...",
        ],
        [
          "...............##...",
          "..............#####.",
          ".#............###o#.",
          ".##...........######",
          "..###############...",
          "..###############...",
          "...#############....",
          "...##..##..##..##...",
          "....#..##..##..#....",
          "......###..###......",
        ],
      ],
    },
    antenna: {
      pixel: 4,
      sequence: [[0, 900], [1, 450]],
      frames: [
        [
          ".....oo.....",
          ".....##.....",
          "..########..",
          ".....##.....",
          ".....##.....",
          "...######...",
          ".....##.....",
          ".....##.....",
          "....####....",
          "....#..#....",
          "...#....#...",
          "...#....#...",
          "..#......#..",
          ".##########.",
        ],
        [
          "............",
          ".....##.....",
          "..########..",
          ".....##.....",
          ".....##.....",
          "...######...",
          ".....##.....",
          ".....##.....",
          "....####....",
          "....#..#....",
          "...#....#...",
          "...#....#...",
          "..#......#..",
          ".##########.",
        ],
      ],
    },
    face: {
      pixel: 4,
      sequence: [[0, 3200], [1, 150]],
      frames: [
        [
          "......oo......",
          "......##......",
          "..##########..",
          ".#..........#.",
          ".#..##..##..#.",
          ".#..##..##..#.",
          ".#..........#.",
          ".#...####...#.",
          ".#..........#.",
          "..##########..",
        ],
        [
          "......oo......",
          "......##......",
          "..##########..",
          ".#..........#.",
          ".#..........#.",
          ".#..##..##..#.",
          ".#..........#.",
          ".#...####...#.",
          ".#..........#.",
          "..##########..",
        ],
      ],
    },
  };

  class PixelSprite {
    constructor(canvas) {
      this.canvas = canvas;
      this.spec = SPRITES[canvas.dataset.sprite];
      if (!this.spec) return;
      this.pixel = Number(canvas.dataset.pixel || this.spec.pixel);
      this.rows = this.spec.frames[0].length;
      this.cols = [...this.spec.frames[0][0]].length;
      const ratio = Math.min(devicePixelRatio || 1, 2);
      canvas.width = this.cols * this.pixel * ratio;
      canvas.height = this.rows * this.pixel * ratio;
      canvas.style.width = `${this.cols * this.pixel}px`;
      canvas.style.height = `${this.rows * this.pixel}px`;
      this.context = canvas.getContext("2d");
      this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
      this.step = 0;
      this.timer = 0;
      this.lastFrame = this.spec.sequence[0][0];
      if (reducedMotion.matches) this.draw(this.lastFrame);
      else this.play();
      reducedMotion.addEventListener("change", () => {
        clearTimeout(this.timer);
        if (reducedMotion.matches) this.draw(this.spec.sequence[0][0]);
        else this.play();
      });
      document.addEventListener("visibilitychange", () => {
        clearTimeout(this.timer);
        if (!document.hidden && !reducedMotion.matches) this.play();
      });
    }

    draw(frameIndex) {
      const colors = palette();
      const frame = this.spec.frames[frameIndex];
      this.context.clearRect(0, 0, this.cols * this.pixel, this.rows * this.pixel);
      frame.forEach((row, y) => [...row].forEach((cell, x) => {
        if (cell === ".") return;
        this.context.fillStyle = cell === "o" ? colors.accent : colors.ink;
        this.context.fillRect(x * this.pixel, y * this.pixel, this.pixel, this.pixel);
      }));
      this.lastFrame = frameIndex;
    }

    play() {
      const [frameIndex, hold] = this.spec.sequence[this.step];
      this.draw(frameIndex);
      this.timer = setTimeout(() => {
        this.step = (this.step + 1) % this.spec.sequence.length;
        this.play();
      }, hold);
    }
  }

  // Shared helper: run an animation loop only while the canvas is on screen
  // and the tab is visible.
  function runWhenVisible(canvas, start, stop) {
    let onScreen = false;
    const sync = () => {
      if (onScreen && !document.hidden && !reducedMotion.matches) start();
      else stop();
    };
    new IntersectionObserver((entries) => {
      onScreen = entries[0].isIntersecting;
      sync();
    }).observe(canvas);
    document.addEventListener("visibilitychange", sync);
    reducedMotion.addEventListener("change", sync);
  }

  const hash2 = (x, y) => {
    const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return value - Math.floor(value);
  };

  const BAYER_4 = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
  ];

  // Kimi-style dithered celestial bodies. One Bayer-dither engine, four
  // shapes: sphere (cratered moon), galaxy (spiral), ring (Saturn), target
  // (pulsing concentric waves).
  class PixelPlanet {
    constructor(canvas) {
      this.canvas = canvas;
      this.shape = canvas.dataset.shape || "sphere";
      this.cell = Number(canvas.dataset.cell || 4);
      this.fps = 12;
      this.frame = 0;
      this.lastDraw = 0;
      this.orbitText = (canvas.dataset.orbitText || "").toUpperCase();
      this.accentCrest = canvas.dataset.accentCrest === "true";
      this.spinOffset = 0;
      this.craters = [
        { lon: 0.4, lat: 0.3, r: 0.3, depth: 0.5 },
        { lon: 1.9, lat: -0.35, r: 0.24, depth: 0.55 },
        { lon: 3.1, lat: 0.1, r: 0.36, depth: 0.45 },
        { lon: 4.4, lat: 0.55, r: 0.2, depth: 0.6 },
        { lon: 5.3, lat: -0.6, r: 0.27, depth: 0.5 },
        { lon: 2.6, lat: 0.75, r: 0.16, depth: 0.65 },
        { lon: 0.9, lat: -0.75, r: 0.14, depth: 0.6 },
        { lon: 5.9, lat: 0.05, r: 0.12, depth: 0.7 },
        { lon: 3.9, lat: -0.15, r: 0.17, depth: 0.55 },
        { lon: 1.3, lat: 0.5, r: 0.11, depth: 0.6 },
      ];
      this.maria = [
        { lon: 2.2, lat: 0.15, r: 0.72, depth: 0.3 },
        { lon: 4.9, lat: -0.4, r: 0.58, depth: 0.26 },
        { lon: 0.2, lat: -0.1, r: 0.5, depth: 0.22 },
      ];
      this.resizeObserver = new ResizeObserver(() => this.mount());
      this.resizeObserver.observe(canvas);
      runWhenVisible(canvas, () => this.start(), () => this.stop());
    }

    mount() {
      const stage = setupCanvas(this.canvas, Number(this.canvas.dataset.maxDpr || 2));
      if (!stage) return;
      this.stage = stage;
      const size = Math.min(stage.width, stage.height);
      const bodyScale = Number(this.canvas.dataset.bodyScale || (this.shape === "sphere" ? 0.33 : 0.46));
      this.radius = size * bodyScale;
      this.orbitFont = Math.max(8, Math.round(size * 0.021));
      this.orbitRadius = size / 2 - this.orbitFont - 4;
      this.render(this.lastTime || 0);
    }

    refresh() { this.render(this.lastTime || 0); }

    start() {
      if (this.frame) return;
      const step = (now) => {
        this.frame = requestAnimationFrame(step);
        if (now - this.lastDraw < 1000 / this.fps) return;
        this.lastDraw = now;
        this.render(now / 1000);
      };
      this.frame = requestAnimationFrame(step);
    }

    stop() {
      cancelAnimationFrame(this.frame);
      this.frame = 0;
    }

    brightnessAt(nx, ny, rr, time, craterDirs) {
      if (this.shape === "galaxy") {
        const spin = time * 0.04 + this.spinOffset * 0.5;
        const ex = nx;
        const ey = ny * 2.1;
        const dist = ex * ex + ey * ey;
        if (dist > 1.2) return 0;
        const arm = 0.5 + 0.5 * Math.sin(2 * (Math.atan2(ey, ex) + spin) - Math.sqrt(dist) * 5.4);
        return Math.exp(-dist * 4) * 1.15 + arm * Math.exp(-dist * 2.2) * 0.8;
      }
      if (this.shape === "target") {
        if (rr > 1.02) return 0;
        const r = Math.sqrt(rr);
        return (0.5 + 0.5 * Math.cos(r * 13 - time * 1.1)) * Math.exp(-rr * 1.5) + (r < 0.09 ? 0.35 : 0);
      }
      if (this.shape === "ring") {
        const SPHERE = 0.6;
        let value = 0;
        if (rr < SPHERE * SPHERE) {
          const sx = nx / SPHERE;
          const sy = ny / SPHERE;
          const sz = Math.sqrt(Math.max(0, 1 - sx * sx - sy * sy));
          value = Math.max(0, sx * 0.45 - sy * 0.42 + sz * 0.74) * (0.3 + 0.7 * sz);
        }
        const tilt = ny * 3.3;
        const ellipse = Math.hypot(nx, tilt);
        let band = Math.exp(-((ellipse - 0.85) ** 2) / 0.008);
        if (rr < SPHERE * SPHERE && ny < 0) band = 0;
        if (band > 0.04) {
          const shimmer = 0.6 + 0.25 * Math.sin(Math.atan2(tilt, nx) * 9 + time * 0.35);
          value = Math.max(value, band * shimmer);
        }
        return value;
      }
      if (rr > 1) return 0;
      const nz = Math.sqrt(1 - rr);
      let value = Math.max(0, nx * 0.74 - ny * 0.56 + nz * 0.32) * (0.45 + 0.55 * nz);
      for (const sea of craterDirs.maria) {
        if (sea.z < 0) continue;
        const dot = nx * sea.x + ny * sea.y + nz * sea.z;
        if (dot > sea.cos) {
          const edge = (dot - sea.cos) / (1 - sea.cos);
          value *= 1 - sea.depth * Math.min(1, edge * 1.4);
        }
      }
      for (const crater of craterDirs.craters) {
        if (crater.z < 0) continue;
        const dot = nx * crater.x + ny * crater.y + nz * crater.z;
        if (dot > crater.cos) {
          const edge = (dot - crater.cos) / (1 - crater.cos);
          value *= 1 - crater.depth * Math.min(1, edge * 2.2);
        } else if (dot > crater.rimCos) {
          value = Math.min(1.05, value * 1.14);
        }
      }
      value += 0.06 * Math.sin((Math.atan2(nx, nz) + craterDirs.spin) * 9 + 2 * Math.sin(ny * 17))
        * Math.sin(ny * 23 + 2 * Math.sin((Math.atan2(nx, nz) + craterDirs.spin) * 7));
      return value;
    }

    render(time) {
      if (!this.stage) return;
      this.lastTime = time;
      const { context, width, height } = this.stage;
      const colors = palette();
      const centerX = width / 2;
      const centerY = height / 2;
      const spin = time * 0.15 + this.spinOffset;
      const toDir = (spot, rimFactor) => {
        const lon = spot.lon + spin;
        return {
          x: Math.cos(spot.lat) * Math.sin(lon),
          y: Math.sin(spot.lat),
          z: Math.cos(spot.lat) * Math.cos(lon),
          cos: Math.cos(spot.r),
          rimCos: Math.cos(spot.r * (rimFactor || 1)),
          depth: spot.depth,
        };
      };
      const craterDirs = this.shape !== "sphere" ? null : {
        spin,
        craters: this.craters.map((crater) => toDir(crater, 1.3)),
        maria: this.maria.map((sea) => toDir(sea)),
      };
      const ALPHAS = [0, 0.2, 0.48, 0.85];
      const gap = this.cell > 6 ? 0 : 1;
      const limit = Math.ceil(Math.min(width, height) / 2 / this.cell);
      let currentFill = "";
      context.clearRect(0, 0, width, height);
      for (let gy = -limit; gy <= limit; gy += 1) {
        for (let gx = -limit; gx <= limit; gx += 1) {
          const nx = (gx * this.cell) / this.radius;
          const ny = (gy * this.cell) / this.radius;
          const rr = nx * nx + ny * ny;
          let brightness = this.brightnessAt(nx, ny, rr, time, craterDirs);
          if (brightness <= 0) continue;
          const crest = this.accentCrest && brightness > 0.95;
          brightness += (hash2(gx, gy) - 0.5) * 0.14;
          const threshold = (BAYER_4[(gy + limit) % 4][(gx + limit) % 4] + 0.5) / 16;
          let level = Math.floor(brightness * 3 + threshold);
          level = Math.max(0, Math.min(3, level));
          if (!level) continue;
          const fill = crest ? colors.accent : colors.ink;
          if (fill !== currentFill) {
            context.fillStyle = fill;
            currentFill = fill;
          }
          context.globalAlpha = ALPHAS[level];
          context.fillRect(
            centerX + gx * this.cell - this.cell / 2,
            centerY + gy * this.cell - this.cell / 2,
            this.cell - gap,
            this.cell - gap,
          );
        }
      }
      if (this.orbitText) {
        context.globalAlpha = 0.85;
        context.fillStyle = colors.muted;
        context.font = `700 ${this.orbitFont}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
        context.textAlign = "center";
        context.textBaseline = "middle";
        const phrase = [...this.orbitText];
        const ideal = Math.floor((Math.PI * 2 * this.orbitRadius) / (this.orbitFont * 0.8));
        const slots = phrase.length * Math.max(1, Math.round(ideal / phrase.length));
        const baseAngle = -time * 0.05;
        for (let index = 0; index < slots; index += 1) {
          const character = phrase[index % phrase.length];
          if (character === " ") continue;
          const angle = baseAngle + (index / slots) * Math.PI * 2;
          context.save();
          context.translate(centerX + Math.sin(angle) * this.orbitRadius, centerY - Math.cos(angle) * this.orbitRadius);
          context.rotate(angle);
          context.fillText(character, 0, 0);
          context.restore();
        }
      }
      context.globalAlpha = 1;
    }
  }

  // sasuke-style character field: a flowing sea of ASCII glyphs whose density
  // follows a moving brightness field; pointer movement stirs ripples.
  class AsciiWave {
    constructor(canvas) {
      this.canvas = canvas;
      this.ramp = " .·:;=+*x#@";
      this.cellWidth = 9;
      this.cellHeight = 15;
      this.fps = 12;
      this.frame = 0;
      this.lastDraw = 0;
      this.ripples = [];
      this.lastRippleAt = 0;
      this.resizeObserver = new ResizeObserver(() => this.mount());
      this.resizeObserver.observe(canvas);
      const surface = canvas.parentElement || canvas;
      surface.addEventListener("pointermove", (event) => {
        const now = performance.now();
        if (now - this.lastRippleAt < 70) return;
        this.lastRippleAt = now;
        const bounds = this.canvas.getBoundingClientRect();
        this.ripples.push({ x: event.clientX - bounds.left, y: event.clientY - bounds.top, at: now / 1000 });
        if (this.ripples.length > 6) this.ripples.shift();
      }, { passive: true });
      runWhenVisible(canvas, () => this.start(), () => this.stop());
    }

    buildAtlas() {
      const ratio = Math.min(devicePixelRatio || 1, 2);
      const colors = palette();
      this.atlas = {};
      for (const [name, color] of [["ink", colors.ink], ["accent", colors.accent]]) {
        const atlas = document.createElement("canvas");
        atlas.width = this.ramp.length * this.cellWidth * ratio;
        atlas.height = this.cellHeight * ratio;
        const context = atlas.getContext("2d");
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.font = "12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillStyle = color;
        for (let index = 1; index < this.ramp.length; index += 1) {
          context.fillText(this.ramp[index], index * this.cellWidth + this.cellWidth / 2, this.cellHeight / 2);
        }
        this.atlas[name] = atlas;
      }
      this.atlasRatio = ratio;
    }

    mount() {
      const stage = setupCanvas(this.canvas);
      if (!stage) return;
      this.stage = stage;
      this.cols = Math.ceil(stage.width / this.cellWidth);
      this.rows = Math.ceil(stage.height / this.cellHeight);
      this.buildAtlas();
      this.render(this.lastTime || 0);
    }

    refresh() {
      this.buildAtlas();
      this.render(this.lastTime || 0);
    }

    start() {
      if (this.frame) return;
      const step = (now) => {
        this.frame = requestAnimationFrame(step);
        if (now - this.lastDraw < 1000 / this.fps) return;
        this.lastDraw = now;
        this.render(now / 1000);
      };
      this.frame = requestAnimationFrame(step);
    }

    stop() {
      cancelAnimationFrame(this.frame);
      this.frame = 0;
    }

    field(x, y, time) {
      let value = 0.42
        + 0.3 * Math.sin(x * 0.31 + time * 1.35 + Math.sin(y * 0.8 - time * 0.6))
        + 0.22 * Math.sin((x + y * 1.7) * 0.16 - time * 0.9);
      const centerX = x * this.cellWidth + this.cellWidth / 2;
      const centerY = y * this.cellHeight + this.cellHeight / 2;
      for (const ripple of this.ripples) {
        const age = time - ripple.at;
        if (age < 0 || age > 1.3) continue;
        const distance = Math.hypot(centerX - ripple.x, centerY - ripple.y);
        const ring = distance - age * 120;
        value += Math.exp(-(ring * ring) / 500) * (1 - age / 1.3) * 0.9;
      }
      const edge = Math.min(y, this.rows - 1 - y) / Math.max(1, this.rows - 1);
      return value * (0.55 + 0.9 * edge);
    }

    render(time) {
      if (!this.stage || !this.atlas) return;
      this.lastTime = time;
      const { context, width, height } = this.stage;
      const ratio = this.atlasRatio;
      context.clearRect(0, 0, width, height);
      for (let y = 0; y < this.rows; y += 1) {
        for (let x = 0; x < this.cols; x += 1) {
          const value = this.field(x, y, time);
          let index = Math.floor(value * this.ramp.length);
          index = Math.max(0, Math.min(this.ramp.length - 1, index));
          if (!index) continue;
          const atlas = value > 1 ? this.atlas.accent : this.atlas.ink;
          context.globalAlpha = 0.35 + 0.65 * Math.min(1, value);
          context.drawImage(
            atlas,
            index * this.cellWidth * ratio, 0, this.cellWidth * ratio, this.cellHeight * ratio,
            x * this.cellWidth, y * this.cellHeight, this.cellWidth, this.cellHeight,
          );
        }
      }
      context.globalAlpha = 1;
    }
  }

  // Full-page pixel starfield, painted by the shared assets/starfield.js
  // module — zero per-frame cost, repainted only on resize or theme change.
  class StarBackdrop {
    constructor() {
      this.canvas = document.createElement("canvas");
      this.canvas.id = "star-backdrop";
      this.canvas.setAttribute("aria-hidden", "true");
      document.body.prepend(this.canvas);
      this.resizeFrame = 0;
      this.paint();
      addEventListener("resize", () => {
        cancelAnimationFrame(this.resizeFrame);
        this.resizeFrame = requestAnimationFrame(() => this.paint());
      }, { passive: true });
    }

    refresh() { this.paint(); }

    paint() {
      if (typeof window.Starfield === "undefined") return;
      window.Starfield.paint(this.canvas, palette().ink);
    }
  }

  // Night-sky layer for the hero scene: a twinkling "dog" constellation,
  // an occasional shooting star, and a satellite crossing every so often.
  class SceneField {
    constructor(canvas) {
      this.canvas = canvas;
      this.fps = 12;
      this.frame = 0;
      this.lastDraw = 0;
      this.meteor = null;
      this.nextMeteorAt = 3;
      this.stars = [
        [0.04, 0.5], [0.14, 0.34], [0.26, 0.4], [0.36, 0.26],
        [0.46, 0.38], [0.4, 0.66], [0.16, 0.7],
      ];
      this.links = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [1, 6]];
      this.resizeObserver = new ResizeObserver(() => this.mount());
      this.resizeObserver.observe(canvas);
      runWhenVisible(canvas, () => this.start(), () => this.stop());
    }

    mount() {
      const stage = setupCanvas(this.canvas);
      if (!stage) return;
      this.stage = stage;
      this.render(this.lastTime || 0);
    }

    refresh() { this.render(this.lastTime || 0); }

    start() {
      if (this.frame) return;
      const step = (now) => {
        this.frame = requestAnimationFrame(step);
        if (now - this.lastDraw < 1000 / this.fps) return;
        this.lastDraw = now;
        this.render(now / 1000);
      };
      this.frame = requestAnimationFrame(step);
    }

    stop() {
      cancelAnimationFrame(this.frame);
      this.frame = 0;
    }

    render(time) {
      if (!this.stage) return;
      this.lastTime = time;
      const { context, width, height } = this.stage;
      const colors = palette();
      const snap = (value) => Math.round(value / 4) * 4;
      context.clearRect(0, 0, width, height);

      const boxX = width * 0.3;
      const boxY = 10;
      const boxWidth = Math.min(190, width * 0.24);
      const boxHeight = 78;
      context.strokeStyle = colors.muted;
      context.globalAlpha = 0.34;
      context.setLineDash([2, 4]);
      context.lineWidth = 1;
      for (const [from, to] of this.links) {
        context.beginPath();
        context.moveTo(boxX + this.stars[from][0] * boxWidth, boxY + this.stars[from][1] * boxHeight);
        context.lineTo(boxX + this.stars[to][0] * boxWidth, boxY + this.stars[to][1] * boxHeight);
        context.stroke();
      }
      context.setLineDash([]);
      this.stars.forEach(([px, py], index) => {
        const phase = Math.floor(time * 1.6 + index * 1.3) % 4;
        context.globalAlpha = [0.4, 0.7, 1, 0.7][phase];
        context.fillStyle = index === 3 ? colors.accent : colors.ink;
        context.fillRect(snap(boxX + px * boxWidth), snap(boxY + py * boxHeight), 4, 4);
      });

      const SATELLITE_PERIOD = 36;
      const satelliteX = snap(((time % SATELLITE_PERIOD) / SATELLITE_PERIOD) * (width + 80) - 40);
      const satelliteY = 20;
      context.fillStyle = colors.muted;
      context.globalAlpha = 0.55;
      context.fillRect(satelliteX - 14, satelliteY + 2, 8, 4);
      context.fillRect(satelliteX + 6, satelliteY + 2, 8, 4);
      context.globalAlpha = 0.85;
      context.fillStyle = colors.ink;
      context.fillRect(satelliteX - 4, satelliteY, 8, 8);
      if (Math.floor(time * 2) % 2) {
        context.fillStyle = colors.accent;
        context.fillRect(satelliteX - 2, satelliteY - 6, 4, 4);
      }

      if (!this.meteor && time > this.nextMeteorAt) {
        this.meteor = { born: time, x: width * (0.3 + Math.random() * 0.6), y: 4 + Math.random() * 20 };
      }
      if (this.meteor) {
        const age = time - this.meteor.born;
        if (age > 0.9 || age < 0) {
          this.meteor = null;
          this.nextMeteorAt = time + 6 + Math.random() * 10;
        } else {
          const headX = this.meteor.x - age * 300;
          const headY = this.meteor.y + age * 110;
          context.fillStyle = colors.ink;
          for (let segment = 0; segment < 7; segment += 1) {
            context.globalAlpha = (1 - age / 0.9) * (1 - segment / 7) * 0.9;
            context.fillRect(snap(headX + segment * 8), snap(headY - segment * 3), 4, 4);
          }
        }
      }
      context.globalAlpha = 1;
    }
  }

  // Tiny scrolling ECG-style waveform for the telemetry strip.
  class TeleWave {
    constructor(canvas) {
      this.canvas = canvas;
      this.pattern = [0, 0, 0, 1, 0, -1, 4, -3, 1, 0, 0, 1, 0, 0, 0, 2, 0];
      this.fps = 8;
      this.frame = 0;
      this.lastDraw = 0;
      this.resizeObserver = new ResizeObserver(() => this.mount());
      this.resizeObserver.observe(canvas);
      runWhenVisible(canvas, () => this.start(), () => this.stop());
    }

    mount() {
      const stage = setupCanvas(this.canvas);
      if (!stage) return;
      this.stage = stage;
      this.render(this.lastTime || 0);
    }

    refresh() { this.render(this.lastTime || 0); }

    start() {
      if (this.frame) return;
      const step = (now) => {
        this.frame = requestAnimationFrame(step);
        if (now - this.lastDraw < 1000 / this.fps) return;
        this.lastDraw = now;
        this.render(now / 1000);
      };
      this.frame = requestAnimationFrame(step);
    }

    stop() {
      cancelAnimationFrame(this.frame);
      this.frame = 0;
    }

    render(time) {
      if (!this.stage) return;
      this.lastTime = time;
      const { context, width, height } = this.stage;
      const colors = palette();
      const cols = Math.floor(width / 4);
      const mid = Math.round(height / 2 / 4) * 4;
      const shift = Math.floor(time * 7);
      context.clearRect(0, 0, width, height);
      for (let col = 0; col < cols; col += 1) {
        const value = this.pattern[(col + shift) % this.pattern.length];
        context.fillStyle = value >= 3 ? colors.accent : colors.muted;
        context.globalAlpha = value >= 3 ? 0.95 : 0.7;
        context.fillRect(col * 4, mid - value * 3 - 2, 3, 3);
      }
      context.globalAlpha = 1;
    }
  }

  // Small pixel burst wherever the pointer clicks.
  class ClickBurst {
    constructor() {
      this.canvas = document.createElement("canvas");
      this.canvas.id = "click-burst";
      this.canvas.setAttribute("aria-hidden", "true");
      document.body.append(this.canvas);
      this.context = this.canvas.getContext("2d");
      this.bursts = [];
      this.frame = 0;
      this.resize();
      addEventListener("resize", () => this.resize(), { passive: true });
      addEventListener("pointerdown", (event) => {
        if (reducedMotion.matches) return;
        this.bursts.push({ x: event.clientX, y: event.clientY, at: performance.now() });
        if (this.bursts.length > 4) this.bursts.shift();
        this.start();
      }, { passive: true });
    }

    resize() {
      const ratio = Math.min(devicePixelRatio || 1, 1.5);
      this.canvas.width = Math.round(innerWidth * ratio);
      this.canvas.height = Math.round(innerHeight * ratio);
      this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    start() {
      if (this.frame) return;
      const colors = palette();
      const snap = (value) => Math.round(value / 4) * 4;
      const step = (now) => {
        this.context.clearRect(0, 0, innerWidth, innerHeight);
        this.bursts = this.bursts.filter((burst) => now - burst.at < 380);
        for (const burst of this.bursts) {
          const age = (now - burst.at) / 380;
          const distance = 6 + age * 20;
          for (let index = 0; index < 6; index += 1) {
            const angle = (index / 6) * Math.PI * 2 + 0.5;
            this.context.fillStyle = index === 0 ? colors.accent : colors.ink;
            this.context.globalAlpha = (1 - age) * 0.9;
            this.context.fillRect(
              snap(burst.x + Math.cos(angle) * distance),
              snap(burst.y + Math.sin(angle) * distance),
              4, 4,
            );
          }
        }
        this.context.globalAlpha = 1;
        if (this.bursts.length) this.frame = requestAnimationFrame(step);
        else this.frame = 0;
      };
      this.frame = requestAnimationFrame(step);
    }
  }

  // Gentle pixel rain — a quiet drizzle of thin phosphor streaks falling
  // across the whole page. Low alpha, slow pace, a slight wind. The rare
  // accent-coloured drop is a tiny warm detail. Sits with the moon and the
  // dithered starfield as part of the same rainy-night sky.
  class Rain {
    constructor() {
      this.canvas = document.createElement("canvas");
      this.canvas.id = "rain-field";
      this.canvas.setAttribute("aria-hidden", "true");
      document.body.append(this.canvas);
      this.ctx = this.canvas.getContext("2d");
      this.frame = 0;
      this.resizeFrame = 0;
      this.colors = palette();
      this.splashes = [];
      this.surfaceY = -1;
      this.surfaceL = 0;
      this.surfaceR = 0;
      this.surfaceEl = document.querySelector(".opening-title") || document.querySelector(".post-banner") || document.querySelector(".banner-stage");
      this.resize();
      this.measureSurface();
      addEventListener("resize", () => {
        cancelAnimationFrame(this.resizeFrame);
        this.resizeFrame = requestAnimationFrame(() => { this.resize(); this.measureSurface(); });
      }, { passive: true });
      addEventListener("scroll", () => {
        cancelAnimationFrame(this.scrollFrame);
        this.scrollFrame = requestAnimationFrame(() => this.measureSurface());
      }, { passive: true });
      reducedMotion.addEventListener("change", () => {
        cancelAnimationFrame(this.frame);
        if (reducedMotion.matches) this.draw();
        else this.start();
      });
      document.addEventListener("visibilitychange", () => {
        cancelAnimationFrame(this.frame);
        if (!document.hidden && !reducedMotion.matches) this.start();
      });
      if (reducedMotion.matches) this.draw();
      else this.start();
    }
    refresh() { this.colors = palette(); if (reducedMotion.matches) this.draw(); }
    measureSurface() {
      if (!this.surfaceEl) { this.surfaceY = -1; return; }
      const r = this.surfaceEl.getBoundingClientRect();
      if (r.bottom < 0 || r.top > this.height) { this.surfaceY = -1; return; }
      this.surfaceY = r.top + r.height * 0.34;
      this.surfaceL = r.left;
      this.surfaceR = r.right;
    }
    resize() {
      const ratio = Math.min(devicePixelRatio || 1, 1.5);
      this.width = innerWidth;
      this.height = innerHeight;
      this.canvas.width = Math.round(this.width * ratio);
      this.canvas.height = Math.round(this.height * ratio);
      this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = Math.round(this.width / 26);
      this.drops = Array.from({ length: count }, () => this.spawn(true));
      if (reducedMotion.matches) this.draw();
    }
    spawn(anywhere) {
      return {
        x: Math.random() * this.width,
        y: anywhere ? Math.random() * this.height : -22,
        vy: 150 + Math.random() * 130,
        vx: 12 + Math.random() * 16,
        headAlpha: 0.6 + Math.random() * 0.32,
        accent: Math.random() < 0.08,
      };
    }
    spawnSplash(x, y) {
      this.splashes.push({ x, y, at: performance.now() });
      if (this.splashes.length > 16) this.splashes.shift();
    }
    drawDrop(d) {
      const ctx = this.ctx, c = this.colors, segs = 6;
      for (let i = segs - 1; i >= 0; i -= 1) {
        const a = d.headAlpha * (i === 0 ? 1 : 1 - i / segs);
        if (a < 0.05) continue;
        ctx.globalAlpha = a;
        ctx.fillStyle = i === 0 && d.accent ? c.accent : c.ink;
        if (i === 0) ctx.fillRect(d.x | 0, d.y | 0, 2, 3);
        else ctx.fillRect(d.x | 0, (d.y - i * 2) | 0, 1, 2);
      }
    }
    drawSplash(s, now) {
      const age = (now - s.at) / 340;
      if (age >= 1) return false;
      const ctx = this.ctx, c = this.colors;
      const r = 1 + age * 7;
      const a = (1 - age) * 0.6;
      ctx.fillStyle = c.accent;
      ctx.globalAlpha = a;
      for (let k = 0; k < 8; k += 1) {
        const ang = (k / 8) * Math.PI * 2;
        ctx.fillRect((s.x + Math.cos(ang) * r) | 0, (s.y + Math.sin(ang) * r) | 0, 1, 1);
      }
      ctx.globalAlpha = Math.min(1, a * 1.6);
      for (let j = 0; j < 3; j += 1) {
        const ang = -Math.PI / 2 + (j - 1) * 0.7;
        const dx = Math.cos(ang) * age * 11;
        const dy = Math.sin(ang) * age * 11 + age * age * 9;
        ctx.fillRect((s.x + dx) | 0, (s.y + dy) | 0, 2, 2);
      }
      return true;
    }
    draw(now) {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.width, this.height);
      for (const d of this.drops) this.drawDrop(d);
      if (now) this.splashes = this.splashes.filter((s) => this.drawSplash(s, now));
      ctx.globalAlpha = 1;
    }
    start() {
      this.last = performance.now();
      const FRAME = 1000 / 30;
      let acc = 0;
      const step = (now) => {
        this.frame = requestAnimationFrame(step);
        let dt = now - this.last;
        this.last = now;
        if (dt > 120) dt = 120;
        acc += dt;
        if (acc < FRAME) return;
        const s = acc / 1000;
        acc = 0;
        for (const d of this.drops) {
          const prevY = d.y;
          d.y += d.vy * s;
          d.x += d.vx * s;
          if (this.surfaceY > 0 && d.x >= this.surfaceL && d.x <= this.surfaceR && prevY < this.surfaceY && d.y >= this.surfaceY) {
            this.spawnSplash(d.x, this.surfaceY);
            Object.assign(d, this.spawn(false));
          } else if (d.y > this.height + 24 || d.x > this.width + 24) {
            Object.assign(d, this.spawn(false));
          }
        }
        this.draw(now);
      };
      this.frame = requestAnimationFrame(step);
    }
  }

  const hasFont = typeof window.DotFont !== "undefined";
  const bannerCanvas = document.querySelector("[data-pixel-banner]");
  const banner = hasFont && bannerCanvas ? new PixelBanner(bannerCanvas) : null;
  const stamps = hasFont
    ? [...document.querySelectorAll("[data-pixel-date]")].map((canvas) => new PixelStamp(canvas))
    : [];
  const fieldCanvas = document.querySelector("#drift-field");
  const field = fieldCanvas ? new DriftField(fieldCanvas) : null;
  const sprites = [...document.querySelectorAll("[data-sprite]")]
    .map((canvas) => new PixelSprite(canvas))
    .filter((sprite) => sprite.spec);
  const planets = [...document.querySelectorAll("[data-planet]")].map((canvas) => new PixelPlanet(canvas));
  const waves = [...document.querySelectorAll("[data-ascii-wave]")].map((canvas) => new AsciiWave(canvas));
  const sceneFields = [...document.querySelectorAll("[data-scene-field]")].map((canvas) => new SceneField(canvas));
  const backdrop = new StarBackdrop();
  const rainField = new Rain();
  const teleWaves = [...document.querySelectorAll("[data-tele-wave]")].map((canvas) => new TeleWave(canvas));
  new ClickBurst();

  // Terminal boot lines: type themselves out once on load.
  document.querySelectorAll("[data-bootline]").forEach((line) => {
    const text = line.dataset.bootline || "";
    if (reducedMotion.matches) {
      line.textContent = text;
      return;
    }
    let index = 0;
    const timer = setInterval(() => {
      index += 1;
      line.textContent = text.slice(0, index);
      if (index >= text.length) clearInterval(timer);
    }, 26);
  });

  // Log seals stamp down when they scroll into view.
  const seals = document.querySelectorAll(".log-seal");
  if (seals.length) {
    const sealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-stamped");
          sealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    seals.forEach((seal) => sealObserver.observe(seal));
  }

  lightScheme.addEventListener("change", () => {
    banner && banner.drawStatic();
    stamps.forEach((stamp) => stamp.draw());
    field && field.refreshColors();
    sprites.forEach((sprite) => sprite.draw(sprite.lastFrame));
    planets.forEach((planet) => planet.refresh());
    waves.forEach((wave) => wave.refresh());
    sceneFields.forEach((scene) => scene.refresh());
    teleWaves.forEach((wave) => wave.refresh());
    rainField && rainField.refresh();
    backdrop.refresh();
  });

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-shatter]");
    if (!link || event.defaultPrevented) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    if (reducedMotion.matches || !banner || !banner.stage) return;
    event.preventDefault();
    document.body.classList.add("is-leaving");
    let navigated = false;
    const go = () => {
      if (navigated) return;
      navigated = true;
      location.assign(link.href);
    };
    banner.shatter(go);
    setTimeout(go, 640);
  });

  addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    document.body.classList.remove("is-leaving");
    banner && banner.mount(true);
  });

  const progress = document.querySelector("#read-progress");
  if (progress) {
    const SEGMENTS = 28;
    let ticking = false;
    const update = () => {
      ticking = false;
      const max = document.documentElement.scrollHeight - innerHeight;
      const ratio = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 1;
      progress.style.setProperty("--filled", Math.round(ratio * SEGMENTS));
      progress.setAttribute("aria-valuenow", String(Math.round(ratio * 100)));
    };
    addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });
    addEventListener("resize", update, { passive: true });
    update();
  }

  // Scroll parallax: the galaxy (far layer) sinks and recedes, post emblems
  // drift along. Transform-only, rAF-throttled.
  const parallaxLayers = [];
  const sceneGalaxy = document.querySelector(".scene .galaxy");
  const postEmblem = document.querySelector(".post-emblem");
  if (sceneGalaxy) {
    parallaxLayers.push((y) => {
      sceneGalaxy.style.transform =
        `translate(${(Math.round(Math.min(24, y * 0.02) / 4) * 4)}px, ${(Math.round(Math.min(16, y * 0.05) / 4) * 4)}px)`;
    });
  }
  if (postEmblem) {
    parallaxLayers.push((y) => {
      postEmblem.style.transform = `translateY(${Math.min(130, y * 0.09).toFixed(1)}px)`;
    });
  }

  // Opening moon: stays put as a fixed backdrop while the first screen of
  // content scrolls over it. Crossing the trigger point starts a self-driven
  // docking animation (time-based, not scroll-scrubbed) that flies the moon
  // into its slot in the scene band; scrolling back re-launches it.
  const openingMoon = document.querySelector("[data-opening-moon]");
  const morphTarget = document.querySelector("[data-morph-target]");
  const openingSection = document.querySelector(".opening");
  if (openingMoon && morphTarget && openingSection && !reducedMotion.matches) {
    const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2);
    const DURATION = 950;
    let metrics = null;
    let docked = false;
    let animFrame = 0;
    let progress = 0;
    const measure = () => {
      const openRect = openingSection.getBoundingClientRect();
      const targetRect = morphTarget.getBoundingClientRect();
      const moonSize = openingMoon.offsetWidth || 1;
      const openTopDoc = openRect.top + scrollY;
      metrics = {
        aLeft: innerWidth * 0.3 - moonSize / 2,
        aTop: openTopDoc + openRect.height * 1.02 - moonSize / 2,
        aSize: moonSize,
        bLeft: targetRect.left,
        bTopDoc: targetRect.top + scrollY,
        bSize: morphTarget.offsetWidth || 1,
        trigger: Math.max(200, openRect.height * 0.55),
      };
    };
    const renderPose = (p) => {
      if (!metrics) return;
      const targetTopViewport = metrics.bTopDoc - scrollY;
      const left = metrics.aLeft + (metrics.bLeft - metrics.aLeft) * p;
      const top = metrics.aTop + (targetTopViewport - metrics.aTop) * p;
      const scale = Math.pow(metrics.bSize / metrics.aSize, p);
      openingMoon.style.transform = `translate(${left.toFixed(1)}px, ${top.toFixed(1)}px) scale(${scale.toFixed(4)})`;
      const fade = p < 0.72 ? 1 : 1 - (p - 0.72) / 0.28;
      openingMoon.style.opacity = fade.toFixed(3);
      openingMoon.style.visibility = p >= 0.999 ? "hidden" : "visible";
      morphTarget.style.opacity = p >= 0.999 ? "1" : (1 - fade).toFixed(3);
    };
    const flyTo = (target) => {
      cancelAnimationFrame(animFrame);
      const from = progress;
      let startedAt = 0;
      const step = (now) => {
        if (!startedAt) startedAt = now;
        const t = Math.min(1, (now - startedAt) / DURATION);
        progress = from + (target - from) * easeInOut(t);
        renderPose(progress);
        if (t < 1) animFrame = requestAnimationFrame(step);
        else animFrame = 0;
      };
      animFrame = requestAnimationFrame(step);
    };
    morphTarget.style.opacity = "0";
    measure();
    renderPose(0);
    addEventListener("scroll", () => {
      if (!metrics) return;
      if (!docked && scrollY > metrics.trigger) {
        docked = true;
        flyTo(1);
      } else if (docked && scrollY < metrics.trigger - 160) {
        docked = false;
        flyTo(0);
      }
    }, { passive: true });
    addEventListener("resize", () => {
      measure();
      renderPose(progress);
    }, { passive: true });
  } else if (morphTarget) {
    morphTarget.style.opacity = "1";
  }

  if (parallaxLayers.length && !reducedMotion.matches) {
    let parallaxTicking = false;
    const applyParallax = () => {
      parallaxTicking = false;
      const y = scrollY;
      parallaxLayers.forEach((layer) => layer(y));
    };
    addEventListener("scroll", () => {
      if (parallaxTicking) return;
      parallaxTicking = true;
      requestAnimationFrame(applyParallax);
    }, { passive: true });
    applyParallax();
  }

  // Arrow-key navigation between adjacent logs, mirroring the archive's keys.
  const adjacentPrev = document.querySelector(".post-adjacent .prev");
  const adjacentNext = document.querySelector(".post-adjacent .next");
  if (adjacentPrev || adjacentNext) {
    addEventListener("keydown", (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (window.__tetrisPlaying) return;
      const target = event.target;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (event.key === "ArrowLeft" && adjacentPrev) adjacentPrev.click();
      if (event.key === "ArrowRight" && adjacentNext) adjacentNext.click();
    });
  }
})();

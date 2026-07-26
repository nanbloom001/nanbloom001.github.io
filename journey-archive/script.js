const events = [
  ["2023.06.19", "START", "拥有第一台笔记本，开始把好奇心留在代码与文件夹里。", ["起点", "个人设备"]],
  ["2023.09.01", "HHU", "进入河海大学，开始智能科学与技术专业学习。", ["HHU", "智能科学"]],
  ["2023.10.04", "HELLO, C", "第一节 C 语言课，从第一行代码开始建立工程直觉。", ["C", "编程入门"]],
  ["2024.01.01", "EASYX GAME", "使用 EasyX 完成 C 语言大作业，第一次把交互想法做成可运行的游戏。", ["EasyX", "C 游戏"]],
  ["2024.09.20", "ZZLAB", "加入智泽实验室，在真实项目与团队协作中拓宽技术视野。", ["ZZLAB", "实验室"]],
  ["2024.12.08", "ALGO 2024", "参加全球校园人工智能算法精英大赛，获得全国二等奖。", ["国二", "算法竞赛"]],
  ["2024.12.31", "GIT INIT", "注册 GitHub，开始沉淀代码、实验记录与项目版本。", ["GitHub", "开源记录"]],
  ["2025.05.14", "SERVICE 16", "参加第 16 届服创大赛，获得东部赛区三等奖。", ["东部赛区", "三等奖"]],
  ["2025.06.26", "AI NATIVE", "注册 Gemini 账号，开始系统接触 AI Coding 与 AI 协作开发。", ["Gemini", "AI Coding"]],
  ["2025.08.10", "CHIP CUP", "参加全国大学生嵌入式芯片与系统设计竞赛，获得东部赛区二等奖。", ["嵌入式", "东部赛区二等奖"]],
  ["2025.08.25", "SOFTWARE CUP", "参加中国软件杯大学生软件设计大赛，获得全国一等奖。", ["软件杯", "国一"]],
  ["2025.12.21", "ALGO 2025", "再次参加全球校园人工智能算法精英大赛，获得全国一等奖。", ["算法竞赛", "国一"]],
  ["2026.03.07", "SIM2REAL", "首次完成自研四足机器人强化学习策略的 Sim2Real 部署闭环。", ["四足机器人", "强化学习", "Sim2Real"]],
  ["2026.03.31", "LINUX DO", "加入 Linux.do 社区，持续关注开发者工具与 AI 原生实践。", ["开源社区", "开发者"]],
  ["2026.04.07", "JINZHI", "加入金智机器人有限公司实习，把学习与项目实践带到真实工作场景。", ["实习", "机器人"]],
  ["2026.06.25", "SERVICE 17", "第 17 届服创赛获东部赛区一等奖，正在冲击国奖。", ["东部赛区一等奖", "冲击国奖"]],
  ["NOW", "EXAM MODE", "正在备战 2027 考研，同时持续积累机器人与 AI 开发实践。", ["27 考研", "长期主义"]],
];

// Character-level phosphor accents. Indices include spaces and punctuation so
// the selected cells stay attached to the same glyph throughout every morph.
const titleAccentIndices = new Map([
  ["HHU", [0, 1, 2]],
  ["HELLO, C", [7]],
  ["EASYX GAME", [4]],
  ["ZZLAB", [3]],
  ["GIT INIT", [1]],
  ["AI NATIVE", [0, 1]],
  ["SIM2REAL", [3]],
  ["LINUX DO", [6, 7]],
  ["JINZHI", [3]],
]);

const list = document.querySelector("#index-list");
const minimap = document.querySelector("#minimap");
const progressTrack = document.querySelector("#progress-track");
const dotProgress = document.querySelector("#dot-progress");
const title = document.querySelector("#title");
const canvas = document.querySelector("#pixel-title");
const context = canvas.getContext("2d");
const dateCanvas = document.querySelector("#pixel-date");
const dateContext = dateCanvas.getContext("2d");
const memoryFile = document.querySelector("#memory-file");
const archiveRoot = document.querySelector(".archive");
const counterNode = document.querySelector("#counter");
const fileIndexNode = document.querySelector("#file-index");
const descriptionNode = document.querySelector("#description");
const progressReadoutNode = document.querySelector("#progress-readout");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const mobileLayout = matchMedia("(max-width: 760px)");
const colorScheme = matchMedia("(prefers-color-scheme: light)");
const scheduleIdle = window.requestIdleCallback
  ? (callback) => requestIdleCallback(callback, { timeout: 600 })
  : (callback) => setTimeout(() => callback({ didTimeout: true, timeRemaining: () => 8 }), 16);

let current = -1;
let confirmationTimer = 0;
let cycleTimers = [];
let cycleToken = 0;
let archiveVisible = true;

const NORMAL_PAGE_DURATION = 6000;
const FINAL_PAGE_DURATION = 18000;
const NORMAL_WAVE_ARRIVAL = 5260;
const FINAL_WAVE_ARRIVALS = [4000, 9000, 14000];
const WAVE_STEP_DURATION = 200;

class PixelTitle {
  constructor(element, drawingContext) {
    this.canvas = element;
    this.context = drawingContext;
    this.points = [];
    this.framePoints = [];
    this.text = "";
    this.animationFrame = 0;
    this.resizeFrame = 0;
    this.animating = false;
    this.lastSetAt = 0;
    this.cache = new Map();
    this.prewarmTexts = [];
    this.palette = null;
    this.autoEffects = ["row-scan", "scatter-rebuild", "terminal-type", "diagonal-scan", "vertical-roll"];
    this.effectBag = [];
    this.lastAutoEffect = "";
    this.alphaBuckets = Array.from({ length: 9 }, () => []);
    this.trailBuckets = Array.from({ length: 9 }, () => []);
    this.legacyTrails = [];
    this.trailOffsets = [.08, .16];
    this.canvas.dataset.font = "7x9-block-display";

    this.resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(this.resizeFrame);
      this.resizeFrame = requestAnimationFrame(() => this.resize());
    });
    this.resizeObserver.observe(this.canvas);
  }

  colors() {
    const styles = getComputedStyle(document.documentElement);
    return {
      ink: styles.getPropertyValue("--ink").trim(),
      accent: styles.getPropertyValue("--accent").trim(),
    };
  }

  resize() {
    const bounds = this.canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(bounds.width * ratio);
    this.canvas.height = Math.round(bounds.height * ratio);
    this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.width = bounds.width;
    this.height = bounds.height;
    this.trailOffsets = bounds.width < 420 || navigator.hardwareConcurrency <= 4
      ? [.13]
      : [.08, .16];
    this.canvas.dataset.renderTier = this.trailOffsets.length === 1 ? "compact" : "full";
    this.cache.clear();
    this.palette = this.colors();

    if (this.text) {
      cancelAnimationFrame(this.animationFrame);
      this.animating = false;
      this.canvas.dataset.animating = "false";
      this.points = this.build(this.text);
      this.framePoints = this.points;
      this.draw(this.points);
    }
    if (this.prewarmTexts.length) this.prewarm(this.prewarmTexts);
  }

  settle() {
    if (!this.text || !this.width || !this.height) return;
    cancelAnimationFrame(this.animationFrame);
    this.points = this.build(this.text);
    this.framePoints = this.points;
    this.scanY = null;
    this.scanX = null;
    this.animating = false;
    this.canvas.dataset.animating = "false";
    this.draw(this.points);
  }

  cacheKey(text, accentText = text) {
    return `${text}|${accentText}|${Math.round(this.width)}|${Math.round(this.height)}`;
  }

  build(text, accentText = text) {
    const cacheKey = this.cacheKey(text, accentText);
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);
    const result = DotFont.makeBlockPoints(
      text,
      { cols: 7, rows: 9, maxPitch: 6.4, singleLine: true, pixelSize: 4 },
      { width: this.width, height: this.height },
    );
    const accentIndices = new Set(titleAccentIndices.get(accentText) || []);
    result.points.forEach((point) => {
      point.themeAccent = accentIndices.has(point.characterIndex);
    });
    this.canvas.dataset.font = "7x9-block-display";
    this.canvas.dataset.scale = "double-stroke";
    this.canvas.dataset.lines = String(result.lines);
    this.canvas.dataset.points = String(result.points.length);
    this.cache.set(cacheKey, result.points);
    return result.points;
  }

  drawPoint(point, size = point.size) {
    if (point.shape === "block") {
      this.context.fillRect(point.x - size / 2, point.y - size / 2, size, size);
      return;
    }
    this.context.beginPath();
    this.context.arc(point.x, point.y, size, 0, Math.PI * 2);
    this.context.fill();
  }

  resetBuckets(buckets) {
    buckets.forEach((bucket) => { bucket.length = 0; });
  }

  drawBuckets(points, mode = "all") {
    this.resetBuckets(this.alphaBuckets);
    points.forEach((point) => {
      if (mode === "theme" && !point.themeAccent) return;
      if (mode === "accent" && !point.accent && !point.themeAccent) return;
      const alpha = point.alpha === undefined ? 1 : point.alpha;
      const bucket = Math.max(0, Math.min(8, Math.round(alpha * 8)));
      if (bucket) this.alphaBuckets[bucket].push(point);
    });
    this.alphaBuckets.forEach((bucket, index) => {
      if (!bucket.length || !index) return;
      this.context.globalAlpha = index / 8;
      bucket.forEach((point) => this.drawPoint(point));
    });
    this.context.globalAlpha = 1;
  }

  drawTrails(points) {
    this.resetBuckets(this.trailBuckets);
    this.legacyTrails.length = 0;
    points.forEach((point) => {
      if (!point.trails) {
        if (point.trailX !== undefined) this.legacyTrails.push(point);
        return;
      }
      point.trails.forEach((trail) => {
        const alpha = (point.alpha === undefined ? 1 : point.alpha) * (trail.alpha || .3);
        const bucket = Math.max(0, Math.min(8, Math.round(alpha * 8)));
        if (!bucket) return;
        trail.renderSize = Math.max(1, point.size * (trail.scale || .58));
        this.trailBuckets[bucket].push(trail);
      });
    });
    this.trailBuckets.forEach((bucket, index) => {
      if (!bucket.length || !index) return;
      this.context.globalAlpha = index / 8;
      bucket.forEach((trail) => {
        this.context.fillRect(
          trail.x - trail.renderSize / 2,
          trail.y - trail.renderSize / 2,
          trail.renderSize,
          trail.renderSize,
        );
      });
    });
    if (this.legacyTrails.length) {
      this.context.globalAlpha = .375;
      this.legacyTrails.forEach((point) => {
        const size = Math.max(1, point.size * .58);
        this.context.fillRect(point.trailX - size / 2, point.trailY - size / 2, size, size);
      });
    }
    this.context.globalAlpha = 1;
  }

  draw(points, phase = 1, rapid = false, cinematic = false) {
    this.context.clearRect(0, 0, this.width, this.height);
    const colors = this.palette || this.colors();

    this.context.fillStyle = colors.ink;
    this.drawBuckets(points);

    this.context.fillStyle = colors.accent;
    this.drawBuckets(points, cinematic ? "accent" : "theme");

    if (!cinematic && !rapid && phase > .28 && phase < .72) {
      this.context.fillStyle = colors.accent;
      points.forEach((point, index) => {
        if (index % 23 !== 0) return;
        this.context.fillRect(point.x - point.size / 2, point.y - point.size / 2, point.size, point.size);
      });
    }

    if (cinematic) {
      this.context.fillStyle = colors.accent;
      this.drawTrails(points);

      if (Number.isFinite(this.scanY) && Number.isFinite(this.scanX)) {
        this.context.globalAlpha = .86;
        this.context.fillRect(this.scanX - 17, this.scanY - 1, 12, 2);
        this.context.fillRect(this.scanX - 3, this.scanY - 1, 2, 2);
        this.context.globalAlpha = 1;
      }
    }
  }

  nextAutoEffect() {
    const forced = this.canvas.dataset.nextEffect;
    if (forced && this.autoEffects.includes(forced)) {
      delete this.canvas.dataset.nextEffect;
      this.lastAutoEffect = forced;
      return forced;
    }

    if (!this.effectBag.length) {
      this.effectBag = [...this.autoEffects];
      for (let index = this.effectBag.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [this.effectBag[index], this.effectBag[swapIndex]] = [this.effectBag[swapIndex], this.effectBag[index]];
      }
      if (this.effectBag[0] === this.lastAutoEffect && this.effectBag.length > 1) {
        [this.effectBag[0], this.effectBag[1]] = [this.effectBag[1], this.effectBag[0]];
      }
    }

    const effect = this.effectBag.shift();
    this.lastAutoEffect = effect;
    return effect;
  }

  playCinematic(text, targets, config, renderFrame) {
    const startedAt = performance.now();
    this.text = text;
    this.animating = true;
    this.scanY = null;
    this.scanX = null;
    this.canvas.dataset.animating = "true";
    this.canvas.dataset.duration = String(config.duration);
    this.canvas.dataset.motion = config.motion;
    this.canvas.dataset.transition = "auto";
    this.canvas.dataset.releasePattern = config.releasePattern;
    this.canvas.dataset.particleLayers = String(config.particleLayers || 1);
    this.canvas.dataset.releaseBatches = String(config.releaseBatches || 1);
    this.canvas.dataset.trailSample = String(config.trailSample || 0);
    this.canvas.dataset.particlePolicy = config.particlePolicy || "fixed";

    const animate = (now) => {
      const progress = Math.min(1, (now - startedAt) / config.duration);
      const frame = renderFrame(progress);
      this.framePoints = frame;
      this.draw(frame, progress, false, true);

      if (progress < 1) {
        this.animationFrame = requestAnimationFrame(animate);
      } else {
        this.points = targets;
        this.framePoints = targets;
        this.scanY = null;
        this.scanX = null;
        this.animating = false;
        this.canvas.dataset.animating = "false";
        this.canvas.dataset.points = String(targets.length);
        this.draw(targets);
      }
    };
    this.animationFrame = requestAnimationFrame(animate);
  }

  createParticleRoutes(outgoing, targets, ordering = {}) {
    const sourcePoints = ordering.sources || this.spatialOrder(outgoing);
    const orderedTargets = ordering.targets || this.spatialOrder(targets);
    const sources = sourcePoints.map((point, index) => ({ point, index, routes: [] }));
    const used = new Map();

    orderedTargets.forEach((target, index) => {
      const sourceIndex = orderedTargets.length >= sources.length
        ? Math.min(sources.length - 1, Math.floor(index * sources.length / orderedTargets.length))
        : (orderedTargets.length === 1
          ? Math.floor((sources.length - 1) / 2)
          : Math.round(index * (sources.length - 1) / (orderedTargets.length - 1)));
      const cloneRank = used.get(sourceIndex) || 0;
      used.set(sourceIndex, cloneRank + 1);
      const route = {
        sourceIndex,
        target,
        index,
        cloneRank,
        isClone: cloneRank > 0,
      };
      sources[sourceIndex].routes.push(route);
    });

    return {
      sources,
      routes: sources.flatMap((source) => source.routes),
      extras: sources.filter((source) => !source.routes.length),
    };
  }

  routePosition(start, target, progress, seed, bend = 1) {
    const dx = target.x - start.x;
    const dy = target.y - start.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const side = seed % 2 ? 1 : -1;
    const curve = (11 + seed % 7 * 1.8) * side * bend;
    const controlX = (start.x + target.x) / 2 - dy / length * curve;
    const controlY = (start.y + target.y) / 2 + dx / length * curve;
    const inverse = 1 - progress;
    return {
      x: inverse * inverse * start.x + 2 * inverse * progress * controlX + progress * progress * target.x,
      y: inverse * inverse * start.y + 2 * inverse * progress * controlY + progress * progress * target.y,
    };
  }

  routeTrails(start, target, progress, seed, bend = 1) {
    const trails = [];
    this.trailOffsets.forEach((offset, index) => {
      if (progress <= offset) return;
      const position = this.routePosition(start, target, progress - offset, seed, bend);
      trails.push({
        ...position,
        alpha: .34 - index * .08,
        scale: .72 - index * .1,
      });
    });
    return trails;
  }

  startScatterRebuild(text, targets) {
    const outgoing = [...(this.framePoints.length ? this.framePoints : this.points)];
    const mapping = this.createParticleRoutes(outgoing, targets);
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const clamp = (value) => Math.max(0, Math.min(1, value));
    const smooth = (value) => value * value * (3 - 2 * value);
    const cloud = mapping.sources.map(({ point, index }) => {
      const angle = index * 2.399963 + Math.sin(index * .37) * .3;
      const radius = 18 + index % 9 * 1.85;
      return {
        x: point.x + Math.cos(angle) * radius + (point.x - centerX) * .16,
        y: point.y + Math.sin(angle) * radius + (point.y - centerY) * .18 - 4,
      };
    });
    this.canvas.dataset.sourceParticles = String(mapping.sources.length);
    this.canvas.dataset.targetParticles = String(mapping.routes.length);
    this.canvas.dataset.splitParticles = String(mapping.routes.filter((route) => route.isClone).length);
    this.canvas.dataset.fadingParticles = String(mapping.extras.length);

    this.playCinematic(text, targets, {
      duration: 1780,
      motion: "scatter-route-split-reassemble",
      releasePattern: "full-size-cloud-then-routed-rebuild",
      particleLayers: 4,
      releaseBatches: 2,
      trailSample: 4,
      particlePolicy: "split-missing-fade-excess-no-shrink",
    }, (progress) => {
      const frame = [];
      const scatterLocal = smooth(clamp(progress / .44));
      const transferLocal = smooth(clamp((progress - .5) / .5));

      if (progress < .5) {
        mapping.sources.forEach(({ point, index }) => {
          const destination = cloud[index];
          const x = point.x + (destination.x - point.x) * scatterLocal;
          const y = point.y + (destination.y - point.y) * scatterLocal - Math.sin(Math.PI * scatterLocal) * 5;
          frame.push({
            x,
            y,
            size: point.size,
            shape: point.shape,
            themeAccent: point.themeAccent,
            accent: progress > .12 && progress < .46 && index % 7 === 0,
            trails: progress > .12 && index % 6 === 0
              ? [{
                x: point.x + (destination.x - point.x) * clamp(scatterLocal - .16),
                y: point.y + (destination.y - point.y) * clamp(scatterLocal - .16),
                alpha: .28,
                scale: .7,
              }]
              : undefined,
          });
        });
        return frame;
      }

      mapping.routes.forEach((route) => {
        const start = cloud[route.sourceIndex];
        const routeDelay = route.isClone ? Math.min(.1, route.cloneRank * .035) : 0;
        const local = smooth(clamp((transferLocal - routeDelay) / (1 - routeDelay)));
        const position = this.routePosition(start, route.target, local, route.index, route.isClone ? 1.18 : 1);
        const alpha = route.isClone ? Math.round(smooth(clamp(local / .3)) * 8) / 8 : 1;
        const emphasized = (route.isClone && route.index % 7 === 0 && local < .72)
          || (route.index % 13 === 0 && local > .08 && local < .82);
        frame.push({
          ...position,
          size: route.target.size,
          shape: route.target.shape,
          themeAccent: route.target.themeAccent,
          alpha,
          accent: emphasized,
          trails: (route.index % 8 === 0 || emphasized) && local > .08 && local < .96
            ? this.routeTrails(start, route.target, local, route.index, route.isClone ? 1.18 : 1)
            : undefined,
        });
      });

      mapping.extras.forEach(({ point, index }) => {
        const start = cloud[index];
        const angle = index * 1.618 + .7;
        const target = {
          x: start.x + Math.cos(angle) * 24,
          y: start.y + Math.sin(angle) * 18 - 5,
        };
        const position = this.routePosition(start, target, transferLocal, index, .7);
        frame.push({
          ...position,
          size: point.size,
          shape: point.shape,
          themeAccent: point.themeAccent,
          alpha: Math.round((1 - transferLocal) * 8) / 8,
          accent: index % 8 === 0 && transferLocal < .72,
          trails: index % 6 === 0 && transferLocal > .1 && transferLocal < .88
            ? this.routeTrails(start, target, transferLocal, index, .7)
            : undefined,
        });
      });
      return frame;
    });
  }

  anchoredPrefixes(text, anchorX) {
    return Array.from({ length: text.length + 1 }, (_, length) => {
      if (!length) return [];
      const points = this.build(text.slice(0, length), text);
      const minX = Math.min(...points.map((point) => point.x));
      return points.map((point) => ({ ...point, x: point.x - minX + anchorX }));
    });
  }

  terminalCursor(points, anchorX, referencePoints, visible) {
    if (!visible) return [];
    const referenceY = referencePoints.length ? Math.max(...referencePoints.map((point) => point.y)) : this.height / 2;
    const endX = points.length ? Math.max(...points.map((point) => point.x)) + 7 : anchorX;
    return Array.from({ length: 4 }, (_, index) => ({
      x: endX + index * 4,
      y: referenceY + 6,
      size: 3,
      shape: "block",
      accent: true,
    }));
  }

  startTerminalType(text, targets) {
    const outgoing = [...(this.framePoints.length ? this.framePoints : this.points)];
    const oldText = this.text;
    const oldAnchor = outgoing.length ? Math.min(...outgoing.map((point) => point.x)) : this.width * .2;
    const newAnchor = targets.length ? Math.min(...targets.map((point) => point.x)) : oldAnchor;
    const oldPrefixes = this.anchoredPrefixes(oldText, oldAnchor);
    const newPrefixes = this.anchoredPrefixes(text, newAnchor);
    const clamp = (value) => Math.max(0, Math.min(1, value));
    const smooth = (value) => value * value * (3 - 2 * value);

    this.playCinematic(text, targets, {
      duration: 1660,
      motion: "terminal-delete-blink-type",
      releasePattern: "right-delete-cursor-left-type",
      particleLayers: 1,
      releaseBatches: oldText.length + text.length,
    }, (progress) => {
      let points = [];
      let anchor = oldAnchor;
      let reference = outgoing;
      let cursorVisible = true;

      if (progress < .3) {
        const local = smooth(progress / .3);
        const length = Math.max(0, Math.ceil(oldText.length * (1 - local)));
        points = oldPrefixes[length];
      } else if (progress < .5) {
        points = [];
        cursorVisible = Math.floor((progress - .3) / .05) % 2 === 0;
      } else {
        const local = smooth(clamp((progress - .5) / .43));
        const length = Math.min(text.length, Math.floor(text.length * local + .001));
        points = newPrefixes[length];
        anchor = newAnchor;
        reference = targets;
        cursorVisible = progress < .97 || Math.floor(progress * 40) % 2 === 0;
      }

      return [...points, ...this.terminalCursor(points, anchor, reference, cursorVisible)];
    });
  }

  diagonalRatio(point, bounds) {
    const width = Math.max(1, bounds.maxX - bounds.minX);
    const height = Math.max(1, bounds.maxY - bounds.minY);
    return ((point.x - bounds.minX) / width + (point.y - bounds.minY) / height) / 2;
  }

  pointBounds(points) {
    return {
      minX: Math.min(...points.map((point) => point.x)),
      maxX: Math.max(...points.map((point) => point.x)),
      minY: Math.min(...points.map((point) => point.y)),
      maxY: Math.max(...points.map((point) => point.y)),
    };
  }

  startDiagonalScan(text, targets) {
    const outgoing = [...(this.framePoints.length ? this.framePoints : this.points)];
    const oldBounds = this.pointBounds(outgoing);
    const newBounds = this.pointBounds(targets);
    const sourceOrder = [...outgoing].sort((left, right) => (
      this.diagonalRatio(left, oldBounds) - this.diagonalRatio(right, oldBounds)
      || left.y - right.y
      || left.x - right.x
    ));
    const targetOrder = [...targets].sort((left, right) => left.x - right.x || left.y - right.y);
    const mapping = this.createParticleRoutes(outgoing, targets, { sources: sourceOrder, targets: targetOrder });
    const clamp = (value) => Math.max(0, Math.min(1, value));
    const smooth = (value) => value * value * (3 - 2 * value);
    const cloud = mapping.sources.map(({ point, index }) => {
      const angle = index * 2.399963 + .35;
      const radiusX = 12 + index % 6 * 1.4;
      const radiusY = 10 + index % 5 * 1.3;
      return {
        x: point.x + Math.cos(angle) * radiusX + 5,
        y: point.y + Math.sin(angle) * radiusY + 5,
      };
    });
    const scatterEnd = (source) => .02 + this.diagonalRatio(source.point, oldBounds) * .4 + .18;
    const targetWidth = Math.max(1, newBounds.maxX - newBounds.minX);
    const targetLeftRatio = (target) => (target.x - newBounds.minX) / targetWidth;
    const routeStart = (route) => Math.max(
      .18 + targetLeftRatio(route.target) * .36,
      scatterEnd(mapping.sources[route.sourceIndex]) + .025,
    );
    this.canvas.dataset.sourceParticles = String(mapping.sources.length);
    this.canvas.dataset.targetParticles = String(mapping.routes.length);
    this.canvas.dataset.splitParticles = String(mapping.routes.filter((route) => route.isClone).length);
    this.canvas.dataset.fadingParticles = String(mapping.extras.length);

    this.playCinematic(text, targets, {
      duration: 1980,
      motion: "diagonal-overlap-dissolve-rebuild",
      releasePattern: "top-left-scan-with-immediate-left-to-right-reassembly",
      particleLayers: 3,
      releaseBatches: 12,
      trailSample: 4,
      particlePolicy: "old-residue-cloud-and-new-glyph-overlap",
    }, (progress) => {
      const frame = [];

      mapping.sources.forEach((source) => {
        const { point, index, routes } = source;
        const diagonal = this.diagonalRatio(point, oldBounds);
        const release = .02 + diagonal * .4;
        const scatterLocal = smooth(clamp((progress - release) / .18));
        const destination = cloud[index];
        const scattered = {
          x: point.x + (destination.x - point.x) * scatterLocal,
          y: point.y + (destination.y - point.y) * scatterLocal,
        };
        const activeScan = scatterLocal > 0 && scatterLocal < 1;

        if (!routes.length) {
          const fadeStart = release + .22;
          if (progress < fadeStart) {
            frame.push({
              ...scattered,
              role: scatterLocal < .96 ? "old-residue" : "cloud",
              size: point.size,
              shape: point.shape,
              themeAccent: point.themeAccent,
              accent: activeScan && index % 3 === 0,
              trails: activeScan && index % 5 === 0
                ? [{ x: point.x, y: point.y, alpha: .26, scale: .7 }]
                : undefined,
            });
            return;
          }

          const local = smooth(clamp((progress - fadeStart) / Math.max(.01, .98 - fadeStart)));
          const angle = index * 1.73 + .4;
          const endpoint = {
            x: destination.x + Math.cos(angle) * 22,
            y: destination.y + Math.sin(angle) * 18,
          };
          const position = this.routePosition(destination, endpoint, local, index, .72);
          frame.push({
            ...position,
            role: "fading-excess",
            size: point.size,
            shape: point.shape,
            themeAccent: point.themeAccent,
            alpha: Math.round((1 - local) * 8) / 8,
            accent: index % 8 === 0 && local < .7,
            trails: index % 6 === 0 && local > .08 && local < .9
              ? this.routeTrails(destination, endpoint, local, index, .72)
              : undefined,
          });
          return;
        }

        const firstStart = Math.min(...routes.map(routeStart));
        if (progress <= firstStart) {
          frame.push({
            ...scattered,
            role: scatterLocal < .96 ? "old-residue" : "cloud",
            size: point.size,
            shape: point.shape,
            themeAccent: point.themeAccent,
            accent: activeScan && index % 3 === 0,
            trails: activeScan && index % 5 === 0
              ? [{ x: point.x, y: point.y, alpha: .26, scale: .7 }]
              : undefined,
          });
        }

        routes.forEach((route) => {
          const startAt = routeStart(route) + (route.isClone ? Math.min(.06, route.cloneRank * .018) : 0);
          const routeDuration = Math.min(.28, Math.max(.16, .98 - startAt));
          const local = smooth(clamp((progress - startAt) / routeDuration));
          if (local <= 0) return;
          const position = this.routePosition(destination, route.target, local, route.index, route.isClone ? 1.2 : 1);
          const alpha = route.isClone ? Math.round(smooth(clamp(local / .24)) * 8) / 8 : 1;
          const emphasized = (route.isClone && route.index % 7 === 0 && local < .72)
            || (route.index % 13 === 0 && local < .82);
          frame.push({
            ...position,
            role: local > .68 ? "formed-glyph" : "migrating-particle",
            size: route.target.size,
            shape: route.target.shape,
            themeAccent: route.target.themeAccent,
            alpha,
            accent: emphasized,
            trails: (route.index % 8 === 0 || emphasized) && local > .06 && local < .96
              ? this.routeTrails(destination, route.target, local, route.index, route.isClone ? 1.2 : 1)
              : undefined,
          });
        });
      });
      return frame;
    });
  }

  startVerticalRoll(text, targets) {
    const outgoing = [...(this.framePoints.length ? this.framePoints : this.points)];
    const smooth = (value) => value * value * (3 - 2 * value);

    this.playCinematic(text, targets, {
      duration: 1180,
      motion: "vertical-screen-roll",
      releasePattern: "old-down-new-from-top",
      particleLayers: 2,
      releaseBatches: 2,
    }, (progress) => {
      const eased = smooth(progress);
      const offset = this.height * 1.08;
      const oldPoints = outgoing.map((point) => ({
        ...point,
        y: point.y + offset * eased,
      }));
      const newPoints = targets.map((point) => ({
        ...point,
        y: point.y - offset * (1 - eased),
      }));
      return [...oldPoints, ...newPoints];
    });
  }

  spatialOrder(points) {
    return [...points].sort((left, right) => left.y - right.y || left.x - right.x);
  }

  prewarm(texts) {
    this.prewarmTexts = [...new Set(texts)];
    const queue = this.prewarmTexts.filter((text) => !this.cache.has(this.cacheKey(text)));
    const work = (deadline) => {
      let built = 0;
      while (queue.length && (deadline.timeRemaining() > 2 || (deadline.didTimeout && built < 2))) {
        this.build(queue.shift());
        built += 1;
      }
      if (queue.length) scheduleIdle(work);
    };
    if (queue.length) scheduleIdle(work);
  }

  tagRows(points) {
    const rowValues = [...new Set(points.map((point) => Math.round(point.y * 100) / 100))].sort((left, right) => left - right);
    const rowLookup = new Map(rowValues.map((value, index) => [value, index]));
    return {
      rows: rowValues,
      points: points.map((point, index) => ({
        ...point,
        particleIndex: index,
        row: rowLookup.get(Math.round(point.y * 100) / 100) || 0,
      })),
    };
  }

  startRowScan(text, targets) {
    const outgoing = this.tagRows(this.framePoints.length ? this.framePoints : this.points);
    const incoming = this.tagRows(targets);
    const duration = 1480;
    const startedAt = performance.now();
    const centerX = this.width / 2;
    const minX = Math.min(
      ...outgoing.points.map((point) => point.x),
      ...incoming.points.map((point) => point.x),
    );
    const smooth = (value) => value * value * (3 - 2 * value);
    const clamp = (value) => Math.max(0, Math.min(1, value));

    this.text = text;
    this.animating = true;
    this.canvas.dataset.animating = "true";
    this.canvas.dataset.duration = String(duration);
    this.canvas.dataset.motion = "row-scan-disassemble-reassemble";
    this.canvas.dataset.transition = "auto";
    this.canvas.dataset.scanRows = String(Math.max(outgoing.rows.length, incoming.rows.length));
    this.canvas.dataset.scanPhases = "disassemble,hold,reassemble";
    this.canvas.dataset.particleLayers = "1";
    this.canvas.dataset.releaseBatches = String(outgoing.rows.length);
    this.canvas.dataset.releasePattern = "top-to-bottom-rows";
    this.canvas.dataset.releaseDelay = "78";
    this.canvas.dataset.trailSample = "4";

    const animate = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const frame = [];

      outgoing.points.forEach((point) => {
        const rowRatio = outgoing.rows.length > 1 ? point.row / (outgoing.rows.length - 1) : 0;
        const rowStart = .02 + rowRatio * .42;
        const local = clamp((progress - rowStart) / .09);
        if (local >= 1) return;

        const eased = smooth(local);
        const arc = Math.sin(Math.PI * eased);
        const direction = point.x < centerX ? -1 : 1;
        const distance = 17 + (point.particleIndex % 7) * 1.6;
        const curve = Math.sin(point.particleIndex * 1.73) * 4.6 * arc;
        const x = point.x + direction * distance * eased + curve;
        const y = point.y + (point.row % 2 ? -1 : 1) * 7 * arc + eased * 2.5;
        const size = point.size * (1 - eased * .9);
        frame.push({
          x,
          y,
          size,
          shape: point.shape,
          themeAccent: point.themeAccent,
          accent: local > 0 && local < .86,
          trailX: local > .08 && local < .9 && point.particleIndex % 4 === 0 ? x - direction * 6 : undefined,
          trailY: local > .08 && local < .9 && point.particleIndex % 4 === 0 ? y - curve * .32 : undefined,
        });
      });

      incoming.points.forEach((point) => {
        const rowRatio = incoming.rows.length > 1 ? point.row / (incoming.rows.length - 1) : 0;
        const rowStart = .64 + rowRatio * .28;
        const local = clamp((progress - rowStart) / .08);
        if (local <= 0) return;

        const eased = smooth(local);
        const inverse = 1 - eased;
        const arc = Math.sin(Math.PI * eased);
        const direction = point.x < centerX ? -1 : 1;
        const distance = 18 + (point.particleIndex % 7) * 1.45;
        const curve = Math.cos(point.particleIndex * 1.41) * 4.2 * arc;
        const x = point.x + direction * distance * inverse + curve;
        const y = point.y + (point.row % 2 ? 1 : -1) * 6.5 * arc - inverse * 2.5;
        const size = point.size * (.18 + eased * .82);
        frame.push({
          x,
          y,
          size,
          shape: point.shape,
          themeAccent: point.themeAccent,
          accent: local < .72,
          trailX: local > .06 && local < .78 && point.particleIndex % 4 === 0 ? x + direction * 5.5 : undefined,
          trailY: local > .06 && local < .78 && point.particleIndex % 4 === 0 ? y + curve * .3 : undefined,
        });
      });

      if (progress < .55) {
        const rowPosition = clamp((progress - .02) / .42) * Math.max(0, outgoing.rows.length - 1);
        this.scanY = outgoing.rows[Math.min(outgoing.rows.length - 1, Math.round(rowPosition))];
      } else if (progress >= .64) {
        const rowPosition = clamp((progress - .64) / .28) * Math.max(0, incoming.rows.length - 1);
        this.scanY = incoming.rows[Math.min(incoming.rows.length - 1, Math.round(rowPosition))];
      } else {
        this.scanY = null;
      }
      this.scanX = minX;
      this.framePoints = frame;
      this.draw(frame, progress, false, true);

      if (progress < 1) {
        this.animationFrame = requestAnimationFrame(animate);
      } else {
        this.points = targets;
        this.framePoints = targets;
        this.scanY = null;
        this.scanX = null;
        this.animating = false;
        this.canvas.dataset.animating = "false";
        this.draw(targets);
      }
    };
    this.animationFrame = requestAnimationFrame(animate);
  }

  set(text, immediate = false, transitionMode = "manual") {
    if (!this.width || !this.height) this.resize();
    const accentIndices = titleAccentIndices.get(text) || [];
    this.canvas.dataset.accentIndices = accentIndices.join(",");
    this.canvas.dataset.accentGlyphs = accentIndices.map((index) => text[index]).join("");
    if (!this.width || !this.height || (text === this.text && this.points.length)) return;
    const setAt = performance.now();
    const cinematic = transitionMode === "auto";
    const rapid = !cinematic && (this.animating || setAt - this.lastSetAt < 190);
    this.lastSetAt = setAt;
    const targets = this.build(text);
    cancelAnimationFrame(this.animationFrame);

    if (immediate || reducedMotion.matches || !this.points.length) {
      this.text = text;
      this.points = targets;
      this.framePoints = targets;
      this.animating = false;
      this.canvas.dataset.animating = "false";
      this.draw(targets);
      return;
    }

    if (cinematic) {
      const effect = this.nextAutoEffect();
      this.canvas.dataset.autoEffect = effect;
      if (effect === "scatter-rebuild") this.startScatterRebuild(text, targets);
      else if (effect === "terminal-type") this.startTerminalType(text, targets);
      else if (effect === "diagonal-scan") this.startDiagonalScan(text, targets);
      else if (effect === "vertical-roll") this.startVerticalRoll(text, targets);
      else this.startRowScan(text, targets);
      return;
    }

    const starts = this.spatialOrder(this.framePoints.length ? this.framePoints : this.points);
    const orderedTargets = this.spatialOrder(targets);
    const scatter = cinematic ? 9 : (rapid ? .6 : 5.2);
    const particles = orderedTargets.map((target, index) => {
      const start = starts[Math.floor(index * starts.length / orderedTargets.length)] || target;
      const angle = index * 2.399963;
      const normalizedX = Math.max(0, Math.min(.999, start.x / Math.max(1, this.width)));
      const releaseBatch = cinematic ? Math.floor(normalizedX * 5) : 0;
      return {
        start,
        target,
        offsetX: Math.cos(angle) * scatter,
        offsetY: Math.sin(angle) * scatter,
        delay: cinematic ? releaseBatch * .09 + (index % 5) * .0025 : 0,
        releaseBatch,
        orbit: angle * .37,
        layer: index % 5,
      };
    });

    const startedAt = performance.now();
    const duration = cinematic ? 900 : (rapid ? 175 : 310);
    this.canvas.dataset.duration = String(duration);
    this.canvas.dataset.motion = cinematic
      ? "cinematic-particle-reassembly"
      : (rapid ? "continuous-morph" : "compact-particle-shift");
    this.canvas.dataset.transition = transitionMode;
    this.canvas.dataset.particleLayers = cinematic ? "5" : "1";
    this.canvas.dataset.releaseBatches = cinematic ? "5" : "1";
    this.canvas.dataset.releasePattern = cinematic ? "left-to-right-columns" : "simultaneous";
    this.canvas.dataset.releaseDelay = cinematic ? "333" : "0";
    this.canvas.dataset.trailSample = cinematic ? "19" : "0";
    this.text = text;
    this.animating = true;
    this.canvas.dataset.animating = "true";

    const animate = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const smooth = (value) => value * value * (3 - 2 * value);
      this.framePoints = particles.map((particle) => {
        const local = Math.max(0, Math.min(1, (progress - particle.delay) / (1 - particle.delay)));
        const time = cinematic
          ? (local < .38
            ? smooth(local / .38) * .15
            : .15 + smooth((local - .38) / .62) * .85)
          : smooth(local);
        const dispersion = Math.sin(Math.PI * local);
        const orbitAngle = local * Math.PI * 2 + particle.orbit;
        const swirl = cinematic ? dispersion * (1.7 + particle.layer * .34) : 0;
        const baseX = particle.start.x + (particle.target.x - particle.start.x) * time;
        const baseY = particle.start.y + (particle.target.y - particle.start.y) * time;
        const x = baseX + particle.offsetX * dispersion + Math.cos(orbitAngle) * swirl;
        const y = baseY + particle.offsetY * dispersion + Math.sin(orbitAngle) * swirl * .68;
        const shrink = cinematic ? .14 : (rapid ? .025 : .08);
        const pulse = cinematic ? Math.sin(orbitAngle) * dispersion * .035 : 0;
        return {
          x,
          y,
          trailX: cinematic ? x - Math.cos(orbitAngle) * 3.2 : undefined,
          trailY: cinematic ? y - Math.sin(orbitAngle) * 2.2 : undefined,
          size: particle.target.size * (1 - dispersion * shrink + pulse),
          shape: particle.target.shape,
          themeAccent: particle.target.themeAccent,
        };
      });
      this.draw(this.framePoints, progress, rapid, cinematic);
      if (progress < 1) {
        this.animationFrame = requestAnimationFrame(animate);
      } else {
        this.points = targets;
        this.framePoints = targets;
        this.animating = false;
        this.canvas.dataset.animating = "false";
        this.draw(targets);
      }
    };
    this.animationFrame = requestAnimationFrame(animate);
  }
}

class PixelDate {
  constructor(element, drawingContext) {
    this.canvas = element;
    this.context = drawingContext;
    this.text = "";
    this.animationFrame = 0;
    this.animating = false;
    this.ratio = 1;
    this.slotWidth = 26;
    this.lastSetAt = 0;
    this.glyphCache = new Map();
    this.prewarmCharacters = [];
    this.wheelPositions = [];
    this.ink = "";
    this.previousFrame = document.createElement("canvas");
    this.previousContext = this.previousFrame.getContext("2d");
    this.canvas.dataset.motion = "per-character-odometer";
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.canvas);
  }

  resize() {
    const bounds = this.canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    this.ratio = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(bounds.width * this.ratio);
    this.canvas.height = Math.round(bounds.height * this.ratio);
    this.previousFrame.width = this.canvas.width;
    this.previousFrame.height = this.canvas.height;
    this.context.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
    this.width = bounds.width;
    this.height = bounds.height;
    this.ink = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
    this.glyphCache.clear();
    if (this.text) {
      cancelAnimationFrame(this.animationFrame);
      this.animating = false;
      this.canvas.dataset.animating = "false";
      this.draw(this.text);
    }
    if (this.prewarmCharacters.length) this.prewarm(this.prewarmCharacters);
  }

  settle() {
    if (!this.text || !this.width || !this.height) return;
    cancelAnimationFrame(this.animationFrame);
    this.animating = false;
    this.canvas.dataset.animating = "false";
    this.context.clearRect(0, 0, this.width, this.height);
    this.drawText(this.text);
  }

  layout(text) {
    const characters = [...String(text || "").toUpperCase()];
    const width = characters.length * this.slotWidth;
    return { characters, startX: (this.width - width) / 2 };
  }

  glyph(character) {
    if (!character) return [];
    if (this.glyphCache.has(character)) return this.glyphCache.get(character);
    const points = DotFont.makeCompactPoints(
      character,
      { maxPitch: 4.8, pixelSize: 5 },
      { width: this.slotWidth, height: this.height },
    ).points;
    this.glyphCache.set(character, points);
    return points;
  }

  drawCharacter(character, x, offsetY = 0, opacity = 1) {
    this.context.fillStyle = this.ink;
    this.context.globalAlpha = opacity;
    this.glyph(character).forEach((point) => this.context.fillRect(
      x + point.x - point.size / 2,
      point.y - point.size / 2 + offsetY,
      point.size,
      point.size,
    ));
    this.context.globalAlpha = 1;
  }

  drawText(text) {
    const layout = this.layout(text);
    layout.characters.forEach((character, index) => {
      this.drawCharacter(character, layout.startX + index * this.slotWidth);
    });
    this.wheelPositions = layout.characters.map((character) => /\d/.test(character) ? Number(character) : null);
  }

  drawWheel(position, direction, x) {
    const value = Math.max(0, Math.min(9, position));
    const rounded = Math.round(value);
    if (Math.abs(value - rounded) < .001) {
      this.drawCharacter(String(rounded), x);
      return;
    }

    if (direction > 0) {
      const currentDigit = Math.floor(value);
      const nextDigit = Math.min(9, currentDigit + 1);
      const fraction = value - currentDigit;
      this.drawCharacter(String(currentDigit), x, fraction * this.height, 1 - fraction * .12);
      this.drawCharacter(String(nextDigit), x, -(1 - fraction) * this.height, .88 + fraction * .12);
      return;
    }

    const currentDigit = Math.ceil(value);
    const nextDigit = Math.max(0, currentDigit - 1);
    const fraction = currentDigit - value;
    this.drawCharacter(String(currentDigit), x, -fraction * this.height, 1 - fraction * .12);
    this.drawCharacter(String(nextDigit), x, (1 - fraction) * this.height, .88 + fraction * .12);
  }

  draw(text) {
    if (!this.width || !this.height) this.resize();
    if (!this.width || !this.height) return;
    this.text = text;
    this.context.clearRect(0, 0, this.width, this.height);
    this.drawText(text);
    this.canvas.dataset.font = "5x7-compact-display";
    this.canvas.setAttribute("aria-label", text);
  }

  directionFor(fromCharacter, toCharacter, navigationDirection) {
    if (/\d/.test(fromCharacter) && /\d/.test(toCharacter)) {
      const difference = Number(toCharacter) - Number(fromCharacter);
      if (difference < 0) return -1;
      if (difference > 0) return 1;
    }
    return navigationDirection < 0 ? -1 : 1;
  }

  prewarm(characters) {
    this.prewarmCharacters = [...new Set([...characters])];
    const queue = this.prewarmCharacters.filter((character) => !this.glyphCache.has(character));
    const work = (deadline) => {
      let built = 0;
      while (queue.length && (deadline.timeRemaining() > 2 || (deadline.didTimeout && built < 3))) {
        this.glyph(queue.shift());
        built += 1;
      }
      if (queue.length) scheduleIdle(work);
    };
    if (queue.length) scheduleIdle(work);
  }

  set(text, immediate = false, navigationDirection = 1, transitionMode = "manual") {
    if (!this.width || !this.height) this.resize();
    if (!this.width || !this.height || text === this.text) return;

    const previousText = this.text;
    const previousLayout = this.layout(previousText);
    const nextLayout = this.layout(text);
    const previousFrame = this.previousFrame;
    this.previousContext.clearRect(0, 0, previousFrame.width, previousFrame.height);
    this.previousContext.drawImage(this.canvas, 0, 0);
    cancelAnimationFrame(this.animationFrame);
    this.text = text;
    this.canvas.setAttribute("aria-label", text);
    this.canvas.dataset.font = "5x7-compact-display";

    if (immediate || reducedMotion.matches || !previousText) {
      this.animating = false;
      this.canvas.dataset.animating = "false";
      this.context.clearRect(0, 0, this.width, this.height);
      this.drawText(text);
      return;
    }

    const setAt = performance.now();
    const cinematic = transitionMode === "auto";
    const rapid = !cinematic && (this.animating || setAt - this.lastSetAt < 190);
    this.lastSetAt = setAt;
    const slotCount = Math.max(previousLayout.characters.length, nextLayout.characters.length);
    let changedOrder = 0;
    const transitions = Array.from({ length: slotCount }, (_, index) => {
      const fromCharacter = previousLayout.characters[index] || "";
      const toCharacter = nextLayout.characters[index] || "";
      const numericWheel = /\d/.test(fromCharacter) && /\d/.test(toCharacter);
      const startValue = numericWheel && Number.isFinite(this.wheelPositions[index])
        ? this.wheelPositions[index]
        : Number(fromCharacter);
      const targetValue = Number(toCharacter);
      const wheelDistance = numericWheel ? Math.abs(targetValue - startValue) : 0;
      const changed = fromCharacter !== toCharacter || wheelDistance > .001;
      const direction = numericWheel && wheelDistance > .001
        ? Math.sign(targetValue - startValue)
        : this.directionFor(fromCharacter, toCharacter, navigationDirection);
      const transitionDuration = numericWheel
        ? (cinematic
          ? Math.min(780, Math.max(430, 360 + wheelDistance * 52))
          : rapid
          ? Math.min(320, Math.max(170, 145 + wheelDistance * 22))
          : Math.min(460, Math.max(220, 185 + wheelDistance * 34)))
        : (cinematic ? 560 : (rapid ? 190 : 300));
      return {
        fromCharacter,
        toCharacter,
        fromX: previousLayout.startX + index * this.slotWidth,
        toX: nextLayout.startX + index * this.slotWidth,
        changed,
        staggerIndex: changed ? changedOrder++ : 0,
        numericWheel,
        startValue,
        targetValue,
        duration: transitionDuration,
        direction,
      };
    });
    this.canvas.dataset.changingSlots = transitions
      .map((transition, index) => transition.changed ? String(index) : "")
      .filter(Boolean)
      .join(",");
    this.canvas.dataset.directions = transitions
      .map((transition, index) => transition.changed ? `${index}:${transition.direction}` : "")
      .filter(Boolean)
      .join(",");
    const startedAt = performance.now();
    const stagger = cinematic ? 16 : (rapid ? 0 : 10);
    const duration = Math.max(
      0,
      ...transitions
        .filter((transition) => transition.changed)
        .map((transition) => transition.duration + transition.staggerIndex * stagger),
    );
    this.animating = true;
    this.canvas.dataset.animating = "true";
    this.canvas.dataset.duration = String(duration);
    this.canvas.dataset.frames = "intermediate-digits";
    this.canvas.dataset.transition = transitionMode;

    const easeInOutCubic = (value) => value < .5
      ? 4 * value * value * value
      : 1 - Math.pow(-2 * value + 2, 3) / 2;

    const animate = (now) => {
      this.context.clearRect(0, 0, this.width, this.height);
      let finished = true;

      transitions.forEach((transition, index) => {
        if (!transition.changed) {
          this.wheelPositions[index] = /\d/.test(transition.toCharacter) ? Number(transition.toCharacter) : null;
          this.drawCharacter(transition.toCharacter, transition.toX);
          return;
        }

        const delay = transition.staggerIndex * stagger;
        const progress = Math.max(0, Math.min(1, (now - startedAt - delay) / transition.duration));
        if (progress < 1) finished = false;
        const eased = easeInOutCubic(progress);
        const x = transition.fromX + (transition.toX - transition.fromX) * eased;

        if (transition.numericWheel) {
          const position = transition.startValue + (transition.targetValue - transition.startValue) * eased;
          this.wheelPositions[index] = position;
          this.drawWheel(position, transition.direction, x);
          return;
        }

        const sourceX = Math.max(0, transition.fromX * this.ratio);
        const sourceWidth = Math.min(this.slotWidth * this.ratio, previousFrame.width - sourceX);
        if (transition.fromCharacter && sourceWidth > 0) {
          this.context.globalAlpha = 1 - eased * .12;
          this.context.drawImage(
            previousFrame,
            sourceX,
            0,
            sourceWidth,
            previousFrame.height,
            x,
            transition.direction * eased * this.height,
            sourceWidth / this.ratio,
            this.height,
          );
          this.context.globalAlpha = 1;
        }
        this.drawCharacter(
          transition.toCharacter,
          transition.toX,
          -transition.direction * (1 - eased) * this.height,
          .88 + eased * .12,
        );
        this.wheelPositions[index] = /\d/.test(transition.toCharacter) ? Number(transition.toCharacter) : null;
      });

      if (!finished) {
        this.animationFrame = requestAnimationFrame(animate);
      } else {
        this.animating = false;
        this.canvas.dataset.animating = "false";
        this.context.clearRect(0, 0, this.width, this.height);
        this.drawText(text);
      }
    };
    this.animationFrame = requestAnimationFrame(animate);
  }
}

const pixelTitle = new PixelTitle(canvas, context);
const pixelDate = new PixelDate(dateCanvas, dateContext);

dotProgress.setAttribute("aria-valuemax", String(events.length));
progressTrack.style.setProperty("--total", events.length);

const buttons = events.map((event, index) => {
  const button = document.createElement("button");
  button.className = "entry";
  button.innerHTML = `
    <span>${String(index + 1).padStart(2, "0")}</span>
    <span>${event[1]}</span>
  `;
  button.addEventListener("pointerenter", () => select(index));
  button.addEventListener("focus", () => select(index));
  button.addEventListener("click", () => select(index));
  list.appendChild(button);
  return button;
});

const miniNodes = events.map(() => {
  const node = document.createElement("span");
  node.className = "mini-node";
  minimap.appendChild(node);
  return node;
});

const progressButtons = [];
const progressNodes = events.map((event, index) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "progress-step";
  button.setAttribute("aria-label", `切换到节点 ${String(index + 1).padStart(2, "0")}：${event[1]}`);
  button.addEventListener("click", () => select(index));

  const node = document.createElement("span");
  node.className = "progress-node";
  node.dataset.index = String(index + 1).padStart(2, "0");
  node.style.setProperty("--load-index", index);
  node.setAttribute("aria-hidden", "true");
  button.appendChild(node);
  dotProgress.appendChild(button);
  progressButtons.push(button);
  return node;
});

function setNodeState(nodes, selectedIndex) {
  nodes.forEach((node, index) => {
    node.classList.toggle("is-complete", index < selectedIndex);
    node.classList.toggle("is-current", index === selectedIndex);
    node.classList.toggle("is-future", index > selectedIndex);
  });
}

function clearLoadingWave() {
  progressNodes.forEach((node) => node.classList.remove("is-wave-tail", "is-wave-core", "is-wave-lead"));
}

function confirmCurrent(selectedIndex = current) {
  const selectedNode = progressNodes[selectedIndex];
  if (!selectedNode) return;
  clearTimeout(confirmationTimer);
  selectedNode.classList.remove("is-confirming");
  void selectedNode.offsetWidth;
  selectedNode.classList.add("is-confirming");
  confirmationTimer = setTimeout(() => selectedNode.classList.remove("is-confirming"), 760);
}

function scheduleCycleTimer(callback, delay, token) {
  const timer = setTimeout(() => {
    if (token === cycleToken) callback();
  }, Math.max(0, delay));
  cycleTimers.push(timer);
  return timer;
}

function clearPageCycle() {
  cycleToken += 1;
  cycleTimers.forEach(clearTimeout);
  cycleTimers = [];
  clearTimeout(confirmationTimer);
  clearLoadingWave();
  progressNodes.forEach((node) => node.classList.remove("is-confirming"));
}

function runLoadingWave(selectedIndex, stepDuration, token) {
  let position = 0;
  const move = () => {
    if (token !== cycleToken) return;
    clearLoadingWave();
    if (position >= selectedIndex) {
      confirmCurrent(selectedIndex);
      return;
    }

    progressNodes[position - 1]?.classList.add("is-wave-tail");
    progressNodes[position]?.classList.add("is-wave-core");
    if (position + 1 < selectedIndex) progressNodes[position + 1]?.classList.add("is-wave-lead");
    position += 1;
    scheduleCycleTimer(move, stepDuration, token);
  };
  move();
}

function scheduleWaveArrival(selectedIndex, arrivalTime, token) {
  if (reducedMotion.matches || selectedIndex < 1) {
    scheduleCycleTimer(() => confirmCurrent(selectedIndex), arrivalTime, token);
    return;
  }

  const travelDuration = WAVE_STEP_DURATION * selectedIndex;
  scheduleCycleTimer(
    () => runLoadingWave(selectedIndex, WAVE_STEP_DURATION, token),
    arrivalTime - travelDuration,
    token,
  );
}

function schedulePageCycle() {
  clearPageCycle();
  if (document.hidden || !archiveVisible || current < 0) return;

  const token = cycleToken;
  const selectedIndex = current;
  const isFinalPage = selectedIndex === events.length - 1;
  const duration = isFinalPage ? FINAL_PAGE_DURATION : NORMAL_PAGE_DURATION;
  const arrivals = isFinalPage ? FINAL_WAVE_ARRIVALS : [NORMAL_WAVE_ARRIVAL];
  dotProgress.dataset.pageDuration = String(duration);
  dotProgress.dataset.waveArrivals = arrivals.join(",");

  arrivals.forEach((arrivalTime) => scheduleWaveArrival(selectedIndex, arrivalTime, token));
  scheduleCycleTimer(() => select((selectedIndex + 1) % events.length, "auto"), duration, token);
}

function centerMobileEntry(index) {
  if (!mobileLayout.matches) return;
  requestAnimationFrame(() => {
    buttons[index].scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "nearest", inline: "center" });
  });
}

function select(index, transitionMode = "manual") {
  if (index === current) {
    centerMobileEntry(index);
    schedulePageCycle();
    return;
  }
  const previous = current;
  current = index;
  const event = events[index];
  const displayIndex = String(index + 1).padStart(2, "0");
  const percentage = ((index + 1) / events.length) * 100;
  counterNode.textContent = `${displayIndex} / ${events.length}`;
  fileIndexNode.textContent = `FILE ${String(index + 1).padStart(3, "0")}`;
  pixelDate.set(
    event[0],
    previous === -1,
    previous === -1 || index > previous ? 1 : -1,
    transitionMode,
  );
  title.textContent = event[1];
  pixelTitle.set(event[1], previous === -1, transitionMode);
  descriptionNode.textContent = event[2];
  memoryFile.classList.remove("is-auto-transitioning");
  if (transitionMode === "auto" && !reducedMotion.matches) {
    void memoryFile.offsetWidth;
    memoryFile.classList.add("is-auto-transitioning");
  }
  progressReadoutNode.textContent = `${displayIndex} / ${events.length} · ${percentage.toFixed(2)}%`;
  dotProgress.setAttribute("aria-valuenow", String(index + 1));
  dotProgress.setAttribute("aria-valuetext", `${displayIndex} / ${events.length}, ${percentage.toFixed(2)}%`);
  progressTrack.style.setProperty("--cursor-index", index);
  buttons.forEach((button, buttonIndex) => {
    const isActive = buttonIndex === index;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-current", isActive ? "step" : "false");
  });
  setNodeState(miniNodes, index);
  setNodeState(progressNodes, index);
  progressButtons.forEach((button, buttonIndex) => button.setAttribute("aria-current", buttonIndex === index ? "step" : "false"));
  schedulePageCycle();
  centerMobileEntry(index);
}

addEventListener("keydown", (event) => {
  if (event.key === "ArrowUp" || event.key === "ArrowLeft") { event.preventDefault(); select((current + events.length - 1) % events.length); }
  if (event.key === "ArrowDown" || event.key === "ArrowRight") { event.preventDefault(); select((current + 1) % events.length); }
});

colorScheme.addEventListener("change", () => {
  pixelTitle.resize();
  pixelDate.resize();
});
function settleAnimations() {
  pixelTitle.settle();
  pixelDate.settle();
}

reducedMotion.addEventListener("change", () => {
  if (reducedMotion.matches) settleAnimations();
  schedulePageCycle();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    clearPageCycle();
    settleAnimations();
  }
  else schedulePageCycle();
});

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(([entry]) => {
    const nextVisible = entry.isIntersecting && entry.intersectionRatio > .05;
    if (nextVisible === archiveVisible) return;
    archiveVisible = nextVisible;
    if (archiveVisible) schedulePageCycle();
    else {
      clearPageCycle();
      settleAnimations();
    }
  }, { threshold: [0, .05] });
  observer.observe(archiveRoot);
}
select(events.length - 1);
pixelTitle.prewarm(events.map((event) => event[1]));
pixelDate.prewarm("0123456789.NOW");

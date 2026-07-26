---
name: Earthrise + Translunar Arc
status: 方案存档(代码已回退,未上线)
theme: To the Moon — 航天与探索精神
inspiration: 阿波罗 8 号「Earthrise」、Kimi 的点阵月球
---

# Earthrise + Translunar Arc —— 方案存档

首页以「To the Moon」为主题时的两个第一梯队视觉:**一颗蓝色弹珠(地球)从月面方向升起**,以及**一条虚线 translunar 轨迹弧 + 沿弧爬行的像素飞行器**。两者都用现有抖动磷光引擎渲染,与月球同颗粒语言。

> 本文档记录完整设计意图与**可复现的代码配方**。代码曾在 commit `7df89a7` 上线,因显示问题被回退至 `34eac2d`(雨夜版)。重试时按「如何重新应用」逐步执行即可。

## 设计意图

- **Earthrise**:阿波罗 8 号最经典的一帧——从月球看地球升起。情感冲击拉满,且**零新基建**:复用 `PixelPlanet` 的 sphere 引擎,只换「材质函数」(海洋/陆地/冰),与月球是同一种 4px 颗粒。
- **Translunar 轨迹弧**:一条极克制的虚线曲线 + 一个像素飞行器,飞行器位置 = 滚动进度。字面意义画出「通往月球的路」。
- **克制原则**:只加这两个元素,不堆。像那颗 3/4 月一样,「一招制胜」。

## 核心抽象

沿用 `DITHER.md` 的抽象:给每个格子一个亮度函数 + 材质判定 → Bayer 量化 → 4 档磷光。Earth 只是「球面光照 + 一个返回 ocean/land/ice 材质的方法」。

## 代码配方

### 1) 颜色 token(`blog/styles.css` 的 `:root` 与 light)

```css
/* dark :root */
--earth-ocean: #3d5a80;
/* light @media */
--earth-ocean: #2c5fa4;
```

### 2) `palette()` 补全(`blog/blog.js` 顶部)

```js
function palette() {
  const styles = getComputedStyle(document.documentElement);
  return {
    ink: styles.getPropertyValue("--ink").trim(),
    accent: styles.getPropertyValue("--accent").trim(),
    muted: styles.getPropertyValue("--muted").trim(),
    panel: styles.getPropertyValue("--panel").trim(),
    line: styles.getPropertyValue("--line").trim(),
    ocean: styles.getPropertyValue("--earth-ocean").trim(),
  };
}
```

### 3) `PixelPlanet` 构造函数加大陆数据

```js
this.continents = [
  { lon: 0.4,  lat: -0.1, rl: 0.5,  rf: 0.55 },  // 非洲
  { lon: 1.3,  lat:  0.7, rl: 0.9,  rf: 0.45 },  // 欧亚
  { lon: -1.7, lat:  0.6, rl: 0.6,  rf: 0.5  },  // 北美
  { lon: -1.2, lat: -0.4, rl: 0.35, rf: 0.6  },  // 南美
  { lon: 2.4,  lat: -0.5, rl: 0.35, rf: 0.3  },  // 澳洲
];
```

### 4) 新增 `earthCell` 方法(球面光照 + 材质,放在 `brightnessAt` 之后)

```js
earthCell(nx, ny, rr, spin) {
  if (rr > 1) return null;
  const nz = Math.sqrt(1 - rr);
  let b = Math.max(0, nx * 0.74 - ny * 0.56 + nz * 0.32) * (0.5 + 0.5 * nz);
  const lat = Math.asin(Math.max(-1, Math.min(1, ny)));
  let fill = "ocean";
  if (Math.abs(lat) > 1.15) {            // 极地冰盖
    fill = "ink"; b *= 1.12;
  } else {
    const lon = Math.atan2(nx, nz) + spin;
    for (const c of this.continents) {
      let dl = lon - c.lon;
      if (dl >  Math.PI) dl -= 2 * Math.PI;
      if (dl < -Math.PI) dl += 2 * Math.PI;
      const da = lat - c.lat;
      if ((dl * dl) / (c.rl * c.rl) + (da * da) / (c.rf * c.rf) < 1) { fill = "ink"; b *= 1.08; break; }
    }
  }
  return { b, fill };
}
```

### 5) `render(time)` 内层循环改成支持 earth 材质

把原来 `brightnessAt + crest` 那段换成:

```js
let brightness, fillKey;
if (this.shape === "earth") {
  const info = this.earthCell(nx, ny, rr, spin);
  if (!info) continue;
  brightness = info.b; fillKey = info.fill;
} else {
  brightness = this.brightnessAt(nx, ny, rr, time, craterDirs);
  if (brightness <= 0) continue;
  fillKey = (this.accentCrest && brightness > 0.95) ? "accent" : "ink";
}
brightness += (hash2(gx, gy) - 0.5) * 0.14;
// …Bayer 量化成 level(0..3)…
const colorVal = fillKey === "ocean" ? colors.ocean : fillKey === "accent" ? colors.accent : colors.ink;
if (colorVal !== currentFill) { context.fillStyle = colorVal; currentFill = colorVal; }
```

### 6) HTML(在 `.opening` 里,月球 canvas 之后)

```html
<canvas class="opening-earth" data-planet data-shape="earth" data-cell="4" data-body-scale="0.45" aria-hidden="true"></canvas>
<canvas id="trajectory-arc" aria-hidden="true"></canvas>
```

### 7) CSS

```css
.opening-earth {
  position: fixed; top: 9%; right: 9%;
  width: 132px; height: 132px;
  image-rendering: pixelated; pointer-events: none;
  opacity: 0; z-index: -1; will-change: transform, opacity;
}
#trajectory-arc { position: fixed; inset: 0; z-index: -1; pointer-events: none; contain: strict; }
@media (max-width: 900px) { .opening-earth { width: 92px; height: 92px; top: 7%; right: 6%; } }
```

### 8) 滚动联动(morph 块之后,`parallaxLayers` 块之前)

```js
const earthCanvas = document.querySelector(".opening-earth");
const arcCanvas = document.querySelector("#trajectory-arc");
if ((earthCanvas || arcCanvas) && !reducedMotion.matches) {
  const openingEl = document.querySelector(".opening");
  const arcCtx = arcCanvas ? arcCanvas.getContext("2d") : null;
  let arcW = 0, arcH = 0;
  const sizeArc = () => { /* DPR 缩放 arcCanvas 为 innerWidth/innerHeight */ };
  sizeArc(); addEventListener("resize", sizeArc, { passive: true });
  const bz = (t,a,b,c,d) => { const mt=1-t; return mt*mt*mt*a + 3*mt*mt*t*b + 3*mt*t*t*c + t*t*t*d; };
  let ticking = false;
  const update = () => {
    ticking = false;
    const oh = openingEl ? openingEl.offsetHeight : innerHeight;
    const p = Math.min(1, Math.max(0, scrollY / Math.max(1, oh)));
    // 地球:顶部就可见,月球归位时淡出
    if (earthCanvas) {
      const opacity = p < 0.65 ? 1 : Math.max(0, 1 - (p - 0.65) / 0.3);
      earthCanvas.style.opacity = opacity.toFixed(3);
      earthCanvas.style.transform = `translateY(${(-p * 16).toFixed(1)}px)`;
    }
    // 轨迹弧 + 飞行器
    if (arcCtx && p < 1.05) {
      const c = palette();
      const x0=arcW*0.9, y0=arcH*0.92, x3=arcW*0.34, y3=arcH*0.5;
      const x1=arcW*0.98, y1=arcH*0.42, x2=arcW*0.6, y2=arcH*0.16;
      arcCtx.clearRect(0,0,arcW,arcH);
      arcCtx.strokeStyle = c.muted; arcCtx.globalAlpha = 0.5;
      arcCtx.setLineDash([2,7]); arcCtx.lineWidth = 1;
      arcCtx.beginPath(); arcCtx.moveTo(x0,y0);
      arcCtx.bezierCurveTo(x1,y1,x2,y2,x3,y3); arcCtx.stroke();
      arcCtx.setLineDash([]);
      const t = Math.min(1,p);
      const cx = bz(t,x0,x1,x2,x3), cy = bz(t,y0,y1,y2,y3);
      const ang = Math.atan2(bz(t+0.01,y0,y1,y2,y3)-cy, bz(t+0.01,x0,x1,x2,x3)-cx);
      // 拖尾 3 点 + 飞行器(ink 尾舱 + accent 机身/机头,沿 ang 旋转)
      // …见 commit 7df89a7 的 blog.js…
    }
  };
  addEventListener("scroll", () => { if (ticking) return; ticking = true; requestAnimationFrame(update); }, { passive: true });
  update();
}
```

## 如何重新应用

1. 按上面 1–8 顺序逐步加回(每步可独立验证)。
2. 先验证 **earth 静态渲染**(去掉滚动联动,直接 `opacity:1`)——确认蓝色弹珠画出来了。
3. 再加滚动联动。
4. 最后加轨迹弧。
5. 每一步用无痕窗口 + 不同浏览器(Chrome/Safari/Firefox)交叉验证,因为上次正是在「本地截图正常、用户端看不到」的盲区里翻车的。

## 上次为什么翻车(复盘)

- 代码本身在 headless 截图里是渲染的(morph transform 已应用 = JS 跑通)。
- 但用户端「看不到/无法显示」——始终没定位到根因,怀疑是缓存或某浏览器特定问题。
- 教训:**视觉特效不能只靠无头截图验收**,必须在真实浏览器、真实设备、无痕窗口多端确认后才能上线;否则一旦用户看不到,排查链路太长。

## 备选(如果 Earthrise 始终调不通)

放弃 Earthrise,只保留**轨迹弧 + 飞行器**(纯 canvas 画线,不依赖 PixelPlanet 的材质分支,风险低很多),或者用**像素任务徽章(mission patch)**代替——更简单、更克制。

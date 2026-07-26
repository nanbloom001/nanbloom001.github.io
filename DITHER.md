---
name: Dithered Phosphor Pixel
scope: 可移植的渲染风格规范(独立于具体站点)
inspiration: careers.kimi.com (Moonshot AI) 的点阵月球视觉——仅参考外观,无源码复制
license: 原创实现,自由复用
algorithms:
  - Bayer ordered dithering (1973, 公共领域)
  - Lambertian sphere shading (经典计算机图形学)
tokens:
  bayer_4x4: [[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]]
  alpha_tiers: [0, 0.2, 0.48, 0.85]
  granule_small: 4px        # 3px 实心 + 1px 间隙
  granule_large: 10px       # 粗颗粒,用于大型天体/标题
  light_grazing: [0.74, -0.56, 0.32]   # 掠射光,右上→左下
  limb_darkening: [0.45, 0.55]          # (中心系数, 边缘系数)
  colors: [ink, accent, muted, line, panel]   # 走 CSS 变量,双主题
---

# Dithered Phosphor Pixel —— 抖动磷光像素风格规范

把任意连续色调的形状,渲染成一张「通电的点阵屏」:每个网格单元格是一个磷光颗粒,亮度由 **Bayer 有序抖动**量化成有限的几档。读起来像复古 CRT / 仪表点阵屏,而不是照片或光栅图。

## 核心思想(一句话)

> 给每个格子一个**亮度函数** `b(x, y, t)`,用 Bayer 矩阵量化成 N 档透明度,画出来。

整个风格只有这一个抽象。换一个亮度函数,就能渲染完全不同的物体——球体、星系、光环、烟雾、方块、雨丝、甚至照片和曲线——**共用同一套颗粒语言,视觉天然统一**。

## 五条原则

1. **抖动只给大面,1-bit 只给小件**。Bayer 抖动(多级灰阶颗粒)用于大型表面:天体、背景烟雾、大图。按钮、印章、图标用清晰实心像素,绝不对小元素抖动。
2. **颗粒只有两档**。大颗粒(10px)给主角天体和大标题;小颗粒(4px)给其余一切。禁止第三种。颗粒画布禁止非整数缩放(会破坏方形像素)。
3. **单色 + 单强调色**。墨色(`ink`)做主体,一个强调色(`accent`,占画面 <5%)只做信号与焦点。
4. **运动是慢的、环境的、时间驱动的**。环境层恒速自转/漂移;叙事层节点触发、自驱动缓动;反馈层短促阶跃。一律尊重 `prefers-reduced-motion`。
5. **形状是函数,渲染器是共享的**。新增元素 = 写一个亮度函数,而不是写一套新渲染。

## 渲染管线(通用)

```
for each cell (gx, gy) on the shape:
    b = brightness(gx, gy, t)              # 你提供的亮度函数,[0..1]
    b += (noise(gx,gy) - 0.5) * 0.14        # 可选颗粒噪声
    thr = (BAYER[gy%4][gx%4] + 0.5) / 16    # Bayer 阈值
    tier = clamp(floor(b*3 + thr), 0, 3)    # 量化成 0..3
    if tier == 0: skip
    fillRect(cell, alpha = ALPHA_TIERS[tier], color = ink or accent)
```

四个常量:`BAYER_4x4`、`ALPHA_TIERS=[0, 0.2, 0.48, 0.85]`、颗粒尺寸、强调色阈值(亮度 > 某值用 accent 做高光)。

## 亮度函数库(已实现的形状)

**球体 / 月球**——表面点法向量 `(nx,ny,nz)`,Lambert 光照 + 临边昏暗 + 环形山:
```
nz = √(1 - (nx² + ny²))
light = max(0, nx*Lx + ny*Ly + nz*Lz)          # L = 掠射光方向
value = light × (0.45 + 0.55×nz)               # 临边昏暗
# 减去环形山(点积判定 dot(n, crater_dir) > cos(r))
# 加经度自转:crater 经度 += t × 0.15
```

**星系**——椭圆密度 + 双旋臂:`arm = 0.5 + 0.5·sin(2θ + spin − √r·5.4)`,`value = e^(−r²·4) + arm·e^(−r²·2.2)`。

**光环(土星)**——球体亮度 + 一条倾斜椭圆环带,前半环被球体遮挡(`ny<0 时不画环`)。

**靶环**——同心波纹:`value = (0.5+0.5·cos(r·13 − t))·e^(−r²·1.5)`,波峰闪强调色。

**2D 烟云(星空背景)**——高斯云团 + 双倍频干涉噪声,无球面约束,铺满视口。

**方块格(俄罗斯方块)**——每格一个预渲染 sprite:顶左亮、右下暗的渐变 + Bayer,七种方块七种亮度 tier,像不同矿石。

**雨丝 / 流星**——亮头(2×3)+ 上方拖尾(5 段 1×2 渐隐),斜向下落。

## 迁移配方(把风格用到新东西上)

换一个 `brightness` 函数即可:

| 目标 | 亮度函数 | 效果 |
|---|---|---|
| **照片** | 按 cell 采样原图亮度 → tier | 复古点阵画,所有配图与站点融为一体(lowtechmag 招牌手法) |
| **数据曲线** | 沿曲线宽度方向高斯衰减 | 磷光点阵折线图(reward 曲线、训练指标) |
| **肖像 / 头像** | 灰度 luminance 映射 | 抖动侧影 |
| **章节分割带** | 沿 y 的高斯渐变 | 代替实线的过渡带 |
| **任意 `f(x,y)`** | 你的形状函数 | 波纹、六边网格、噪声地形、Logo… |

照片渲染器是性价比最高的迁移:~40 行 canvas 滤镜,文章配图即刻升值。

## 代码契约(本项目里的落点)

- `assets/starfield.js → Starfield.paint(canvas, inkColor)`:静态 2D 抖动星场,一次绘制。
- `blog/blog.js → class PixelPlanet`:`data-shape` 切换形态的动态天体,读 CSS 变量适配明暗主题。
- `blog/blog.js → makeSprite(color, base, cell, scale)`:抖动方块 sprite 生成器。
- 全部零依赖、纯 canvas、`prefers-reduced-motion` 降级为静态。

## 该做 / 不该做

**该做**:全程走 CSS 变量配色,双主题自动切换;每帧从变量读色;颗粒位置对齐颗粒网格;滚出视口 / 标签页隐藏时暂停;reduced-motion 渲染一帧静态。

**不该做**:对小元素(图标/按钮)用抖动;在颗粒画布上做非整数 scale;引入第二个强调色;用平滑渐变代替抖动;让环境动画超过 12fps(反馈层除外)。

## 灵感与归属

- **灵感**:Kimi (Moonshot AI) 的点阵月球视觉。**未复制其源码**(站点为 JS 动态渲染,无法读取)。
- **底层算法**:Bayer 有序抖动(公共领域)、Lambert 球面光照(经典图形学)——原理是公知,具体实现为本项目原创。
- 这份风格规范可自由复用;具体实现代码归本仓库。

*参见 `blog/DESIGN.md` 了解本站点如何应用这套风格(节拍令牌、五段骨架、世界层等)。*

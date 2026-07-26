---
name: Field Log — Pixel Dither Instrument
inspiration: careers.kimi.com (Moonshot AI), Teenage Engineering, CRT phosphor displays
colors:
  dark:
    bg: "#0c0d0d"
    panel: "#111212"
    ink: "#e8e9e4"
    muted: "#777b76"
    line: "#292c29"
    accent: "#ff5a36"
  light:
    bg: "#edf4fb"
    panel: "#fbfdff"
    ink: "#10233f"
    muted: "#667991"
    line: "#cfdae7"
    accent: "#1769e0"
typography:
  display:
    fontFamily: 7x9 block pixel font (canvas, assets/dot-font.js)
    cell: 10px solid
  label:
    fontFamily: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace
    fontSize: 9-11px
    letterSpacing: 0.08-0.24em
    transform: uppercase
  body:
    fontFamily: Arial, "PingFang SC", sans-serif
    fontSize: 15px
    lineHeight: 2
pixel-grain:
  large: 10px   # 开场巨月、实心格 logotype
  small: 4px    # 其余一切;canvas 内位置对齐 4px 网格
rounded:
  none: 0px     # 全站无圆角;"切角"用 7px 方形缺口
spacing:
  frame: min(880px, 100% - 48px)
motion:
  ambient: "≤12fps, 恒速, 与输入无关"
  narrative: "节点触发, 时间驱动 ease-in-out 950ms, 缩放几何插值"
  feedback: "≤400ms, steps() 阶跃"
---

# Field Log 设计规范

参考 Kimi (careers.kimi.com) 的像素设计语言逆向提炼(Moonshot 无公开设计文档),
适配本站「实地任务日志」主题。格式遵循 google-labs-code/design.md 规范。

## Overview

复古点阵仪表 × 深空任务日志。整页是一台通电的仪器:抖动像素月球在首屏升起,
等宽微标签像面板丝印,遥测条确认链路存活。暗色是磷光橙 CRT,亮色是工程蓝图纸。

## 核心原则

1. **抖动只给大物,1-bit 只给小物**
   - Bayer 4×4 有序抖动(三级灰度颗粒)仅用于大型天体与背景:月球、星系、星云。
   - 小型元素(按钮、印章、图标)一律用清晰 1-bit 像素图形:实心边框盒、
     7px 切角、`4px 4px 0` 硬偏移阴影、像素字形。绝不对小元素使用抖动。

2. **像素颗粒双规格制**
   - 大颗粒 10px:开场巨月、开场标题(实心格 logotype)。
   - 小颗粒 4px:场景天体、星尘、星座、卫星、流星、精灵、UI 像素点。
   - 禁止第三种规格;颗粒画布上禁止非整数 scale(破坏方形像素)。

3. **运动三分级**(见 front matter `motion`)
   环境层恒速自转/漂移;叙事层节点触发自驱动动画(非滚动驱动);
   反馈层短促阶跃。一律尊重 prefers-reduced-motion:静态帧降级,不丢内容。

## 元素词汇表

- 切角边框盒:1px 实线 + 对角 7px 方形缺口 + 硬阴影(印章、按钮)。
- 像素箭头/括号:`<- ->` `[ ]` `<< >>`,等宽字体直排。
- ≋ 波浪字形:三行相位错开的像素波浪,steps 平移闪动。
- 微标签语法:等宽 9-11px 加宽字距,`//` 与 `·` 作分隔。
- 图纸层:校准角标、刻度尺、26px 点网格,一律 var(--line) 色。
- 角色编号:OPERATOR NAN / ROVER DOG-01 / RELAY SAT-02 / GROUND TWR-03。

## Colors

强调色占画面 <5%,只用于信号与焦点(REC 灯、波峰、LOG 高亮、链路状态)。
所有颜色必须走 tokens,双主题自动切换,canvas 每帧从 CSS 变量读色。

## 性能红线

零依赖、无构建;动画 ≤12fps(反馈层除外);滚出视口与后台标签页必须暂停;
背景层静态一次绘制;只对 transform/opacity 做 CSS 动画;巨幅画布 DPR 上限 1。

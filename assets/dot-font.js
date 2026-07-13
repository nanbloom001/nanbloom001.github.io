/*
 * A deliberately small, dependency-free dot font.  Glyphs are described as
 * 10 × 14 instrument-display strokes, then rasterised into the requested
 * grid.  This keeps the visible resolution honest: 8 × 12, 10 × 14 and
 * 12 × 16 each contain their own set of addressable LEDs.
 */
(() => {
  const BASE = { cols: 10, rows: 14 };
  const S = (...segments) => segments;
  const glyphSegments = {
    A: S([1, 13, 3, 0], [3, 0, 6, 0], [6, 0, 8, 13], [2, 7, 7, 7]),
    B: S([1, 0, 1, 13], [1, 0, 7, 0], [1, 6, 7, 6], [1, 13, 7, 13], [8, 1, 8, 5], [8, 7, 8, 12]),
    C: S([8, 1, 6, 0], [6, 0, 2, 0], [2, 0, 1, 2], [1, 2, 1, 11], [1, 11, 2, 13], [2, 13, 6, 13], [6, 13, 8, 12]),
    D: S([1, 0, 1, 13], [1, 0, 6, 0], [1, 13, 6, 13], [7, 1, 8, 3], [8, 3, 8, 10], [8, 10, 7, 12]),
    E: S([1, 0, 1, 13], [1, 0, 8, 0], [1, 6, 6, 6], [1, 13, 8, 13]),
    F: S([1, 0, 1, 13], [1, 0, 8, 0], [1, 6, 6, 6]),
    G: S([8, 1, 6, 0], [6, 0, 2, 0], [2, 0, 1, 2], [1, 2, 1, 11], [1, 11, 2, 13], [2, 13, 7, 13], [7, 13, 8, 11], [8, 11, 8, 7], [8, 7, 5, 7]),
    H: S([1, 0, 1, 13], [8, 0, 8, 13], [1, 6, 8, 6]),
    I: S([1, 0, 8, 0], [4, 0, 4, 13], [1, 13, 8, 13]),
    J: S([1, 0, 8, 0], [6, 0, 6, 11], [6, 11, 5, 13], [5, 13, 2, 13], [2, 13, 1, 11]),
    K: S([1, 0, 1, 13], [8, 0, 1, 7], [1, 7, 8, 13]),
    L: S([1, 0, 1, 13], [1, 13, 8, 13]),
    M: S([1, 13, 1, 0], [1, 0, 4, 5], [4, 5, 6, 5], [6, 5, 8, 0], [8, 0, 8, 13]),
    N: S([1, 13, 1, 0], [1, 0, 8, 13], [8, 13, 8, 0]),
    O: S([2, 0, 7, 0], [2, 13, 7, 13], [1, 2, 1, 11], [8, 2, 8, 11], [1, 2, 2, 0], [8, 2, 7, 0], [1, 11, 2, 13], [8, 11, 7, 13]),
    P: S([1, 13, 1, 0], [1, 0, 7, 0], [1, 6, 7, 6], [8, 1, 8, 5]),
    Q: S([2, 0, 7, 0], [2, 13, 7, 13], [1, 2, 1, 11], [8, 2, 8, 11], [1, 2, 2, 0], [8, 2, 7, 0], [1, 11, 2, 13], [8, 11, 7, 13], [5, 9, 9, 13]),
    R: S([1, 13, 1, 0], [1, 0, 7, 0], [1, 6, 7, 6], [8, 1, 8, 5], [5, 6, 8, 13]),
    S: S([8, 1, 6, 0], [6, 0, 2, 0], [2, 0, 1, 2], [1, 2, 1, 5], [1, 6, 7, 6], [8, 8, 8, 11], [8, 11, 7, 13], [7, 13, 2, 13], [2, 13, 1, 12]),
    T: S([1, 0, 8, 0], [4, 0, 4, 13]),
    U: S([1, 0, 1, 11], [8, 0, 8, 11], [1, 11, 2, 13], [2, 13, 7, 13], [7, 13, 8, 11]),
    V: S([1, 0, 4, 13], [8, 0, 4, 13]),
    W: S([1, 0, 2, 13], [2, 13, 4, 7], [4, 7, 6, 13], [6, 13, 8, 0]),
    X: S([1, 0, 8, 13], [8, 0, 1, 13]),
    Y: S([1, 0, 4, 6], [8, 0, 4, 6], [4, 6, 4, 13]),
    Z: S([1, 0, 8, 0], [8, 0, 1, 13], [1, 13, 8, 13]),
    ",": S([4, 11, 4, 12], [4, 12, 2, 13]),
    "?": S([1, 2, 2, 0], [2, 0, 7, 0], [7, 0, 8, 2], [8, 2, 8, 4], [8, 4, 4, 7], [4, 7, 4, 9], [4, 12, 4, 13]),
  };

  function lineCells(x0, y0, x1, y1) {
    const cells = [];
    let dx = Math.abs(x1 - x0);
    let sx = x0 < x1 ? 1 : -1;
    let dy = -Math.abs(y1 - y0);
    let sy = y0 < y1 ? 1 : -1;
    let error = dx + dy;
    while (true) {
      cells.push([x0, y0]);
      if (x0 === x1 && y0 === y1) break;
      const twiceError = 2 * error;
      if (twiceError >= dy) { error += dy; x0 += sx; }
      if (twiceError <= dx) { error += dx; y0 += sy; }
    }
    return cells;
  }

  function rasterizeGlyph(character, cols = 10, rows = 14) {
    const segments = glyphSegments[character] || glyphSegments["?"];
    const occupied = new Set();
    segments.forEach(([startX, startY, endX, endY]) => {
      const x0 = Math.round((startX / (BASE.cols - 1)) * (cols - 1));
      const y0 = Math.round((startY / (BASE.rows - 1)) * (rows - 1));
      const x1 = Math.round((endX / (BASE.cols - 1)) * (cols - 1));
      const y1 = Math.round((endY / (BASE.rows - 1)) * (rows - 1));
      lineCells(x0, y0, x1, y1).forEach(([x, y]) => occupied.add(`${x}:${y}`));
    });
    return [...occupied]
      .map((cell) => cell.split(":").map(Number))
      .sort((left, right) => left[1] - right[1] || left[0] - right[0]);
  }

  function lineUnits(line, cols, gap) {
    const chars = [...line];
    return chars.reduce((total, character, index) => {
      const width = character === " " ? Math.max(4, Math.round(cols * .58)) : cols;
      return total + width + (index < chars.length - 1 ? gap : 0);
    }, 0);
  }

  function chooseLayout(text, cols, rows, bounds, maxPitch, singleLine = false) {
    const words = text.trim().split(/\s+/);
    const candidates = [[text]];
    if (!singleLine) {
      for (let split = 1; split < words.length; split += 1) {
        candidates.push([words.slice(0, split).join(" "), words.slice(split).join(" ")]);
      }
    }
    const gap = 2;
    return candidates.map((lines) => {
      const widest = Math.max(...lines.map((line) => lineUnits(line, cols, gap)));
      const verticalUnits = lines.length * rows + (lines.length - 1) * 4;
      const pitch = Math.min(
        maxPitch,
        (bounds.width - 8) / Math.max(1, widest - 1),
        (bounds.height - 8) / Math.max(1, verticalUnits - 1),
      );
      return { lines, gap, verticalUnits, pitch };
    }).sort((first, second) => second.pitch - first.pitch)[0];
  }

  function makeTextPoints(text, settings, bounds) {
    const { cols = 10, rows = 14, maxPitch = 5 } = settings || {};
    const upper = String(text || "").toUpperCase();
    const layout = chooseLayout(upper, cols, rows, bounds, maxPitch);
    const heightUnits = layout.verticalUnits;
    const startY = (bounds.height - (heightUnits - 1) * layout.pitch) / 2;
    const points = [];

    layout.lines.forEach((line, lineIndex) => {
      const widthUnits = lineUnits(line, cols, layout.gap);
      const startX = (bounds.width - (widthUnits - 1) * layout.pitch) / 2;
      let cursor = 0;
      [...line].forEach((character, characterIndex, characters) => {
        if (character !== " ") {
          rasterizeGlyph(character, cols, rows).forEach(([x, y]) => {
            points.push({
              x: startX + (cursor + x) * layout.pitch,
              y: startY + (lineIndex * (rows + 4) + y) * layout.pitch,
              size: Math.max(.72, layout.pitch * .285),
            });
          });
        }
        const characterWidth = character === " " ? Math.max(4, Math.round(cols * .58)) : cols;
        cursor += characterWidth + (characterIndex < characters.length - 1 ? layout.gap : 0);
      });
    });
    return { points, lines: layout.lines.length, pitch: layout.pitch, cols, rows };
  }

  // A wider, deliberately chunky bitmap face for archive headings.  It is a
  // different face from the thin dot font above: each lit address is a square
  // phosphor cell, with broad counters and a compact instrument-display rhythm.
  const blockGlyphs = {
    A:["0111110","0111110","1100011","1100011","1100011","1111111","1100011","1100011","1100011"],
    B:["1111110","1111111","1100011","1100011","1111110","1111111","1100011","1100011","1111111"],
    C:["0111111","1111111","1100000","1100000","1100000","1100000","1100000","1111111","0111111"],
    D:["1111110","1111111","1100011","1100011","1100011","1100011","1100011","1111111","1111110"],
    E:["1111111","1111111","1100000","1100000","1111110","1111110","1100000","1100000","1111111"],
    F:["1111111","1111111","1100000","1100000","1111110","1111110","1100000","1100000","1100000"],
    G:["0111111","1111111","1100000","1100000","1101111","1101111","1100011","1111111","0111111"],
    H:["1100011","1100011","1100011","1100011","1111111","1111111","1100011","1100011","1100011"],
    I:["1111111","1111111","0011100","0011100","0011100","0011100","0011100","1111111","1111111"],
    J:["0011111","0011111","0000110","0000110","0000110","1100110","1100110","1111110","0111100"],
    K:["1100011","1100110","1101100","1111000","1111000","1101100","1100110","1100011","1100011"],
    L:["1100000","1100000","1100000","1100000","1100000","1100000","1100000","1111111","1111111"],
    M:["1100011","1110111","1111111","1101011","1101011","1100011","1100011","1100011","1100011"],
    N:["1100011","1110011","1110011","1101011","1101111","1100111","1100111","1100011","1100011"],
    O:["0111110","1111111","1100011","1100011","1100011","1100011","1100011","1111111","0111110"],
    P:["1111110","1111111","1100011","1100011","1111111","1111110","1100000","1100000","1100000"],
    Q:["0111110","1111111","1100011","1100011","1100011","1101011","1100111","1111111","0111111"],
    R:["1111110","1111111","1100011","1100011","1111111","1111110","1101100","1100110","1100011"],
    S:["0111111","1111111","1100000","1100000","0111110","0011111","0000011","1111111","1111110"],
    T:["1111111","1111111","0011100","0011100","0011100","0011100","0011100","0011100","0011100"],
    U:["1100011","1100011","1100011","1100011","1100011","1100011","1100011","1111111","0111110"],
    V:["1100011","1100011","1100011","1100011","1100011","0110110","0110110","0011100","0011100"],
    W:["1100011","1100011","1100011","1101011","1101011","1111111","1111111","1110111","1100011"],
    X:["1100011","1100011","0110110","0011100","0011100","0110110","1100011","1100011","1100011"],
    Y:["1100011","1100011","0110110","0011100","0011100","0011100","0011100","0011100","0011100"],
    Z:["1111111","1111111","0000110","0001100","0011100","0110000","1100000","1111111","1111111"],
    0:["0111110","1111111","1100011","1100111","1101011","1110011","1100011","1111111","0111110"],
    1:["0011100","0111100","1111100","0011100","0011100","0011100","0011100","1111111","1111111"],
    2:["0111110","1111111","0000011","0000110","0011100","0110000","1100000","1111111","1111111"],
    3:["1111110","1111111","0000011","0011110","0011110","0000011","0000011","1111111","1111110"],
    4:["1100110","1100110","1100110","1111111","1111111","0000110","0000110","0000110","0000110"],
    5:["1111111","1111111","1100000","1111110","1111111","0000011","0000011","1111111","1111110"],
    6:["0111110","1111111","1100000","1111110","1111111","1100011","1100011","1111111","0111110"],
    7:["1111111","1111111","0000011","0000110","0001100","0011100","0011000","0011000","0011000"],
    8:["0111110","1111111","1100011","1111111","1111111","1100011","1100011","1111111","0111110"],
    9:["0111110","1111111","1100011","1100011","1111111","0111111","0000011","1111111","0111110"],
    ",":["0000000","0000000","0000000","0000000","0000000","0000000","0011100","0011100","0111000"],
    "?":["0111110","1111111","0000011","0001110","0011100","0011100","0000000","0011100","0011100"],
  };

  // Compact 5 × 7 face: same square cell and same cell pitch as the display
  // face, but fewer columns. Long archive titles therefore stay readable
  // without compressing the spaces between their pixels.
  const compactGlyphs = {
    A:["01110","10001","10001","11111","10001","10001","10001"], B:["11110","10001","10001","11110","10001","10001","11110"],
    C:["01111","10000","10000","10000","10000","10000","01111"], D:["11110","10001","10001","10001","10001","10001","11110"],
    E:["11111","10000","10000","11110","10000","10000","11111"], F:["11111","10000","10000","11110","10000","10000","10000"],
    G:["01111","10000","10000","10111","10001","10001","01111"], H:["10001","10001","10001","11111","10001","10001","10001"],
    I:["11111","00100","00100","00100","00100","00100","11111"], J:["00111","00010","00010","00010","10010","10010","01100"],
    K:["10001","10010","10100","11000","10100","10010","10001"], L:["10000","10000","10000","10000","10000","10000","11111"],
    M:["10001","11011","10101","10101","10001","10001","10001"], N:["10001","11001","10101","10011","10001","10001","10001"],
    O:["01110","10001","10001","10001","10001","10001","01110"], P:["11110","10001","10001","11110","10000","10000","10000"],
    Q:["01110","10001","10001","10001","10101","10010","01101"], R:["11110","10001","10001","11110","10100","10010","10001"],
    S:["01111","10000","10000","01110","00001","00001","11110"], T:["11111","00100","00100","00100","00100","00100","00100"],
    U:["10001","10001","10001","10001","10001","10001","01110"], V:["10001","10001","10001","10001","10001","01010","00100"],
    W:["10001","10001","10101","10101","10101","10101","01010"], X:["10001","10001","01010","00100","01010","10001","10001"],
    Y:["10001","10001","01010","00100","00100","00100","00100"], Z:["11111","00001","00010","00100","01000","10000","11111"],
    0:["01110","10001","10011","10101","11001","10001","01110"], 1:["00100","01100","00100","00100","00100","00100","01110"],
    2:["01110","10001","00001","00010","00100","01000","11111"], 3:["11110","00001","00001","01110","00001","00001","11110"],
    4:["00010","00110","01010","10010","11111","00010","00010"], 5:["11111","10000","10000","11110","00001","00001","11110"],
    6:["01110","10000","10000","11110","10001","10001","01110"], 7:["11111","00001","00010","00100","01000","01000","01000"],
    8:["01110","10001","10001","01110","10001","10001","01110"], 9:["01110","10001","10001","01111","00001","00001","01110"],
    ",":["00000","00000","00000","00000","00000","00100","01000"], ".":["00000","00000","00000","00000","00000","00000","00100"], "?":["01110","10001","00001","00010","00100","00000","00100"],
  };

  function makeBlockPoints(text, settings, bounds) {
    const { cols = 7, rows = 9, maxPitch = 7, singleLine = false, pixelSize = 3 } = settings || {};
    const upper = String(text || "").toUpperCase();
    const layout = chooseLayout(upper, cols, rows, bounds, maxPitch, singleLine);
    const startY = (bounds.height - (layout.verticalUnits - 1) * layout.pitch) / 2;
    const points = [];

    layout.lines.forEach((line, lineIndex) => {
      const widthUnits = lineUnits(line, cols, layout.gap);
      const startX = (bounds.width - (widthUnits - 1) * layout.pitch) / 2;
      let cursor = 0;
      [...line].forEach((character, characterIndex, characters) => {
        if (character !== " ") {
          const glyph = blockGlyphs[character] || blockGlyphs["?"];
          glyph.forEach((row, y) => [...row].forEach((cell, x) => {
            if (cell !== "1") return;
            points.push({
              x: startX + (cursor + x) * layout.pitch,
              y: startY + (lineIndex * (rows + 4) + y) * layout.pitch,
              size: pixelSize,
              shape: "block",
              character,
              characterIndex,
            });
          }));
        }
        const characterWidth = character === " " ? Math.max(4, Math.round(cols * .58)) : cols;
        cursor += characterWidth + (characterIndex < characters.length - 1 ? layout.gap : 0);
      });
    });
    return { points, lines: layout.lines.length, pitch: layout.pitch, cols, rows };
  }

  function makeCompactPoints(text, settings, bounds) {
    const { maxPitch = 5.4, pixelSize = 3 } = settings || {};
    const upper = String(text || "").toUpperCase();
    const cols = 5;
    const rows = 7;
    const gap = 1;
    const characters = [...upper];
    const widthUnits = characters.reduce((total, character, index) => total + (character === " " ? 3 : cols) + (index < characters.length - 1 ? gap : 0), 0);
    const pitch = Math.min(maxPitch, (bounds.width - 8) / Math.max(1, widthUnits - 1), (bounds.height - 8) / Math.max(1, rows - 1));
    const startX = (bounds.width - (widthUnits - 1) * pitch) / 2;
    const startY = (bounds.height - (rows - 1) * pitch) / 2;
    const points = [];
    let cursor = 0;
    [...upper].forEach((character, characterIndex, characters) => {
      if (character !== " ") {
        const glyph = compactGlyphs[character] || compactGlyphs["?"];
        glyph.forEach((row, y) => [...row].forEach((cell, x) => {
          if (cell === "1") points.push({ x: startX + (cursor + x) * pitch, y: startY + y * pitch, size: pixelSize, shape: "block" });
        }));
      }
      const characterWidth = character === " " ? 3 : cols;
      cursor += characterWidth + (characterIndex < characters.length - 1 ? gap : 0);
    });
    return { points, lines: 1, pitch, cols, rows };
  }

  window.DotFont = { rasterizeGlyph, makeTextPoints, makeBlockPoints, makeCompactPoints, glyphSegments, blockGlyphs, compactGlyphs };
})();

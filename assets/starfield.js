/*
 * Shared static pixel starfield: Bayer-dithered nebula blobs plus micro
 * stars, painted once per call. Used by the blog, the archive and the
 * landing page so every room of the site sits under the same sky.
 */
(() => {
  const BAYER_4 = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
  ];

  const hash2 = (x, y) => {
    const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return value - Math.floor(value);
  };

  function paint(canvas, inkColor) {
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    const width = innerWidth;
    const height = innerHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    const context = canvas.getContext("2d");
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const CELL = 4;
    const blob = (x, y) =>
      0.5 + 0.5 * Math.sin(x * 1.9 + 2.4 * Math.sin(y * 1.2)) * Math.sin(y * 2.1 + 2.2 * Math.sin(x * 0.8));
    context.clearRect(0, 0, width, height);
    context.fillStyle = inkColor;
    const cols = Math.ceil(width / CELL);
    const rows = Math.ceil(height / CELL);
    const ALPHAS = [0, 0.05, 0.09, 0.13];
    for (let gy = 0; gy < rows; gy += 1) {
      for (let gx = 0; gx < cols; gx += 1) {
        const px = gx / cols;
        const py = gy / rows;
        let density = 0.62 * blob(px * 2.7, py * 2.7) + 0.38 * blob(px * 6.3 + 7.1, py * 6.3 + 3.4);
        density = (density - 0.44) * 1.55;
        density += (hash2(gx, gy) - 0.5) * 0.12;
        const threshold = (BAYER_4[gy % 4][gx % 4] + 0.5) / 16;
        let level = Math.floor(density * 3 + threshold);
        level = Math.max(0, Math.min(3, level));
        if (!level) continue;
        context.globalAlpha = ALPHAS[level];
        context.fillRect(gx * CELL, gy * CELL, CELL - 1, CELL - 1);
      }
    }
    const starCount = Math.round((width * height) / 11000);
    for (let index = 0; index < starCount; index += 1) {
      const x = Math.floor(hash2(index, 7) * width);
      const y = Math.floor(hash2(index, 13) * height);
      const size = hash2(index, 29) > 0.85 ? 2 : 1;
      context.globalAlpha = 0.1 + hash2(index, 41) * 0.3;
      context.fillRect(x, y, size, size);
      if (hash2(index, 53) > 0.96) {
        context.fillRect(x - 3, y, 2, 1);
        context.fillRect(x + 2, y, 2, 1);
        context.fillRect(x, y - 3, 1, 2);
        context.fillRect(x, y + 2, 1, 2);
      }
    }
    context.globalAlpha = 1;
  }

  window.Starfield = { paint };
})();

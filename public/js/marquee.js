(function () {
  const marquee = document.querySelector('.marquee');
  if (!marquee) return;

  function buildBulbs() {
    marquee.querySelectorAll('.bulb').forEach((b) => b.remove());

    const w = marquee.offsetWidth;
    const h = marquee.offsetHeight;
    const spacing = 26;
    const perimeter = 2 * (w + h);
    const count = Math.max(16, Math.round(perimeter / spacing));

    for (let i = 0; i < count; i++) {
      const bulb = document.createElement('span');
      bulb.className = 'bulb';
      const dist = (i / count) * perimeter;
      const pos = placeOnPerimeter(dist, w, h);
      bulb.style.left = pos.x + 'px';
      bulb.style.top = pos.y + 'px';
      // Stagger delay so every third bulb lights together, giving a chase effect
      bulb.style.animationDelay = `${(i % 3) * 0.25}s`;
      marquee.appendChild(bulb);
    }
  }

  function placeOnPerimeter(dist, w, h) {
    if (dist < w) return { x: dist, y: -4 };
    dist -= w;
    if (dist < h) return { x: w - 4, y: dist };
    dist -= h;
    if (dist < w) return { x: w - dist, y: h - 4 };
    dist -= w;
    return { x: -4, y: h - dist };
  }

  buildBulbs();
  window.addEventListener('resize', buildBulbs);
})();

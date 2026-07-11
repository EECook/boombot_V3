(function () {
  const canvas = document.getElementById('theater-bg');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let w, h, dpr;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.width = window.innerWidth * dpr;
    h = canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
  }
  resize();
  window.addEventListener('resize', resize);

  // Floating dust motes, like light catching particles in a dark theater
  const MOTE_COUNT = Math.round((window.innerWidth * window.innerHeight) / 22000);
  const motes = Array.from({ length: MOTE_COUNT }, () => spawnMote());

  function spawnMote() {
    return {
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.6 + 0.4,
      speedY: Math.random() * 0.12 + 0.03,
      driftX: Math.random() * 0.06 - 0.03,
      alpha: Math.random() * 0.4 + 0.15,
      twinkleSpeed: Math.random() * 0.01 + 0.003,
      twinklePhase: Math.random() * Math.PI * 2
    };
  }

  let beamAngle = 0;
  let t = 0;

  function draw() {
    ctx.clearRect(0, 0, w, h);

    // Base vignette so the corners feel like a dim theater, not flat color
    const grad = ctx.createRadialGradient(w / 2, h * 0.35, 0, w / 2, h * 0.35, w * 0.75);
    grad.addColorStop(0, 'rgba(40, 26, 56, 0.35)');
    grad.addColorStop(1, 'rgba(10, 6, 16, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Two slow, crossing projector beams - gold from the left, teal from the right
    if (!reduceMotion) {
      const bx1 = w * 0.3 + Math.sin(t * 0.00025) * w * 0.22;
      const by1 = -h * 0.08;
      const beam1 = ctx.createRadialGradient(bx1, by1, 0, bx1, by1, h * 0.95);
      beam1.addColorStop(0, 'rgba(232, 176, 75, 0.09)');
      beam1.addColorStop(0.5, 'rgba(232, 176, 75, 0.03)');
      beam1.addColorStop(1, 'rgba(232, 176, 75, 0)');
      ctx.fillStyle = beam1;
      ctx.fillRect(0, 0, w, h);

      const bx2 = w * 0.7 + Math.cos(t * 0.00018) * w * 0.22;
      const by2 = -h * 0.05;
      const beam2 = ctx.createRadialGradient(bx2, by2, 0, bx2, by2, h * 0.8);
      beam2.addColorStop(0, 'rgba(62, 110, 107, 0.08)');
      beam2.addColorStop(0.5, 'rgba(62, 110, 107, 0.03)');
      beam2.addColorStop(1, 'rgba(62, 110, 107, 0)');
      ctx.fillStyle = beam2;
      ctx.fillRect(0, 0, w, h);
    }

    // Dust motes
    for (const m of motes) {
      const twinkle = 0.5 + 0.5 * Math.sin(t * m.twinkleSpeed + m.twinklePhase);
      ctx.beginPath();
      ctx.arc(m.x * dpr, m.y * dpr, m.r * dpr, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(243, 229, 201, ${m.alpha * twinkle})`;
      ctx.fill();

      if (!reduceMotion) {
        m.y -= m.speedY;
        m.x += m.driftX;
        if (m.y < -10) {
          m.y = window.innerHeight + 10;
          m.x = Math.random() * window.innerWidth;
        }
      }
    }

    t += 16;
    requestAnimationFrame(draw);
  }

  draw();
})();

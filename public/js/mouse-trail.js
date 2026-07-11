(function () {
  const canvas = document.getElementById('mouse-trail');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  let dpr;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
  }
  resize();
  window.addEventListener('resize', resize);

  let particles = [];
  let lastX = null;
  let lastY = null;

  window.addEventListener('pointermove', (e) => {
    const x = e.clientX;
    const y = e.clientY;
    const moved = lastX === null || Math.hypot(x - lastX, y - lastY) > 4;

    if (moved) {
      for (let i = 0; i < 2; i++) {
        particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 0.4,
          vy: -Math.random() * 0.3 - 0.1,
          r: Math.random() * 2 + 1,
          life: 1
        });
      }
      lastX = x;
      lastY = y;
    }

    if (particles.length > 140) particles.splice(0, particles.length - 140);
  });

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x * dpr, p.y * dpr, p.r * dpr * p.life, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(246, 207, 122, ${0.5 * p.life})`;
      ctx.shadowColor = 'rgba(246, 207, 122, 0.6)';
      ctx.shadowBlur = 6 * dpr;
      ctx.fill();

      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.02;
    });
    ctx.shadowBlur = 0;

    particles = particles.filter((p) => p.life > 0);
    requestAnimationFrame(draw);
  }

  draw();
})();

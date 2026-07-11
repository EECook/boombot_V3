(function () {
  const card = document.getElementById('marquee-card');
  if (!card) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(pointer: coarse)').matches) return; // skip on touch

  card.style.transformStyle = 'preserve-3d';
  card.style.transition = 'transform 0.25s ease-out';
  card.style.willChange = 'transform';

  let raf = null;

  window.addEventListener('mousemove', (e) => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      const rect = card.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (window.innerWidth / 2);
      const dy = (e.clientY - cy) / (window.innerHeight / 2);

      const rotY = Math.max(-6, Math.min(6, dx * 6));
      const rotX = Math.max(-6, Math.min(6, -dy * 6));

      card.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
      raf = null;
    });
  });

  window.addEventListener('mouseleave', () => {
    card.style.transform = 'perspective(900px) rotateX(0) rotateY(0)';
  });
})();

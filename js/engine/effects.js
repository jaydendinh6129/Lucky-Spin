/* ============================================================
 *  Celebration effects
 * ============================================================ */

const fireConfetti = (colors, power = 1) => {
  if (typeof confetti !== 'function') return;
  const base = { colors, disableForReducedMotion: true };
  confetti({ ...base, particleCount: Math.round(140 * power), spread: 90, startVelocity: 45, origin: { y: 0.55 }, scalar: 1.1 });
  setTimeout(() => confetti({ ...base, particleCount: Math.round(70 * power), spread: 120, angle: 60, origin: { x: 0, y: 0.7 } }), 180);
  setTimeout(() => confetti({ ...base, particleCount: Math.round(70 * power), spread: 120, angle: 120, origin: { x: 1, y: 0.7 } }), 360);
};

const spawnFloaters = (emojis, count) => {
  if (REDUCED_MOTION || !emojis.length) return;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'float-particle';
    el.textContent = emojis[randInt(emojis.length)];
    el.style.left = `${5 + rand() * 90}%`;
    el.style.fontSize = `${24 + rand() * 28}px`;
    el.style.animationDuration = `${2.6 + rand() * 1.2}s`;
    el.style.animationDelay = `${rand() * 0.6}s`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 5000);
  }
};

const flashScreen = () => {
  if (REDUCED_MOTION) return;
  const el = document.createElement('div');
  el.className = 'flash-overlay';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1300);
};

const triggerThemeEffect = (theme) => {
  switch (theme.effect) {
    case 'hearts':
      spawnFloaters(theme.floaters, 22);
      fireConfetti(theme.confettiColors);
      break;
    case 'flash':
      flashScreen();
      fireConfetti(theme.confettiColors, 1.4);
      spawnFloaters(theme.floaters, 10);
      break;
    case 'clean':
      fireConfetti(theme.confettiColors, 0.5);
      break;
    default:
      fireConfetti(theme.confettiColors);
      spawnFloaters(theme.floaters, 10);
      break;
  }
};

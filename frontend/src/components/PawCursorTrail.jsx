import { useEffect } from 'react';

const PAW_PATH = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" height="100%">
    <ellipse cx="12" cy="19" rx="6.5" ry="8.5" fill="currentColor"/>
    <ellipse cx="25" cy="11" rx="6.5" ry="8.5" fill="currentColor"/>
    <ellipse cx="39" cy="11" rx="6.5" ry="8.5" fill="currentColor"/>
    <ellipse cx="52" cy="19" rx="6.5" ry="8.5" fill="currentColor"/>
    <path d="M32 27C20 27 12 34 12 43C12 52 20 57 32 57C44 57 52 52 52 43C52 34 44 27 32 27Z" fill="currentColor"/>
  </svg>`;

/**
 * Spawns paw print SVGs at cursor position as the user moves the mouse.
 * Alternates left/right paw (rotated), fades out after ~700ms.
 * Pure DOM — no React re-renders on mousemove.
 */
export default function PawCursorTrail() {
  useEffect(() => {
    let count = 0;
    let lastX = 0;
    let lastY = 0;

    function spawnPaw(x, y, dx, dy) {
      count++;
      const size = 28 + Math.random() * 12; // 28–40px
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      const side = count % 2 === 0 ? -22 : 22; // alternate left/right lean

      // Offset paw slightly sideways relative to movement direction
      const perp = angle + 90;
      const perpRad = (perp * Math.PI) / 180;
      const ox = Math.cos(perpRad) * side * 0.4;
      const oy = Math.sin(perpRad) * side * 0.4;

      const el = document.createElement('div');
      el.innerHTML = PAW_PATH;
      Object.assign(el.style, {
        position: 'fixed',
        left: `${x - size / 2 + ox}px`,
        top: `${y - size / 2 + oy}px`,
        width: `${size}px`,
        height: `${size}px`,
        color: '#4f8ef7',
        opacity: '0.35',
        pointerEvents: 'none',
        zIndex: '9998',
        transform: `rotate(${angle + side}deg)`,
        transition: 'opacity 0.65s ease-out, transform 0.65s ease-out',
      });

      document.body.appendChild(el);

      // Trigger fade + float up
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.style.opacity = '0';
          el.style.transform = `rotate(${angle + side}deg) translateY(-18px) scale(0.85)`;
        });
      });

      setTimeout(() => el.remove(), 700);
    }

    let ticking = false;

    function onMove(e) {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 55) return; // only spawn every ~55px
        spawnPaw(e.clientX, e.clientY, dx, dy);
        lastX = e.clientX;
        lastY = e.clientY;
      });
    }

    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return null;
}

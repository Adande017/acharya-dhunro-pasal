import type { PointerEvent as ReactPointerEvent } from "react";

export function updateTilt(event: ReactPointerEvent<HTMLElement>) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const bounds = event.currentTarget.getBoundingClientRect();
  const x = (event.clientX - bounds.left) / bounds.width;
  const y = (event.clientY - bounds.top) / bounds.height;
  const tilt = Number(event.currentTarget.dataset.tiltStrength) || 8;

  event.currentTarget.style.setProperty("--tilt-x", `${(0.5 - y) * tilt}deg`);
  event.currentTarget.style.setProperty("--tilt-y", `${(x - 0.5) * tilt}deg`);
  event.currentTarget.style.setProperty("--pointer-x", `${x * 100}%`);
  event.currentTarget.style.setProperty("--pointer-y", `${y * 100}%`);
}

export function resetTilt(event: ReactPointerEvent<HTMLElement>) {
  event.currentTarget.style.setProperty("--tilt-x", "0deg");
  event.currentTarget.style.setProperty("--tilt-y", "0deg");
  event.currentTarget.style.setProperty("--pointer-x", "50%");
  event.currentTarget.style.setProperty("--pointer-y", "50%");
}

export const whenIdle = (cb: () => void, timeout = 3000) => {
  if (typeof window === 'undefined') return;
  const ric = window.requestIdleCallback;
  if (ric) ric(cb, { timeout });
  else setTimeout(cb, 1200);
};

export const onFirstInteraction = (cb: () => void) => {
  if (typeof window === 'undefined') return;
  const events = ['pointerdown', 'keydown', 'touchstart', 'scroll'] as const;
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    for (const e of events) window.removeEventListener(e, run);
    cb();
  };
  for (const e of events) window.addEventListener(e, run, { passive: true });
};

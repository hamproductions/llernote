export const whenIdle = (cb: () => void, timeout = 3000) => {
  if (typeof window === 'undefined') return;
  const ric = window.requestIdleCallback;
  if (ric) ric(cb, { timeout });
  else setTimeout(cb, 1200);
};

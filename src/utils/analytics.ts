declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export const GA_ID = 'G-RHGVS7P3FM';

export const trackException = (description: string, fatal = false) => {
  if (typeof window === 'undefined') return;
  window.gtag?.('event', 'exception', { description: description.slice(0, 500), fatal });
};

export const trackEvent = (name: string, params?: Record<string, unknown>) => {
  if (typeof window === 'undefined') return;
  window.gtag?.('event', name, params);
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export const GA_ID = 'G-RHGVS7P3FM';

let analyticsLoaded = false;
export const loadAnalytics = () => {
  if (analyticsLoaded || typeof window === 'undefined') return;
  analyticsLoaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer!.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID);
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);
};

export const trackException = (description: string, fatal = false) => {
  if (typeof window === 'undefined') return;
  window.gtag?.('event', 'exception', { description: description.slice(0, 500), fatal });
};

export const trackEvent = (name: string, params?: Record<string, unknown>) => {
  if (typeof window === 'undefined') return;
  window.gtag?.('event', name, params);
};

export const SITE_ORIGIN = 'https://hamproductions.github.io';

export const SITE_URL = `${SITE_ORIGIN}${import.meta.env.PUBLIC_ENV__BASE_URL ?? '/'}`.replace(
  /\/?$/,
  '/'
);

export const SITE_DISPLAY_URL = SITE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');

import { join } from 'path-browserify';

export const toAppUrl = (path: string) => join(import.meta.env.BASE_URL, path);

export const isActiveRoute = (path: string, currentPath: string, exact = false) => {
  const href = toAppUrl(path);
  const normHref = href.length > 1 && href.endsWith('/') ? href.slice(0, -1) : href;
  const normCurrent =
    currentPath.length > 1 && currentPath.endsWith('/') ? currentPath.slice(0, -1) : currentPath;

  if (exact) return normCurrent === normHref;

  return (
    normCurrent === normHref ||
    (normCurrent.startsWith(normHref) && normCurrent.charAt(normHref.length) === '/')
  );
};

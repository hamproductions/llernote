export const VERSION = import.meta.env.PUBLIC_ENV__APP_VERSION ?? '0.1.0';

export const BUILD_TIMESTAMP = import.meta.env.PUBLIC_ENV__BUILD_TIMESTAMP ?? '';

export const getVersionString = (): string => {
  return `v${VERSION} (Built: ${new Date(BUILD_TIMESTAMP).toLocaleString()})`;
};

import { useSyncExternalStore } from 'react';
import {
  appSettingsStore,
  DEFAULT_APP_SETTINGS,
  setAppSettings,
  type AppSettings
} from '~/utils/app-settings';

export const useAppSettings = (): AppSettings & {
  setAppSettings: typeof setAppSettings;
} => {
  const settings = useSyncExternalStore(
    (cb) => appSettingsStore.subscribe(cb),
    () => appSettingsStore.get(),
    () => DEFAULT_APP_SETTINGS
  );

  return { ...settings, setAppSettings };
};

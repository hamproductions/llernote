import { SyncedStore } from './attendance/storage';

export interface AppSettings {
  inPersonOnly: boolean;
}

export const DEFAULT_APP_SETTINGS: AppSettings = { inPersonOnly: false };

export const appSettingsStore = new SyncedStore<AppSettings>(
  'llernote-settings',
  DEFAULT_APP_SETTINGS
);

export const setAppSettings = (patch: Partial<AppSettings>) => {
  appSettingsStore.set({ ...appSettingsStore.get(), ...patch });
};

export const deleteAllLocalData = () => {
  const keys = Object.keys(localStorage).filter((key) => key.startsWith('llernote-'));
  keys.forEach((key) => localStorage.removeItem(key));
  window.location.reload();
};

import { SyncedStore } from './attendance/storage';
import type { Scope } from './attendance/witness';

export interface AppSettings {
  scope: Scope;
}

export const DEFAULT_APP_SETTINGS: AppSettings = { scope: 'all' };

export const appSettingsStore = new SyncedStore<AppSettings>(
  'llernote-settings',
  DEFAULT_APP_SETTINGS
);

// Migrate the legacy binary `inPersonOnly` flag to the 3-state `scope`.
if (typeof window !== 'undefined') {
  const raw = appSettingsStore.get() as AppSettings & { inPersonOnly?: boolean };
  if (raw.scope !== 'all' && raw.scope !== 'inperson' && raw.scope !== 'remote') {
    appSettingsStore.set({ scope: raw.inPersonOnly ? 'inperson' : 'all' });
  }
}

export const setAppSettings = (patch: Partial<AppSettings>) => {
  appSettingsStore.set({ ...appSettingsStore.get(), ...patch });
};

export const deleteAllLocalData = () => {
  const keys = Object.keys(localStorage).filter((key) => key.startsWith('llernote-'));
  keys.forEach((key) => localStorage.removeItem(key));
  window.location.reload();
};

import { WritableAtom } from 'jotai';
import {
  atomWithLocalStorage,
  getLocalStorageItem,
  setLocalStorageItem,
} from './utils/atomWithLocalStorage';

export type PttSettings = {
  enabled: boolean;
  shortcut: string | null;
};

const PTT_SETTINGS = 'pttSettings';

const DEFAULT_SETTINGS: PttSettings = {
  enabled: false,
  shortcut: null,
};

export type PttSettingsAtom = WritableAtom<PttSettings, [PttSettings], undefined>;

export const makePttSettingsAtom = (userId: string): PttSettingsAtom => {
  const storeKey = `${PTT_SETTINGS}${userId}`;

  const pttSettingsAtom = atomWithLocalStorage<PttSettings>(
    storeKey,
    (key) => getLocalStorageItem<PttSettings>(key, DEFAULT_SETTINGS),
    (key, value) => {
      setLocalStorageItem(key, value);
    }
  );

  return pttSettingsAtom;
};

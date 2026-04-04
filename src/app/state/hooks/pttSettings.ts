import { createContext, useContext } from 'react';
import { useAtom } from 'jotai';
import { PttSettings, PttSettingsAtom } from '../pttSettings';

const PttSettingsAtomContext = createContext<PttSettingsAtom | null>(null);
export const PttSettingsProvider = PttSettingsAtomContext.Provider;

export const usePttSettingsAtom = (): PttSettingsAtom => {
  const atom = useContext(PttSettingsAtomContext);
  if (!atom) {
    throw new Error('PttSettingsAtom not provided!');
  }

  return atom;
};

export const usePttSettings = (): [PttSettings, (settings: PttSettings) => void] => {
  const pttSettingsAtom = usePttSettingsAtom();
  return useAtom(pttSettingsAtom);
};

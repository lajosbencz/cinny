import { useEffect, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { PttEngine } from '../plugins/ptt';
import { CallEmbed } from '../plugins/call';
import { isTauri } from '../utils/tauri';
import { usePttSettingsAtom } from '../state/hooks/pttSettings';

export function usePtt(embed: CallEmbed): void {
  const pttSettingsAtom = usePttSettingsAtom();
  const pttSettings = useAtomValue(pttSettingsAtom);
  const engineRef = useRef<PttEngine | null>(null);

  useEffect(() => {
    if (!isTauri()) return undefined;

    const engine = new PttEngine();
    engineRef.current = engine;

    return () => {
      engine.stop();
      engineRef.current = null;
    };
  }, []);

  // Wire PttEngine to PttAudioGate and start/stop based on settings
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return undefined;

    const { enabled, shortcut } = pttSettings;

    if (enabled && shortcut && embed.joined) {
      engine.setGate(embed.pttAudioGate);
      embed.pttAudioGate.enable();
      engine.start(shortcut);
    } else {
      embed.pttAudioGate.disable();
      engine.setGate(null);
      engine.stop();
    }

    return () => {
      embed.pttAudioGate.disable();
      engine.setGate(null);
      engine.stop();
    };
  }, [pttSettings, embed, embed.joined]);
}

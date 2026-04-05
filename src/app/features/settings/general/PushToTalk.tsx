import React, { useCallback, useEffect, useState } from 'react';
import { Box, Button, Icon, IconButton, Icons, Switch, Text } from 'folds';
import { SequenceCard } from '../../../components/sequence-card';
import { SettingTile } from '../../../components/setting-tile';
import { SequenceCardStyle } from '../styles.css';
import { usePttSettings } from '../../../state/hooks/pttSettings';
import { tauriInvoke, tauriListen } from '../../../utils/tauri';

const MOUSE_NAMES: Record<string, string> = {
  Left: 'Left Click',
  Right: 'Right Click',
  Middle: 'Middle Click',
  Button4: 'Mouse 4',
  Button5: 'Mouse 5',
};

const KEY_DISPLAY_NAMES: Record<string, string> = {
  Space: 'Space',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/',
  Grave: '`',
  Minus: '-',
  Equal: '=',
};

function keyNameToDisplay(name: string): string {
  if (KEY_DISPLAY_NAMES[name]) return KEY_DISPLAY_NAMES[name];
  if (name.startsWith('Key')) return name.slice(3);
  if (name.startsWith('Num')) return name.slice(3);
  return name;
}

function bindingToDisplay(binding: string): string {
  const colonIdx = binding.indexOf(':');
  if (colonIdx === -1) return binding;

  const kind = binding.slice(0, colonIdx);
  const value = binding.slice(colonIdx + 1);

  if (kind === 'mouse') {
    return MOUSE_NAMES[value] ?? value;
  }

  // key binding, possibly with modifiers: "Shift+Ctrl+KeyA" or "KeyA"
  const parts = value.split('+');
  const displayed = parts.map((part, i) => {
    if (i === parts.length - 1) return keyNameToDisplay(part);
    // modifier
    if (part === 'Meta') return navigator.platform.startsWith('Mac') ? 'Cmd' : 'Win';
    return part;
  });
  return displayed.join(' + ');
}

function CheckMacOSPermission() {
  const [status, setStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown');

  const handleCheck = useCallback(async () => {
    const granted = await tauriInvoke<boolean>('check_input_monitoring');
    if (granted) {
      setStatus('granted');
    } else {
      await tauriInvoke<boolean>('request_input_monitoring');
      setStatus('denied');
    }
  }, []);

  return (
    <Box direction="Column" gap="100">
      <Box alignItems="Center" gap="200">
        <Button size="300" variant="Secondary" fill="Soft" onClick={handleCheck}>
          <Text size="B300">Check Permission</Text>
        </Button>
        {status === 'granted' && (
          <Text size="T200" priority="300">
            Input Monitoring granted
          </Text>
        )}
        {status === 'denied' && (
          <Text size="T200" priority="300">
            Enable Input Monitoring in System Settings &gt; Privacy &amp; Security
          </Text>
        )}
      </Box>
    </Box>
  );
}

function KeyCaptureButton({
  shortcut,
  onCapture,
  onClear,
}: {
  shortcut: string | null;
  onCapture: (binding: string) => void;
  onClear: () => void;
}) {
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    if (!capturing) return undefined;

    let unlisten: (() => void) | null = null;
    let cancelled = false;

    const startCapture = async () => {
      unlisten = await tauriListen<string>('ptt-captured', (binding) => {
        if (cancelled) return;
        onCapture(binding);
        setCapturing(false);
      });

      if (!cancelled) {
        await tauriInvoke('ptt_start_capture');
      }
    };

    startCapture();

    return () => {
      cancelled = true;
      if (unlisten) unlisten();
      tauriInvoke('ptt_stop_capture');
    };
  }, [capturing, onCapture]);

  if (capturing) {
    return (
      <Button size="300" variant="Primary" fill="Soft" onClick={() => setCapturing(false)}>
        <Text size="B300">Press any key or mouse button...</Text>
      </Button>
    );
  }

  return (
    <Box alignItems="Center" gap="200">
      <Button size="300" variant="Secondary" fill="Soft" onClick={() => setCapturing(true)}>
        <Text size="B300">{shortcut ? bindingToDisplay(shortcut) : 'Click to bind'}</Text>
      </Button>
      {shortcut && (
        <IconButton size="300" variant="Surface" radii="300" onClick={onClear}>
          <Icon size="50" src={Icons.Cross} />
        </IconButton>
      )}
    </Box>
  );
}

export function PushToTalk() {
  const [pttSettings, setPttSettings] = usePttSettings();
  const [isMac] = useState(() => navigator.platform.startsWith('Mac'));
  const [isWayland, setIsWayland] = useState<boolean | null>(null);

  useEffect(() => {
    tauriInvoke<boolean>('is_wayland').then(setIsWayland);
  }, []);

  const handleToggle = useCallback(
    (enabled: boolean) => {
      setPttSettings({ ...pttSettings, enabled });
    },
    [pttSettings, setPttSettings]
  );

  const handleInverse = useCallback(
    (inverse: boolean) => {
      setPttSettings({ ...pttSettings, inverse });
    },
    [pttSettings, setPttSettings]
  );

  const handleCapture = useCallback(
    (binding: string) => {
      setPttSettings({ ...pttSettings, shortcut: binding });
    },
    [pttSettings, setPttSettings]
  );

  const handleClear = useCallback(() => {
    setPttSettings({ ...pttSettings, shortcut: null, enabled: false });
  }, [pttSettings, setPttSettings]);

  return (
    <Box direction="Column" gap="100">
      <Text size="L400">Push to Talk</Text>
      <SequenceCard className={SequenceCardStyle} variant="SurfaceVariant" direction="Column">
        <SettingTile
          title="Enable Push to Talk"
          description="Hold a key or mouse button to unmute during calls"
          after={
            <Switch
              variant="Primary"
              value={pttSettings.enabled}
              onChange={handleToggle}
              disabled={!pttSettings.shortcut}
            />
          }
        />
      </SequenceCard>
      <SequenceCard className={SequenceCardStyle} variant="SurfaceVariant" direction="Column">
        <SettingTile
          title="Push to Mute"
          description="Invert behavior — hold to mute instead of unmute"
          after={
            <Switch
              variant="Primary"
              value={pttSettings.inverse}
              onChange={handleInverse}
              disabled={!pttSettings.enabled}
            />
          }
        />
      </SequenceCard>
      <SequenceCard className={SequenceCardStyle} variant="SurfaceVariant" direction="Column">
        <SettingTile
          title="Keybinding"
          description={
            isWayland
              ? 'On Wayland, the system will prompt you to bind a key'
              : 'Works even when the app is not focused'
          }
          after={
            !isWayland ? (
              <KeyCaptureButton
                shortcut={pttSettings.shortcut}
                onCapture={handleCapture}
                onClear={handleClear}
              />
            ) : undefined
          }
        />
      </SequenceCard>
      {isMac && (
        <SequenceCard className={SequenceCardStyle} variant="SurfaceVariant" direction="Column">
          <SettingTile
            title="macOS Input Monitoring"
            description="Required for global key listening"
            after={<CheckMacOSPermission />}
          />
        </SequenceCard>
      )}
    </Box>
  );
}

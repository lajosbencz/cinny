import { tauriInvoke, tauriListen, isTauri, UnlistenFn } from '../../utils/tauri';
import { PttAudioGate } from './PttAudioGate';

const SAFETY_TIMEOUT_MS = 60_000;

/**
 * Manages the OS-level global key listener via Tauri and
 * drives the PttAudioGate based on key state.
 */
export class PttEngine {
  private gate: PttAudioGate | null = null;

  private registered = false;

  private unlisten: UnlistenFn | null = null;

  private wayland = false;

  private safetyTimer: ReturnType<typeof setTimeout> | null = null;

  private inverse = false;

  setGate(gate: PttAudioGate | null): void {
    this.gate = gate;
  }

  setInverse(inverse: boolean): void {
    this.inverse = inverse;
  }

  async start(binding: string): Promise<void> {
    if (!isTauri()) return;
    await this.stop();

    this.wayland = await tauriInvoke<boolean>('is_wayland');

    this.unlisten = await tauriListen<boolean>('ptt-state', (pressed) => {
      this.onPttEvent(pressed);
    });

    if (this.wayland) {
      await tauriInvoke('start_wayland_ptt');
    } else {
      await tauriInvoke('ptt_register', { binding });
    }

    this.registered = true;
  }

  async stop(): Promise<void> {
    if (!this.registered) return;

    this.clearSafetyTimer();

    if (this.wayland) {
      await tauriInvoke('stop_wayland_ptt').catch(() => undefined);
    } else {
      await tauriInvoke('ptt_unregister').catch(() => undefined);
    }

    if (this.unlisten) {
      this.unlisten();
      this.unlisten = null;
    }

    this.registered = false;
  }

  private onPttEvent(pressed: boolean): void {
    if (!this.gate) return;

    const effective = this.inverse ? !pressed : pressed;

    if (effective) {
      this.gate.press();
      this.startSafetyTimer();
    } else {
      this.gate.release();
      this.clearSafetyTimer();
    }
  }

  private startSafetyTimer(): void {
    this.clearSafetyTimer();
    this.safetyTimer = setTimeout(() => {
      this.gate?.release();
    }, SAFETY_TIMEOUT_MS);
  }

  private clearSafetyTimer(): void {
    if (this.safetyTimer !== null) {
      clearTimeout(this.safetyTimer);
      this.safetyTimer = null;
    }
  }
}

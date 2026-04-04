declare global {
  interface Window {
    __TAURI_INTERNALS__?: {
      invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
      transformCallback: (callback: (response: unknown) => void, once?: boolean) => number;
    };
  }
}

export function isTauri(): boolean {
  return !!window.__TAURI_INTERNALS__;
}

export function tauriInvoke<T = unknown>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const internals = window.__TAURI_INTERNALS__;
  if (!internals) {
    return Promise.reject(new Error('Not running inside Tauri'));
  }
  return internals.invoke(cmd, args) as Promise<T>;
}

export type UnlistenFn = () => void;

export function tauriListen<T = unknown>(
  event: string,
  handler: (payload: T) => void
): Promise<UnlistenFn> {
  const internals = window.__TAURI_INTERNALS__;
  if (!internals) {
    return Promise.reject(new Error('Not running inside Tauri'));
  }

  const callbackId = internals.transformCallback((raw: unknown) => {
    const evt = raw as { payload: T };
    handler(evt.payload);
  });

  return internals
    .invoke('plugin:event|listen', {
      event,
      target: { kind: 'Any' },
      handler: callbackId,
    })
    .then(() => () => {
      internals.invoke('plugin:event|unlisten', {
        event,
        eventId: callbackId,
      });
    });
}

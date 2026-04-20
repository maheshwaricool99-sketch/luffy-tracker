type Listener = (payload: Record<string, unknown>) => void;

const listeners = globalThis.__marketEventListeners ?? new Map<string, Set<Listener>>();

declare global {
  var __marketEventListeners: Map<string, Set<Listener>> | undefined;
}

if (!globalThis.__marketEventListeners) globalThis.__marketEventListeners = listeners;

export function emitMarketEvent(event: string, payload: Record<string, unknown>) {
  for (const listener of listeners.get(event) ?? []) listener(payload);
}

export function onMarketEvent(event: string, listener: Listener) {
  const set = listeners.get(event) ?? new Set<Listener>();
  set.add(listener);
  listeners.set(event, set);
  return () => {
    set.delete(listener);
  };
}

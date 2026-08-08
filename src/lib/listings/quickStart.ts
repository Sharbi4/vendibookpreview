export type QuickStartStep = 'category' | 'mode' | 'location' | 'created';

export interface QuickStartLocation {
  zipCode: string;
  city: string;
  state: string;
}

export function previousQuickStartStep(step: QuickStartStep): QuickStartStep | null {
  if (step === 'location') return 'mode';
  if (step === 'mode') return 'category';
  if (step === 'created') return 'location';
  return null;
}

export function isQuickStartLocationReady(location: QuickStartLocation): boolean {
  return (
    /^\d{5}$/.test(location.zipCode) &&
    location.city.trim().length >= 2 &&
    location.state.trim().length >= 2
  );
}

/**
 * One key is persisted for the life of a quick-start attempt. If the browser
 * retries after a timeout or a lost response, the server can return the same
 * draft instead of creating another one.
 */
export function createQuickStartRequestKey(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  // UUID-shaped fallback for older browsers. This is an idempotency token,
  // not a security credential.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const value = Math.floor(Math.random() * 16);
    const nibble = char === 'x' ? value : (value & 0x3) | 0x8;
    return nibble.toString(16);
  });
}

import '@testing-library/jest-dom/vitest';
import * as matchers from 'vitest-axe/matchers';
import { cleanup } from '@testing-library/react';
import { afterEach, expect, vi } from 'vitest';

// Node 22+ ships its own localStorage global (undefined unless --localstorage-file is set), which hides jsdom's.
// Give the tests an in-memory Storage when that happens.
function memoryStorage() {
  const m = new Map();
  return {
    get length() { return m.size; },
    key: (i) => [...m.keys()][i] ?? null,
    getItem: (k) => (m.has(String(k)) ? m.get(String(k)) : null),
    setItem: (k, v) => { m.set(String(k), String(v)); },
    removeItem: (k) => { m.delete(String(k)); },
    clear: () => { m.clear(); },
  };
}
['localStorage', 'sessionStorage'].forEach((name) => {
  if (globalThis[name]) return;
  const store = memoryStorage();
  Object.defineProperty(globalThis, name, { configurable: true, get: () => store });
  if (typeof window !== 'undefined' && window !== globalThis) Object.defineProperty(window, name, { configurable: true, get: () => store });
});

expect.extend(matchers);
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  localStorage.clear();
  sessionStorage.clear();
});

import { describe, expect, it, vi } from 'vitest';
import { onActivate, onBackdrop } from './a11y';

const evt = (over = {}) => {
  const el = {};
  return { key: 'Enter', target: el, currentTarget: el, preventDefault: vi.fn(), ...over };
};

describe('onActivate', () => {
  it('runs on Enter and Space when the element itself is focused', () => {
    const fn = vi.fn();
    onActivate(fn)(evt());
    onActivate(fn)(evt({ key: ' ' }));
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('ignores other keys, keys from nested controls and a missing handler', () => {
    const fn = vi.fn();
    onActivate(fn)(evt({ key: 'a' }));
    onActivate(fn)(evt({ target: {} }));
    expect(fn).not.toHaveBeenCalled();
    expect(() => onActivate(undefined)(evt())).not.toThrow();
  });
});

describe('onBackdrop', () => {
  it('fires only for clicks on the backdrop itself', () => {
    const fn = vi.fn();
    onBackdrop(fn)(evt());
    onBackdrop(fn)(evt({ target: {} }));
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

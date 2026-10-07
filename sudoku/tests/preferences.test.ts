import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CLUE_COUNT_STORAGE_KEY,
  LANGUAGE_STORAGE_KEY,
  PREFERENCES_ENABLED_STORAGE_KEY,
  SEED_STORAGE_KEY,
  THEME_STORAGE_KEY,
  isPreferencePersistenceEnabled,
  normalizePreferenceStorage,
  readPreferenceValue,
  readStoredClueCount,
  readStoredSeed,
  setPreferencePersistenceEnabled,
  storeClueCount,
  storePreferenceValue,
  storeSeed,
  type StorageLike
} from '../src/lib/preferences.js';

function createStorage(initial: Record<string, string> = {}): StorageLike {
  const values = new Map<string, string>(Object.entries(initial));

  return {
    getItem(key: string): string | null {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      values.set(key, String(value));
    },
    removeItem(key: string): void {
      values.delete(key);
    }
  };
}

test('preference persistence is off by default and stale values are removed', () => {
  const storage = createStorage({
    [CLUE_COUNT_STORAGE_KEY]: '28',
    [SEED_STORAGE_KEY]: '12345',
    [LANGUAGE_STORAGE_KEY]: 'ja',
    [THEME_STORAGE_KEY]: 'dark'
  });

  assert.equal(normalizePreferenceStorage(storage), false);
  assert.equal(isPreferencePersistenceEnabled(storage), false);
  assert.equal(storage.getItem(PREFERENCES_ENABLED_STORAGE_KEY), null);
  assert.equal(storage.getItem(CLUE_COUNT_STORAGE_KEY), null);
  assert.equal(storage.getItem(SEED_STORAGE_KEY), null);
  assert.equal(storage.getItem(LANGUAGE_STORAGE_KEY), null);
  assert.equal(storage.getItem(THEME_STORAGE_KEY), null);
});

test('opting in stores the enabled flag and allows preferences to persist', () => {
  const storage = createStorage();

  assert.equal(setPreferencePersistenceEnabled(true, storage), true);
  assert.equal(storage.getItem(PREFERENCES_ENABLED_STORAGE_KEY), 'true');
  assert.equal(storeClueCount(28, storage), true);
  assert.equal(storeSeed('001234', storage), true);
  assert.equal(storePreferenceValue(LANGUAGE_STORAGE_KEY, 'ja', storage), true);
  assert.equal(storePreferenceValue(THEME_STORAGE_KEY, 'dark', storage), true);

  assert.equal(readStoredClueCount(storage), 28);
  assert.equal(readStoredSeed(storage), '001234');
  assert.equal(readPreferenceValue(LANGUAGE_STORAGE_KEY, storage), 'ja');
  assert.equal(readPreferenceValue(THEME_STORAGE_KEY, storage), 'dark');
});

test('opting out removes the enabled flag and every saved preference', () => {
  const storage = createStorage({
    [PREFERENCES_ENABLED_STORAGE_KEY]: 'true',
    [CLUE_COUNT_STORAGE_KEY]: '24',
    [SEED_STORAGE_KEY]: '98765',
    [LANGUAGE_STORAGE_KEY]: 'en',
    [THEME_STORAGE_KEY]: 'light'
  });

  assert.equal(setPreferencePersistenceEnabled(false, storage), true);
  assert.equal(isPreferencePersistenceEnabled(storage), false);
  assert.equal(storage.getItem(PREFERENCES_ENABLED_STORAGE_KEY), null);
  assert.equal(storage.getItem(CLUE_COUNT_STORAGE_KEY), null);
  assert.equal(storage.getItem(SEED_STORAGE_KEY), null);
  assert.equal(storage.getItem(LANGUAGE_STORAGE_KEY), null);
  assert.equal(storage.getItem(THEME_STORAGE_KEY), null);
});

test('preferences are not written while persistence is disabled', () => {
  const storage = createStorage();

  assert.equal(storeClueCount(32, storage), false);
  assert.equal(storeSeed('123', storage), false);
  assert.equal(storePreferenceValue(LANGUAGE_STORAGE_KEY, 'ja', storage), false);
  assert.equal(storePreferenceValue(THEME_STORAGE_KEY, 'dark', storage), false);
  assert.equal(storage.getItem(CLUE_COUNT_STORAGE_KEY), null);
  assert.equal(storage.getItem(SEED_STORAGE_KEY), null);
});

test('blank seed removes the saved seed while persistence remains enabled', () => {
  const storage = createStorage({ [PREFERENCES_ENABLED_STORAGE_KEY]: 'true' });

  assert.equal(storeSeed('001234', storage), true);
  assert.equal(readStoredSeed(storage), '001234');
  assert.equal(storeSeed('   ', storage), true);
  assert.equal(storage.getItem(SEED_STORAGE_KEY), null);
  assert.equal(readStoredSeed(storage), '');
  assert.equal(isPreferencePersistenceEnabled(storage), true);
});

test('invalid stored clue count is ignored when persistence is enabled', () => {
  const storage = createStorage({
    [PREFERENCES_ENABLED_STORAGE_KEY]: 'true',
    [CLUE_COUNT_STORAGE_KEY]: 'not-a-number'
  });

  assert.equal(readStoredClueCount(storage), null);
});

test('storage failures are handled without throwing', () => {
  const storage = {
    getItem() {
      throw new Error('blocked');
    },
    setItem() {
      throw new Error('blocked');
    },
    removeItem() {
      throw new Error('blocked');
    }
  };

  assert.equal(normalizePreferenceStorage(storage), false);
  assert.equal(isPreferencePersistenceEnabled(storage), false);
  assert.equal(readPreferenceValue(LANGUAGE_STORAGE_KEY, storage), null);
  assert.equal(readStoredClueCount(storage), null);
  assert.equal(readStoredSeed(storage), '');
  assert.equal(setPreferencePersistenceEnabled(true, storage), false);
  assert.equal(storeClueCount(32, storage), false);
  assert.equal(storeSeed('123', storage), false);
});

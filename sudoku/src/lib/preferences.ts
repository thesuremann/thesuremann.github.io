export const PREFERENCES_ENABLED_STORAGE_KEY = 'sudoku_preferences_enabled';
export const CLUE_COUNT_STORAGE_KEY = 'sudoku_clue_count';
export const SEED_STORAGE_KEY = 'sudoku_seed';
export const LANGUAGE_STORAGE_KEY = 'sudoku_lang';
export const THEME_STORAGE_KEY = 'sudoku_theme';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const PREFERENCE_STORAGE_KEYS = [
  PREFERENCES_ENABLED_STORAGE_KEY,
  CLUE_COUNT_STORAGE_KEY,
  SEED_STORAGE_KEY,
  LANGUAGE_STORAGE_KEY,
  THEME_STORAGE_KEY
];

function resolveStorage(storage?: StorageLike | null): StorageLike | null {
  if (storage) {
    return storage;
  }

  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

function readRawStorageValue(key: string, storage?: StorageLike | null): string | null {
  const target = resolveStorage(storage);
  if (!target) {
    return null;
  }

  try {
    return target.getItem(key);
  } catch {
    return null;
  }
}

function storeRawStorageValue(
  key: string,
  value: unknown,
  storage?: StorageLike | null
): boolean {
  const target = resolveStorage(storage);
  if (!target) {
    return false;
  }

  try {
    target.setItem(key, String(value));
    return true;
  } catch {
    return false;
  }
}

function removeRawStorageValue(key: string, storage?: StorageLike | null): boolean {
  const target = resolveStorage(storage);
  if (!target) {
    return false;
  }

  try {
    target.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function isPreferencePersistenceEnabled(storage?: StorageLike | null): boolean {
  return readRawStorageValue(PREFERENCES_ENABLED_STORAGE_KEY, storage) === 'true';
}

export function clearPreferenceStorage(storage?: StorageLike | null): boolean {
  let succeeded = true;

  for (const key of PREFERENCE_STORAGE_KEYS) {
    succeeded = removeRawStorageValue(key, storage) && succeeded;
  }

  return succeeded;
}

export function normalizePreferenceStorage(storage?: StorageLike | null): boolean {
  if (isPreferencePersistenceEnabled(storage)) {
    return true;
  }

  clearPreferenceStorage(storage);
  return false;
}

export function setPreferencePersistenceEnabled(
  enabled: boolean,
  storage?: StorageLike | null
): boolean {
  if (enabled) {
    return storeRawStorageValue(PREFERENCES_ENABLED_STORAGE_KEY, 'true', storage);
  }

  return clearPreferenceStorage(storage);
}

export function readPreferenceValue(key: string, storage?: StorageLike | null): string | null {
  if (!isPreferencePersistenceEnabled(storage)) {
    return null;
  }

  return readRawStorageValue(key, storage);
}

export function storePreferenceValue(
  key: string,
  value: unknown,
  storage?: StorageLike | null
): boolean {
  if (!isPreferencePersistenceEnabled(storage)) {
    return false;
  }

  return storeRawStorageValue(key, value, storage);
}

export function removePreferenceValue(key: string, storage?: StorageLike | null): boolean {
  if (!isPreferencePersistenceEnabled(storage)) {
    return false;
  }

  return removeRawStorageValue(key, storage);
}

export function readStoredClueCount(storage?: StorageLike | null): number | null {
  const rawValue = readPreferenceValue(CLUE_COUNT_STORAGE_KEY, storage);
  if (rawValue == null || rawValue.trim() === '') {
    return null;
  }

  const clueCount = Number(rawValue);
  return Number.isInteger(clueCount) ? clueCount : null;
}

export function storeClueCount(value: unknown, storage?: StorageLike | null): boolean {
  const clueCount = Number(value);
  if (!Number.isInteger(clueCount)) {
    return false;
  }

  return storePreferenceValue(CLUE_COUNT_STORAGE_KEY, clueCount, storage);
}

export function readStoredSeed(storage?: StorageLike | null): string {
  return readPreferenceValue(SEED_STORAGE_KEY, storage) ?? '';
}

export function storeSeed(value: unknown, storage?: StorageLike | null): boolean {
  const seed = String(value ?? '').trim();

  if (seed === '') {
    return removePreferenceValue(SEED_STORAGE_KEY, storage);
  }

  return storePreferenceValue(SEED_STORAGE_KEY, seed, storage);
}

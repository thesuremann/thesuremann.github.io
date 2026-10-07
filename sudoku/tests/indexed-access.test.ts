import assert from 'node:assert/strict';
import test from 'node:test';

import { requireIndex } from '../src/lib/indexed-access.js';

test('requireIndex returns present values including falsy values', () => {
  assert.equal(requireIndex([0, false, ''], 0, 'values'), 0);
  assert.equal(requireIndex([0, false, ''], 1, 'values'), false);
  assert.equal(requireIndex([0, false, ''], 2, 'values'), '');
});

test('requireIndex rejects missing indices with an explicit range error', () => {
  assert.throws(
    () => requireIndex([1, 2, 3], 3, 'values'),
    (error: unknown) => error instanceof RangeError && error.message === 'values[3] is out of bounds.'
  );
});

import { savedWorkerOutcome } from '../src/v2/saved_worker_outcome.js';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

test('savedWorkerOutcome should return COMPLETED for UNCHANGED_SOURCE', () => {
  assert.strictEqual(savedWorkerOutcome('UNCHANGED_SOURCE'), 'COMPLETED');
});

test('savedWorkerOutcome should return SKIPPED for SKIPPED', () => {
  assert.strictEqual(savedWorkerOutcome('SKIPPED'), 'SKIPPED');
});

test('savedWorkerOutcome should return BLOCKED for BACKOFF', () => {
  assert.strictEqual(savedWorkerOutcome('BACKOFF'), 'BLOCKED');
  assert.strictEqual(savedWorkerOutcome('RETRY_PENDING'), 'BLOCKED');
  assert.strictEqual(savedWorkerOutcome(undefined), 'BLOCKED');
});
import test from 'node:test';
import assert from 'node:assert/strict';
import { canMutateDirectMessage, DIRECT_MESSAGE_WINDOW_MS } from '../src/messages/mutationWindow.js';
test('direct message mutation window closes exactly at the backend boundary', () => {
  const created = Date.parse('2026-11-13T10:00:00Z'), message = { createdAt:new Date(created).toISOString() };
  assert.equal(canMutateDirectMessage(message, created+DIRECT_MESSAGE_WINDOW_MS-1), true);
  assert.equal(canMutateDirectMessage(message, created+DIRECT_MESSAGE_WINDOW_MS), false);
  assert.equal(canMutateDirectMessage(message, created+DIRECT_MESSAGE_WINDOW_MS+1), false);
  assert.equal(canMutateDirectMessage({...message,deleted:true}, created+1), false);
  assert.equal(canMutateDirectMessage({createdAt:'invalid'}, created), false);
  assert.equal(canMutateDirectMessage(null, created), false);
});

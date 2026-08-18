const assert = require('node:assert/strict');
const test = require('node:test');
const { restoreAuthenticatedUser } = require('../services/authRestore');

test('restores the mobile user from /auth/me when a token exists', async () => {
  let cleared = false;
  const user = { id: 'u1', fullName: 'Courier' };
  const restored = await restoreAuthenticatedUser('token', async () => user, async () => { cleared = true; });
  assert.deepEqual(restored, { token: 'token', user });
  assert.equal(cleared, false);
});

test('clears an invalid token when /auth/me fails', async () => {
  let cleared = false;
  const restored = await restoreAuthenticatedUser('bad', async () => { throw new Error('unauthorized'); }, async () => { cleared = true; });
  assert.equal(restored, null);
  assert.equal(cleared, true);
});

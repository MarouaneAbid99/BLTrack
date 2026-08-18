const assert = require('node:assert/strict');
const test = require('node:test');
const { clientPaymentStatus, netAmount } = require('../utils/domain');

test('net is BL amount minus positive avoir amounts', () => {
  assert.equal(netAmount('1000.00', '150.00'), 850);
});

test('new BL state follows the client type', () => {
  assert.equal(clientPaymentStatus(false), 'UNPAID');
  assert.equal(clientPaymentStatus(true), 'EN_COMPTE');
});

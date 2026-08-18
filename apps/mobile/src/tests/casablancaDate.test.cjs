const assert = require('node:assert/strict');
const test = require('node:test');
const { casablancaCalendarDate } = require('../utils/theme');

test('returns the Casablanca calendar date on a normal day', () => {
  assert.equal(casablancaCalendarDate('2026-08-17T23:30:00.000Z'), '2026-08-18');
});

test('handles Casablanca month and year boundaries', () => {
  assert.equal(casablancaCalendarDate('2026-08-31T23:30:00.000Z'), '2026-09-01');
  assert.equal(casablancaCalendarDate('2026-12-31T23:30:00.000Z'), '2027-01-01');
});

test('uses IANA Ramadan transition rules instead of a fixed +01 offset', () => {
  assert.equal(casablancaCalendarDate('2026-02-14T23:30:00.000Z'), '2026-02-15');
  assert.equal(casablancaCalendarDate('2026-02-15T23:30:00.000Z'), '2026-02-15');
});

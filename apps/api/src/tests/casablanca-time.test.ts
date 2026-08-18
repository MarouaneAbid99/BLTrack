import assert from 'node:assert/strict';
import test from 'node:test';
import { casablancaCalendarRange, casablancaDayRange } from '../utils/casablanca-time';

test('Casablanca day boundaries are converted to UTC with an exclusive end', () => {
  const range = casablancaCalendarRange('2026-08-17', '2026-08-17');
  assert.equal(range.start.toISOString(), '2026-08-16T23:00:00.000Z');
  assert.equal(range.end.toISOString(), '2026-08-17T23:00:00.000Z');
});

test('Casablanca calendar ranges handle month and year boundaries', () => {
  assert.equal(casablancaDayRange('2026-08-31').end.toISOString(), '2026-08-31T23:00:00.000Z');
  assert.equal(casablancaDayRange('2026-12-31').end.toISOString(), '2026-12-31T23:00:00.000Z');
});

test('Casablanca Ramadan transitions use IANA offset changes', () => {
  const longDay = casablancaDayRange('2026-02-15');
  assert.equal(longDay.start.toISOString(), '2026-02-14T23:00:00.000Z');
  assert.equal(longDay.end.toISOString(), '2026-02-16T00:00:00.000Z');
  assert.equal(longDay.end.getTime() - longDay.start.getTime(), 25 * 60 * 60 * 1000);

  const shortDay = casablancaDayRange('2026-03-22');
  assert.equal(shortDay.start.toISOString(), '2026-03-22T00:00:00.000Z');
  assert.equal(shortDay.end.toISOString(), '2026-03-22T23:00:00.000Z');
  assert.equal(shortDay.end.getTime() - shortDay.start.getTime(), 23 * 60 * 60 * 1000);
});

test('invalid calendar dates are rejected', () => {
  assert.throws(() => casablancaDayRange('2026-02-30'), /valid calendar date/);
});

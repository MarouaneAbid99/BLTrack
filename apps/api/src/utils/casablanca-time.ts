export const CASABLANCA_TIME_ZONE = 'Africa/Casablanca';

type CalendarParts = { year: number; month: number; day: number };

const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: CASABLANCA_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

const parseDate = (value: unknown, field: string): CalendarParts => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new RangeError(`${field} must use YYYY-MM-DD`);
  }
  const [year, month, day] = value.split('-').map(Number);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    throw new RangeError(`${field} must be a valid calendar date`);
  }
  return { year, month, day };
};

const addCalendarDays = (parts: CalendarParts, days: number): CalendarParts => {
  const value = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  value.setUTCDate(value.getUTCDate() + days);
  return { year: value.getUTCFullYear(), month: value.getUTCMonth() + 1, day: value.getUTCDate() };
};

const partsInCasablanca = (instant: Date) => {
  const entries = formatter.formatToParts(instant)
    .filter((part) => part.type !== 'literal')
    .map((part) => [part.type, Number(part.value)] as const);
  return Object.fromEntries(entries) as Record<'year' | 'month' | 'day' | 'hour' | 'minute' | 'second', number>;
};

const casablancaMidnightToUtc = (parts: CalendarParts): Date => {
  const targetAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0);
  let candidate = targetAsUtc;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const local = partsInCasablanca(new Date(candidate));
    const representedAsUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second);
    const adjustment = targetAsUtc - representedAsUtc;
    candidate += adjustment;
    if (adjustment === 0) break;
  }
  const result = new Date(candidate);
  const local = partsInCasablanca(result);
  if (local.year !== parts.year || local.month !== parts.month || local.day !== parts.day || local.hour !== 0 || local.minute !== 0) {
    throw new RangeError('Unable to resolve Africa/Casablanca calendar boundary');
  }
  return result;
};

export const casablancaDateBoundary = (value: unknown, field = 'date') =>
  casablancaMidnightToUtc(parseDate(value, field));

export const nextCasablancaDateBoundary = (value: unknown, field = 'date') =>
  casablancaMidnightToUtc(addCalendarDays(parseDate(value, field), 1));

export const casablancaCalendarRange = (dateFrom: unknown, dateTo: unknown) => {
  const from = parseDate(dateFrom, 'dateFrom');
  const to = parseDate(dateTo, 'dateTo');
  if ((dateFrom as string) > (dateTo as string)) throw new RangeError('dateFrom must not be after dateTo');
  return {
    start: casablancaMidnightToUtc(from),
    end: casablancaMidnightToUtc(addCalendarDays(to, 1)),
    dateFrom: dateFrom as string,
    dateTo: dateTo as string,
  };
};

export const casablancaDayRange = (date: unknown) => {
  try {
    const range = casablancaCalendarRange(date, date);
    return { start: range.start, end: range.end, date: range.dateFrom };
  } catch (error) {
    if (error instanceof RangeError) throw new RangeError(error.message.replaceAll('dateFrom', 'date').replaceAll('dateTo', 'date'));
    throw error;
  }
};

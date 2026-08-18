export const colors = {
  navy: '#102A43', blue: '#147D92', blueDark: '#0B6577', sky: '#E8F4F7',
  background: '#F4F7FA', card: '#FFFFFF', text: '#102A43', muted: '#627D98',
  border: '#D9E2EC', green: '#147D64', greenSoft: '#DDF4EA', amber: '#A15C00',
  amberSoft: '#FFF1D6', red: '#B42318', redSoft: '#FEE4E2', account: '#6B4EFF',
};

export const formatDH = (value: string | number) => `${Number(value || 0).toFixed(2)} DH`;
export const CASABLANCA_TIME_ZONE = 'Africa/Casablanca';
const casablancaDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: CASABLANCA_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
});

export const casablancaCalendarDate = (value: Date | string | number = new Date()) => {
  const parts = Object.fromEntries(casablancaDateFormatter.formatToParts(new Date(value))
    .filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
};

export const formatDate = (value?: string | null) => value
  ? new Date(value).toLocaleDateString('fr-MA', { timeZone: CASABLANCA_TIME_ZONE })
  : '—';
export const today = () => casablancaCalendarDate();
// Date-only business fields continue to use their established midnight-UTC storage representation.
export const apiDate = (value: string) => `${value}T00:00:00.000Z`;

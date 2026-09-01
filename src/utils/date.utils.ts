export const HOUR_MS = 60 * 60 * 1000;

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * HOUR_MS);
}

export function nextMondayMidnight(from: Date = new Date()): Date {
  const result = new Date(from);
  result.setUTCHours(0, 0, 0, 0);
  const daysUntilMonday = (8 - result.getUTCDay()) % 7 || 7;
  result.setUTCDate(result.getUTCDate() + daysUntilMonday);
  return result;
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString('ru-RU', {
    timeZone: 'Europe/Moscow',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function daysAgo(days: number, from: Date = new Date()): Date {
  return new Date(from.getTime() - days * 24 * HOUR_MS);
}

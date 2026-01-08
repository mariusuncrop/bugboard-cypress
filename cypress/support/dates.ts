/**
 * Dates are always relative to today, never hard-coded.
 *
 * The app seeds deadlines relative to the current day so its overdue and
 * due-soon colours always have something to show; a spec with a fixed date in
 * it would start failing on a particular morning.
 */
export function daysFromToday(days: number): string {
  const midnight = Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
  return new Date(midnight + days * 86_400_000).toISOString().slice(0, 10);
}

export const today = () => daysFromToday(0);
export const tomorrow = () => daysFromToday(1);
export const yesterday = () => daysFromToday(-1);

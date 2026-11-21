import type { PilotClock } from '../types/pilot';

let clock: { offset: number; timezone: string } | null = null;

export function configurePilotClock(value: PilotClock | null, receivedAt = Date.now()): void {
  clock = value
    ? { offset: Date.parse(value.nowISO) - receivedAt, timezone: value.timezone }
    : null;
}

export function currentPilotClock(at = Date.now()): PilotClock | null {
  if (!clock) return null;
  const date = new Date(at + clock.offset);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: clock.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)!.value;
  return {
    nowISO: date.toISOString(),
    today: `${part('year')}-${part('month')}-${part('day')}`,
    timezone: clock.timezone,
  };
}

export function isPilotRuntime(): boolean {
  return clock !== null;
}

export function demoHref(path = '/app'): string {
  return import.meta.env?.DEV ? path : `/demo${path}`;
}

export function equipmentScanUrl(id: string): string {
  const prefix =
    window.location.pathname === '/demo' || window.location.pathname.startsWith('/demo/')
      ? '/demo'
      : '';
  return `${window.location.origin}${prefix}/a/${encodeURIComponent(id)}`;
}

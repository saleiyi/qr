import { APP_CONFIG } from '../config/appConfig';

/**
 * Extracts YYYY-MM-DD from an ISO date or timestamp string.
 */
export function toISODateOnly(isoString: string): string {
  return isoString.slice(0, 10);
}

/**
 * Formats an ISO date or datetime string as DD/MM/AAAA (Brazilian pt-BR standard).
 */
export function formatDateBR(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  const datePart = toISODateOnly(isoString);
  const parts = datePart.split('-');
  if (parts.length !== 3) return '—';
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

/**
 * Formats an ISO timestamp string as DD/MM/AAAA às HH:mm.
 */
export function formatDateTimeBR(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return formatDateBR(isoString);

  // If timestamp has explicit time component, format date and time cleanly
  const dateStr = formatDateBR(isoString);
  const timeMatch = isoString.match(/T(\d{2}):(\d{2})/);
  if (timeMatch) {
    return `${dateStr} ${timeMatch[1]}:${timeMatch[2]}`;
  }
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${dateStr} ${hours}:${mins}`;
}

/**
 * Computes signed whole-day difference: targetDate - referenceDate.
 * Positive => days in future; Negative => days overdue; 0 => today.
 */
export function diffDays(
  targetISODate: string,
  referenceISODate: string = APP_CONFIG.demoClockDate,
): number {
  const tPart = toISODateOnly(targetISODate);
  const rPart = toISODateOnly(referenceISODate);
  const [ty, tm, td] = tPart.split('-').map(Number);
  const [ry, rm, rd] = rPart.split('-').map(Number);
  const tUtc = Date.UTC(ty, tm - 1, td);
  const rUtc = Date.UTC(ry, rm - 1, rd);
  return Math.round((tUtc - rUtc) / (1000 * 60 * 60 * 24));
}

/**
 * Adds N calendar days to an ISO date string and returns YYYY-MM-DD.
 */
export function addDaysISODate(baseISO: string, days: number): string {
  const datePart = toISODateOnly(baseISO);
  const [y, m, d] = datePart.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  const yy = utc.getUTCFullYear();
  const mm = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(utc.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/**
 * Formats relative due/overdue label in natural pt-BR.
 */
export function formatRelativeDueBR(
  dueISO: string | null | undefined,
  referenceDate: string = APP_CONFIG.demoClockDate,
): string {
  if (!dueISO) return 'Sem agendamento';
  const delta = diffDays(dueISO, referenceDate);
  if (delta < -1) return `Atrasada há ${Math.abs(delta)} dias`;
  if (delta === -1) return 'Atrasada há 1 dia';
  if (delta === 0) return 'Vence hoje';
  if (delta === 1) return 'Vence amanhã';
  return `Vence em ${delta} dias`;
}

/**
 * Formats currency in Brazilian Real (R$).
 */
export function formatBRL(value: number): string {
  return `R$ ${value.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

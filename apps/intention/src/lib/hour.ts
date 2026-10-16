import config from '../../config/intention-hour.json';

/**
 * Intention Hour: everyone runs at the same time once a day, for a few minutes. The time is a wall-clock
 * time in one time zone (9:00 pm Pacific), so it follows daylight saving there. Shared by the client and
 * the server.
 */

export interface HourConfig {
  timeZone: string;
  hour: number;
  minute: number;
  minutes: number;
  label: string;
}

export const HOUR: HourConfig = config;

/** Show a countdown on the home screen when the next Intention Hour is this close (ms). */
export const COUNTDOWN_FROM_MS = 3 * 60 * 60 * 1000;

interface Parts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function zoneParts(ms: number, timeZone: string): Parts {
  let format = formatters.get(timeZone);
  if (!format) {
    format = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    formatters.set(timeZone, format);
  }
  const out: Record<string, number> = {};
  for (const part of format.formatToParts(new Date(ms))) {
    if (part.type !== 'literal') out[part.type] = Number(part.value);
  }
  return out as unknown as Parts;
}

/** How far the zone's wall clock is ahead of UTC at this moment (ms). */
function zoneOffset(ms: number, timeZone: string): number {
  const p = zoneParts(ms, timeZone);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
}

/** The moment a wall-clock time happens in a zone. */
export function zonedTime(year: number, month: number, day: number, hour: number, minute: number, timeZone: string): number {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  let ms = guess - zoneOffset(guess, timeZone);
  // A second pass settles the hours around a daylight saving change.
  ms = guess - zoneOffset(ms, timeZone);
  return ms;
}

export interface HourEvent {
  /** The event's date in its own zone, like "2026-10-15". Runs in it are tagged with this. */
  key: string;
  startsAt: number;
  endsAt: number;
}

function eventOn(year: number, month: number, day: number, hour: HourConfig): HourEvent {
  const startsAt = zonedTime(year, month, day, hour.hour, hour.minute, hour.timeZone);
  const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { key, startsAt, endsAt: startsAt + hour.minutes * 60_000 };
}

/** The event that is live now, or else the next one to come. */
export function currentOrNextEvent(now: number, hour: HourConfig = HOUR): HourEvent {
  const today = zoneParts(now, hour.timeZone);
  const event = eventOn(today.year, today.month, today.day, hour);
  if (now < event.endsAt) return event;
  // Tomorrow in the zone: noon UTC of the next calendar day lands on the right date everywhere.
  const next = zoneParts(Date.UTC(today.year, today.month - 1, today.day + 1, 12), hour.timeZone);
  return eventOn(next.year, next.month, next.day, hour);
}

/** The key of the event live at this moment, or null. Runs started inside the window carry it. */
export function liveEventKey(now: number, hour: HourConfig = HOUR): string | null {
  const event = currentOrNextEvent(now, hour);
  return now >= event.startsAt && now < event.endsAt ? event.key : null;
}

export type HourStatus =
  | { kind: 'live'; event: HourEvent; leftMs: number }
  | { kind: 'soon'; event: HourEvent; inMs: number }
  | { kind: 'later'; event: HourEvent };

export function hourStatus(now: number, hour: HourConfig = HOUR): HourStatus {
  const event = currentOrNextEvent(now, hour);
  if (now >= event.startsAt) return { kind: 'live', event, leftMs: event.endsAt - now };
  const inMs = event.startsAt - now;
  return inMs <= COUNTDOWN_FROM_MS ? { kind: 'soon', event, inMs } : { kind: 'later', event };
}

/** "2 h 14 min", "9 min 30 s", "45 s". */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h} h ${m} min`;
  if (m >= 10) return `${m} min`;
  if (m > 0) return `${m} min ${s} s`;
  return `${s} s`;
}

/** The home screen's one line about Intention Hour, or null when it is hours away. */
export function hourLine(status: HourStatus): string | null {
  if (status.kind === 'live') return `Intention Hour is live. ${formatCountdown(status.leftMs)} left.`;
  if (status.kind === 'soon') return `Intention Hour starts in ${formatCountdown(status.inMs)}.`;
  return null;
}

/** A moment as a wall-clock time in a zone, like "6:00 pm". */
function clockTime(ms: number, timeZone?: string): string {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone })
    .format(new Date(ms))
    .replace(/\s?(AM|PM)$/, (m) => ` ${m.trim().toLowerCase()}`);
}

/**
 * When the event is, for this viewer: "9:00 pm Pacific", plus their own time when it differs,
 * like "9:00 pm Pacific (6:00 am your time)".
 */
export function hourWhen(event: HourEvent, viewerZone?: string, hour: HourConfig = HOUR): string {
  const zone = viewerZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const theirs = clockTime(event.startsAt, zone);
  const ours = clockTime(event.startsAt, hour.timeZone);
  return theirs === ours ? hour.label : `${hour.label} (${theirs} your time)`;
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * A small calendar file for the daily event. It repeats every day at the configured wall-clock time in its
 * zone. America/Los_Angeles carries its daylight saving rules, so every calendar app reads it the same way.
 */
export function calendarFile(event: HourEvent, url: string, hour: HourConfig = HOUR, stampMs = Date.now()): string {
  const [y, mo, d] = event.key.split('-');
  const stamp = new Date(stampMs);
  const utc = `${stamp.getUTCFullYear()}${pad(stamp.getUTCMonth() + 1)}${pad(stamp.getUTCDate())}T${pad(stamp.getUTCHours())}${pad(stamp.getUTCMinutes())}${pad(stamp.getUTCSeconds())}Z`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PolymadLabs//Intention//EN',
    'CALSCALE:GREGORIAN',
    ...(hour.timeZone === 'America/Los_Angeles' ? LOS_ANGELES : []),
    'BEGIN:VEVENT',
    `UID:intention-hour-${hour.timeZone.replace(/\W/g, '-')}@polymadlabs.com`,
    `DTSTAMP:${utc}`,
    `DTSTART;TZID=${hour.timeZone}:${y}${mo}${d}T${pad(hour.hour)}${pad(hour.minute)}00`,
    `DURATION:PT${hour.minutes}M`,
    'RRULE:FREQ=DAILY',
    'SUMMARY:Intention Hour',
    `DESCRIPTION:Everyone runs at the same time for ${hour.minutes} minutes. ${url}`,
    `URL:${url}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `${lines.map(fold).join('\r\n')}\r\n`;
}

/** iCalendar lines longer than 75 octets continue on the next line after a space (RFC 5545, 3.1). */
function fold(line: string): string {
  const parts: string[] = [];
  let rest = line;
  let limit = 75;
  while (new TextEncoder().encode(rest).length > limit) {
    let cut = limit;
    while (new TextEncoder().encode(rest.slice(0, cut)).length > limit) cut--;
    parts.push(rest.slice(0, cut));
    rest = rest.slice(cut);
    limit = 74;
  }
  parts.push(rest);
  return parts.join('\r\n ');
}

const LOS_ANGELES = [
  'BEGIN:VTIMEZONE',
  'TZID:America/Los_Angeles',
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:-0800',
  'TZOFFSETTO:-0700',
  'TZNAME:PDT',
  'DTSTART:20070311T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:-0700',
  'TZOFFSETTO:-0800',
  'TZNAME:PST',
  'DTSTART:20071104T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
];

/**
 * CalDAV Calendar Server (RFC 4791 / RFC 5545 / RFC 4918 WebDAV)
 * 
 * Provides iCalendar parsing/generation and WebDAV Multi-Status XML responders
 * for Apple Calendar, Thunderbird, and DAVx5 synchronization.
 */

export interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  attendees: string[];
  organizer?: string;
  created: Date;
  lastModified: Date;
}

const eventsStore = new Map<string, CalendarEvent>();

export function createEvent(
  userId: string,
  title: string,
  startTime: Date,
  endTime: Date,
  attendees: string[] = []
): CalendarEvent {
  const id = generateId();
  const now = new Date();
  
  const event: CalendarEvent = {
    id,
    userId,
    title,
    startTime,
    endTime,
    attendees,
    created: now,
    lastModified: now
  };
  
  eventsStore.set(id, event);
  return event;
}

export function listEvents(
  userId: string, 
  rangeStart?: Date, 
  rangeEnd?: Date
): CalendarEvent[] {
  const userEvents: CalendarEvent[] = [];
  
  for (const event of eventsStore.values()) {
    if (event.userId === userId) {
      if (rangeStart && event.endTime < rangeStart) continue;
      if (rangeEnd && event.startTime > rangeEnd) continue;
      userEvents.push(event);
    }
  }
  
  return userEvents;
}

export function parseICS(icsString: string): Partial<CalendarEvent>[] {
  const events: Partial<CalendarEvent>[] = [];
  const lines = icsString.split(/\r?\n/);
  
  let currentEvent: Partial<CalendarEvent> | null = null;
  let inEvent = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      currentEvent = { attendees: [] };
      continue;
    }
    if (line === 'END:VEVENT') {
      if (currentEvent) events.push(currentEvent);
      inEvent = false;
      currentEvent = null;
      continue;
    }
    if (inEvent && currentEvent) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      const key = line.substring(0, colonIdx).split(';')[0];
      const value = line.substring(colonIdx + 1);
      
      switch (key) {
        case 'UID': currentEvent.id = value; break;
        case 'SUMMARY': currentEvent.title = value; break;
        case 'DESCRIPTION': currentEvent.description = value.replace(/\\n/g, '\n'); break;
        case 'LOCATION': currentEvent.location = value; break;
        case 'DTSTART': currentEvent.startTime = parseICSDate(value); break;
        case 'DTEND': currentEvent.endTime = parseICSDate(value); break;
      }
    }
  }
  return events;
}

export function generateICS(event: CalendarEvent): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mailops//CalDAV Server//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${event.id}`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `CREATED:${formatICSDate(event.created)}`,
    `LAST-MODIFIED:${formatICSDate(event.lastModified)}`,
    `DTSTART:${formatICSDate(event.startTime)}`,
    `DTEND:${formatICSDate(event.endTime)}`,
    `SUMMARY:${escapeICSString(event.title)}`
  ];
  if (event.description) lines.push(`DESCRIPTION:${escapeICSString(event.description)}`);
  if (event.location) lines.push(`LOCATION:${escapeICSString(event.location)}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

/**
 * Handles WebDAV PROPFIND requests for CalDAV discovery
 */
export function handleCalDAVPropfind(path: string, userId: string): { status: number; xml: string } {
  const xml = `<?xml version="1.0" encoding="utf-8" ?>
<D:multistatus xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:response>
    <D:href>${path}</D:href>
    <D:propstat>
      <D:prop>
        <D:current-user-principal><D:href>/caldav/${userId}/</D:href></D:current-user-principal>
        <C:calendar-home-set><D:href>/caldav/${userId}/calendars/</D:href></C:calendar-home-set>
        <D:resourcetype><D:collection/></D:resourcetype>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
</D:multistatus>`;
  return { status: 207, xml };
}

/**
 * Handles CalDAV REPORT calendar-query requests
 */
export function handleCalDAVReport(userId: string, events: CalendarEvent[]): { status: number; xml: string } {
  const responses = events.map(e => `
  <D:response>
    <D:href>/caldav/${userId}/calendars/${e.id}.ics</D:href>
    <D:propstat>
      <D:prop>
        <D:getetag>"${e.lastModified.getTime()}"</D:getetag>
        <C:calendar-data xmlns:C="urn:ietf:params:xml:ns:caldav"><![CDATA[${generateICS(e)}]]></C:calendar-data>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>`).join('');

  const xml = `<?xml version="1.0" encoding="utf-8" ?>
<D:multistatus xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  ${responses}
</D:multistatus>`;
  return { status: 207, xml };
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + '-' + Date.now().toString(36);
}

function parseICSDate(dateStr: string): Date {
  if (dateStr.length === 16 && dateStr.endsWith('Z')) {
    const y = parseInt(dateStr.substring(0, 4));
    const m = parseInt(dateStr.substring(4, 6)) - 1;
    const d = parseInt(dateStr.substring(6, 8));
    const h = parseInt(dateStr.substring(9, 11));
    const min = parseInt(dateStr.substring(11, 13));
    const s = parseInt(dateStr.substring(13, 15));
    return new Date(Date.UTC(y, m, d, h, min, s));
  }
  return new Date(dateStr);
}

function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').substring(0, 15) + 'Z';
}

function escapeICSString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

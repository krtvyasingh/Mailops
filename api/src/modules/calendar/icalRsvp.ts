/**
 * iCalendar (RFC 5545) & iTIP (RFC 5546) Meeting Parser and 1-Click RSVP Engine
 */

export interface CalendarEvent {
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  dtStart?: string;
  dtEnd?: string;
  organizer?: { name?: string; email: string };
  attendees: Array<{ name?: string; email: string; partStat?: string; role?: string }>;
  method?: string; // REQUEST, REPLY, CANCEL
  sequence?: number;
  status?: string;
}

export type RsvpStatus = 'ACCEPTED' | 'DECLINED' | 'TENTATIVE';

/**
 * Parses RFC 5545 iCalendar format into structured CalendarEvent
 */
export function parseICalendar(icsContent: string): CalendarEvent | null {
  if (!icsContent || !icsContent.includes('BEGIN:VCALENDAR')) {
    return null;
  }

  // Unfold multi-line iCalendar headers (RFC 5545 Section 3.1)
  const unfolded = icsContent.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
  const lines = unfolded.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  let inEvent = false;
  let method = 'REQUEST';
  const event: CalendarEvent = {
    uid: '',
    summary: 'Untitled Meeting',
    attendees: []
  };

  for (const line of lines) {
    if (line.startsWith('METHOD:')) {
      method = line.substring(7).trim().toUpperCase();
    } else if (line === 'BEGIN:VEVENT') {
      inEvent = true;
    } else if (line === 'END:VEVENT') {
      inEvent = false;
    } else if (inEvent) {
      if (line.startsWith('UID:')) {
        event.uid = line.substring(4).trim();
      } else if (line.startsWith('SUMMARY:')) {
        event.summary = line.substring(8).trim();
      } else if (line.startsWith('DESCRIPTION:')) {
        event.description = line.substring(12).trim().replace(/\\n/g, '\n').replace(/\\,/g, ',');
      } else if (line.startsWith('LOCATION:')) {
        event.location = line.substring(9).trim();
      } else if (line.startsWith('DTSTART')) {
        const val = line.substring(line.indexOf(':') + 1).trim();
        event.dtStart = val;
      } else if (line.startsWith('DTEND')) {
        const val = line.substring(line.indexOf(':') + 1).trim();
        event.dtEnd = val;
      } else if (line.startsWith('ORGANIZER')) {
        const emailMatch = line.match(/mailto:([^\s;]+)/i);
        const nameMatch = line.match(/CN=([^;:]+)/i);
        if (emailMatch) {
          event.organizer = {
            email: emailMatch[1].trim(),
            name: nameMatch ? nameMatch[1].replace(/^"|"$/g, '').trim() : undefined
          };
        }
      } else if (line.startsWith('ATTENDEE')) {
        const emailMatch = line.match(/mailto:([^\s;]+)/i);
        const nameMatch = line.match(/CN=([^;:]+)/i);
        const partStatMatch = line.match(/PARTSTAT=([^;:]+)/i);
        if (emailMatch) {
          event.attendees.push({
            email: emailMatch[1].trim(),
            name: nameMatch ? nameMatch[1].replace(/^"|"$/g, '').trim() : undefined,
            partStat: partStatMatch ? partStatMatch[1].toUpperCase() : 'NEEDS-ACTION'
          });
        }
      } else if (line.startsWith('STATUS:')) {
        event.status = line.substring(7).trim();
      } else if (line.startsWith('SEQUENCE:')) {
        event.sequence = parseInt(line.substring(9).trim(), 10) || 0;
      }
    }
  }

  event.method = method;
  return event.uid ? event : null;
}

/**
 * Generates an RFC 5546 iTIP METHOD:REPLY iCalendar response (.ics)
 */
export function generateIcsRsvpReply(options: {
  event: CalendarEvent;
  attendeeEmail: string;
  attendeeName?: string;
  status: RsvpStatus;
  comment?: string;
}): string {
  const { event, attendeeEmail, attendeeName, status, comment } = options;
  const nowUtc = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const displayName = attendeeName || attendeeEmail;

  return [
    'BEGIN:VCALENDAR',
    'PRODID:-//Mailops Cloud//Mailops Calendar 2.0//EN',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'METHOD:REPLY',
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${nowUtc}`,
    event.dtStart ? `DTSTART:${event.dtStart}` : '',
    event.dtEnd ? `DTEND:${event.dtEnd}` : '',
    `SUMMARY:${event.summary}`,
    event.organizer ? `ORGANIZER;CN=${event.organizer.name || event.organizer.email}:mailto:${event.organizer.email}` : '',
    `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=${status};CN=${displayName}:mailto:${attendeeEmail}`,
    comment ? `COMMENT:${comment.replace(/\n/g, '\\n')}` : '',
    `SEQUENCE:${event.sequence ?? 0}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean).join('\r\n');
}

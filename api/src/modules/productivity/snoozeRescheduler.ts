/**
 * Module: Snooze Rescheduler & Calendar Conflict Sync
 * 
 * Dynamically reschedules snoozed emails if a scheduled restoration time
 * conflicts with high-priority calendar events or active do-not-disturb hours.
 */

export interface SnoozeTarget {
  emailId: string;
  targetTimestamp: number;
  allowReschedule: boolean;
}

export function resolveOptimalSnoozeTime(
  snooze: SnoozeTarget,
  busySlots: { start: number; end: number }[],
  quietHours: { startHour: number; endHour: number }
): number {
  if (!snooze.allowReschedule) return snooze.targetTimestamp;

  let current = new Date(snooze.targetTimestamp);

  // Check quiet hours (e.g. 22:00 to 08:00)
  const hour = current.getHours();
  if (hour >= quietHours.startHour || hour < quietHours.endHour) {
    current.setHours(quietHours.endHour, 0, 0, 0);
    if (hour >= quietHours.startHour) {
      current.setDate(current.getDate() + 1);
    }
  }

  // Check calendar collision
  let timestamp = current.getTime();
  for (const slot of busySlots) {
    if (timestamp >= slot.start && timestamp <= slot.end) {
      timestamp = slot.end + 5 * 60 * 1000; // 5 mins after event
    }
  }

  return timestamp;
}

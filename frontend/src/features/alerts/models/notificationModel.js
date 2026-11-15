import { reminderItems } from '../../checkins/models/reminders.js';
import { routineReminderId } from '../../routine/services/routineService.js';

/** What the shared screen may announce: check-in reminders and closed emergencies.
 *  Synthetic environment context stays on the Environment screen, not in the alert count. */
export const RESOLVED_WINDOW = 24 * 3600000,
  RESOLVED_FRESH = 3600000;
export function notificationModel(data, now, _signals, envSignals = [], routineItems = []) {
  const reminders = reminderItems(data, now);
  const due = reminders.filter((r) => r.due && !r.snoozed),
    snoozed = reminders.filter((r) => r.snoozed);
  const upcoming = reminders.filter((r) => !r.due && !r.snoozed)[0];
  const routineReminders = routineItems
    .filter((item) => item.item !== 'Daily check-in')
    .map((item) => {
      const id = routineReminderId(item.crewId, item.id);
      const snoozedUntil = data.reminderSnoozes?.[id] || 0;
      return {
        ...item,
        id,
        snoozedUntil,
        due: !item.done && item.overdue && now >= snoozedUntil,
        snoozed: !item.done && now < snoozedUntil,
      };
    });
  const routineDue = routineReminders.filter((item) => item.due);
  const routineSnoozed = routineReminders.filter((item) => item.snoozed);
  const routineUpcoming = routineReminders
    .filter((item) => !item.overdue && !item.done)
    .sort((left, right) => new Date(left.due_at) - new Date(right.due_at))[0];
  const resolved = data.crewAlerts
    .filter((a) => a.status === 'closed' && a.closedAt && now - a.closedAt < RESOLVED_WINDOW)
    .sort((a, b) => b.closedAt - a.closedAt)
    .map((a) => ({
      id: a.id,
      closedAt: a.closedAt,
      reason: a.closeReason || 'Resolved',
      fresh: now - a.closedAt < RESOLVED_FRESH,
    }));
  const env = envSignals.map((s) => ({ id: s.id, title: s.title }));
  return {
    due,
    snoozed,
    upcoming,
    routineDue,
    routineSnoozed,
    routineUpcoming,
    env,
    resolved,
    count: due.length + routineDue.length + env.length + resolved.filter((r) => r.fresh).length,
  };
}

import {reminderItems} from './reminders.js';

/** What the shared screen may announce: check-in reminders, environment events and closed emergencies.
 *  No health values, rule flags, symptoms or report contents ever appear here. */
export const RESOLVED_WINDOW=24*3600000, RESOLVED_FRESH=3600000;
export function notificationModel(data,now,_signals,envSignals=[]){
 const reminders=reminderItems(data,now);
 const due=reminders.filter(r=>r.due&&!r.snoozed),snoozed=reminders.filter(r=>r.snoozed);
 const upcoming=reminders.filter(r=>!r.due&&!r.snoozed)[0];
 const resolved=data.crewAlerts.filter(a=>a.status==='closed'&&a.closedAt&&now-a.closedAt<RESOLVED_WINDOW).sort((a,b)=>b.closedAt-a.closedAt).map(a=>({id:a.id,closedAt:a.closedAt,reason:a.closeReason||'Resolved',fresh:now-a.closedAt<RESOLVED_FRESH}));
 const env=envSignals.map(s=>({id:s.id,title:s.title}));
 return {due,snoozed,upcoming,env,resolved,count:due.length+env.length+resolved.filter(r=>r.fresh).length};
}


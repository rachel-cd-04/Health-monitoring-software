import {crew,checkIn,missionDay,slotTime} from './crewModel.js';
export function reminderItems(data,now=Date.now()){
 const day=missionDay(now);
 return crew.flatMap(person=>['daily'].filter(slot=>!checkIn(data,person.id,slot,day)).map(slot=>{
   const id=`${day}-${person.id}-${slot}`,dueAt=slotTime(day,slot,data.schedule),snoozedUntil=data.reminderSnoozes?.[id]||0;
   return {id,person,slot,dueAt,snoozedUntil,due:now>=dueAt,snoozed:now<snoozedUntil};
 })).sort((a,b)=>a.dueAt-b.dueAt);
}

import React,{useEffect,useRef} from 'react';
import {Bell,CalendarCheck,Radiation,ShieldCheck,X,Clock,CheckCheck} from 'lucide-react';
import {crew,timeLabel} from '../models/crewModel.js';

export {notificationModel} from '../models/notificationModel.js';

export function NotificationButton({count,open,onToggle}){
 return <button className={'bell-button'+(open?' open':'')} aria-label={`Notifications${count?`, ${count} need attention`:''}`} aria-expanded={open} onClick={onToggle}><Bell size={20}/>{count>0&&<b>{count}</b>}</button>;
}

export function NotificationCenter({model,data,onClose,onStart,onSnooze,onRestore,onEnvironment}){
 const ref=useRef();
 useEffect(()=>{const key=e=>{if(e.key==='Escape')onClose()};const click=e=>{if(ref.current&&!ref.current.contains(e.target)&&!e.target.closest('.bell-button'))onClose()};document.addEventListener('keydown',key);document.addEventListener('mousedown',click);ref.current?.focus();return()=>{document.removeEventListener('keydown',key);document.removeEventListener('mousedown',click)}},[]);
 const empty=!model.due.length&&!model.snoozed.length&&!model.env.length&&!model.resolved.length;
 return <section className="notif-center" role="dialog" aria-label="Notifications" tabIndex={-1} ref={ref}>
  <header><h2>Notifications</h2><button className="icon-only" aria-label="Close notifications" onClick={onClose}><X size={18}/></button></header>
  <div className="notif-scroll">
   {model.due.length>0&&<div className="notif-group"><h3>Check-ins due</h3>{model.due.map(r=>{const Icon=CalendarCheck;return <article key={r.id} className="notif-item due"><span className="notif-icon"><Icon size={18}/></span><div><b>{r.person.name}</b><span>Daily check-in · due since {data.schedule.daily} UTC</span><div className="notif-actions"><button className="button primary small" onClick={()=>onStart({crewId:r.person.id,slot:r.slot})}>Start</button><button className="text-link" onClick={()=>onSnooze(r.id)}>Remind me in 15 min</button></div></div></article>})}</div>}
   {model.env.length>0&&<div className="notif-group"><h3>Environment</h3>{model.env.map(s=><button key={s.id} className="notif-item link" onClick={onEnvironment}><span className="notif-icon env"><Radiation size={18}/></span><div><b>{s.title}</b><span>Simulated environment data</span></div></button>)}</div>}
   {model.resolved.length>0&&<div className="notif-group"><h3>Emergencies closed</h3>{model.resolved.map(r=><article key={r.id} className={'notif-item quiet'+(r.fresh?' fresh':'')}><span className="notif-icon ok"><ShieldCheck size={18}/></span><div><b>Emergency closed at {timeLabel(r.closedAt)} UTC</b><span>{r.reason}</span></div></article>)}</div>}
   {model.snoozed.length>0&&<div className="notif-group"><h3>Snoozed</h3>{model.snoozed.map(r=><article key={r.id} className="notif-item quiet"><span className="notif-icon"><Clock size={18}/></span><div><b>{r.person.name} · daily check-in</b><span>Back at {timeLabel(r.snoozedUntil)} UTC</span></div><button className="text-link" onClick={()=>onRestore(r.id)}>Undo</button></article>)}</div>}
   {empty&&<div className="notif-empty"><CheckCheck size={26}/><b>You’re up to date.</b><span>{model.upcoming?`Next check-in at ${data.schedule.daily} UTC.`:'All of today’s check-ins are done.'}</span></div>}
  </div>
  <footer>The shared screen never shows health values or reports here. Completing a check-in clears its reminder.</footer>
 </section>;
}

import React,{useEffect,useRef,useState} from 'react';
import {BellRing,Check,Minimize2,Radio,Shield,Users,HeartPulse,Clock,ChevronRight,RotateCcw,MessageSquare,UserRound} from 'lucide-react';
import {crew,stamp,latest,valueLabel,metrics,timeLabel} from '../models/crewModel.js';
import {uuid} from '../models/ids.js';
import {scenarios,node,FIRST_STEP,summaryText} from '../models/emergencyFlow.js';
import CrewAssistant from './CrewAssistant.jsx';

export function CrewAlertBanner({data,operator,onOpen,onAcknowledge,onResolve}){
 const active=data.crewAlerts.filter(a=>a.status==='active');if(!active.length)return null;
 return <section className="em-banner-stack" aria-live="assertive">{active.map(a=><div className="em-banner" key={a.id}><span className="em-banner-icon"><BellRing size={20}/></span><p><b>Emergency · {crew.find(c=>c.id===a.patient)?.name||'person not identified'}</b><span>{a.situation} · since {timeLabel(a.createdAt)} UTC · {a.acknowledgedBy.filter(id=>id!==a.patient).length}/{crew.filter(c=>c.id!==a.patient).length} crew on it</span></p>{!a.acknowledgedBy.includes(operator.id)&&operator.id!==a.patient&&<button className="em-banner-ghost" onClick={()=>onAcknowledge(a.id)}>I’m on it</button>}<button className="em-banner-ghost" onClick={()=>onResolve(a.id)}>Resolve</button><button className="em-banner-open" onClick={()=>onOpen(a.id)}>Open emergency</button></div>)}</section>;
}

const fmt=ms=>{const s=Math.max(0,Math.floor(ms/1000));return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`};

function Vitals({onSave,onSkip}){
 const [v,setV]=useState({hr:'',sys:'',dia:'',temp:'',glu:''}),[err,setErr]=useState('');
 const set=(k,decimal)=>e=>setV(x=>({...x,[k]:decimal?e.target.value.replace(/[^\d.,]/g,'').replace(',','.').slice(0,4):e.target.value.replace(/[^\d]/g,'').slice(0,3)}));
 const save=()=>{const out=[];const n=k=>Number(v[k]);
  if(v.hr){if(n('hr')<30||n('hr')>220)return setErr('Heart rate must be between 30 and 220 bpm.');out.push({label:'Heart rate',value:n('hr'),unit:'bpm'})}
  if(v.sys||v.dia){if(!v.sys||!v.dia||n('dia')>=n('sys')||n('sys')<60||n('sys')>260||n('dia')<30||n('dia')>160)return setErr('Enter both pressure values (systolic 60–260, diastolic 30–160), systolic above diastolic.');out.push({label:'Blood pressure',value:`${n('sys')}/${n('dia')}`,unit:'mmHg'})}
  if(v.temp){if(!Number.isFinite(n('temp'))||n('temp')<30||n('temp')>43)return setErr('Temperature must be between 30 and 43 °C.');out.push({label:'Temperature',value:n('temp'),unit:'°C'})}
  if(v.glu){if(n('glu')<20||n('glu')>600)return setErr('Blood sugar must be between 20 and 600 mg/dL.');out.push({label:'Blood sugar',value:n('glu'),unit:'mg/dL'})}
  if(!out.length)return setErr('Enter at least one value, or skip.');onSave(out)};
 return <div className="em-vitals"><div className="em-vital-grid">
  <label>Heart rate<span><input inputMode="numeric" value={v.hr} onChange={set('hr')}/><em>bpm</em></span></label>
  <label>Blood pressure<span className="bp"><input inputMode="numeric" aria-label="Systolic" value={v.sys} onChange={set('sys')}/>/<input inputMode="numeric" aria-label="Diastolic" value={v.dia} onChange={set('dia')}/><em>mmHg</em></span></label>
  <label>Temperature<span><input inputMode="decimal" value={v.temp} onChange={set('temp',true)}/><em>°C</em></span></label>
  <label>Blood sugar<span><input inputMode="numeric" value={v.glu} onChange={set('glu')}/><em>mg/dL</em></span></label>
 </div>{err&&<p className="em-error" role="alert">{err}</p>}<div className="em-row wrap"><button className="em-big primary" onClick={save}><Check size={22}/>Save vitals</button><button className="em-big ghost" onClick={onSkip}>Skip</button></div></div>;
}

export default function Emergency({data,signals={},operator,initialPatient,incidentId,onClose,onBroadcast,onAcknowledge,onPatch,onAppend,onResolve,onEarth,onError}){
 const [patient,setPatient]=useState(initialPatient||null),[id,setId]=useState(incidentId||null),[opened]=useState(Date.now()),[now,setNow]=useState(Date.now()),[showThread,setShowThread]=useState(false);
 const ref=useRef();
 const incident=data.crewAlerts.find(a=>a.id===id);
 const who=incident?.patient??patient,person=crew.find(c=>c.id===who),name=person?.name.split(' ')[0]||'the person';
 const step=incident?(incident.step||'summary'):patient?'what':'who';
 useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t)},[]);
 useEffect(()=>{ref.current?.focus();const key=e=>{if(e.key==='Escape')onClose()};document.addEventListener('keydown',key);const o=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.removeEventListener('keydown',key);document.body.style.overflow=o}},[]);
 useEffect(()=>{ref.current?.querySelector('.em-main')?.focus()},[step]);
 const log=(text,patch={})=>onPatch(id,a=>({...a,...patch,log:[...(a.log||[]),{id:uuid(),ts:Date.now(),text}]}));
 const start=async sc=>{try{const newId=await onBroadcast({patient:who||'unknown',situation:sc.situation,description:sc.label});setId(newId);onPatch(newId,a=>({...a,scenario:sc.id,step:FIRST_STEP,log:[...(a.log||[]),{id:uuid(),ts:Date.now(),text:`Emergency started: ${sc.label}. Crew alerted.`}]}))}catch(error){onError?.(error.message||'Could not open an emergency in the health API.')}};
 const n=incident&&node(step,{name,scenario:incident.scenario});
 const answer=o=>log(`${n.text} → ${o.label}`,{step:o.next,assessment:{...(incident.assessment||{}),[n.field]:o.value}});
 const elapsed=fmt(now-(incident?.createdAt||opened));
 const lastVitals=person?['pulse','bp','temp','glucose'].map(k=>({k,r:latest(data.records,person.id,k)})).filter(x=>x.r):[];
 const alerts=person?(signals[person.id]||[]).filter(s=>s.level!=='info'):[];
 const others=crew.filter(c=>c.id!==incident?.patient);

 return <div className="em-overlay" role="dialog" aria-modal="true" aria-label="Emergency guide" tabIndex={-1} ref={ref}>
  <header className="em-top">
   <span className="em-badge"><BellRing size={20}/>Emergency</span>
   <span className="em-timer" aria-label={`Elapsed ${elapsed}`}><Clock size={18}/>{elapsed}</span>
   {person&&<span className="em-who"><UserRound size={17}/>{person.name}</span>}
   <button className="em-min" onClick={onClose} aria-label={incident?'Minimise the emergency guide':'Cancel'}><Minimize2 size={18}/>{incident?'Minimise':'Cancel'}</button>
  </header>
  <div className="em-body">
   <main className="em-main" tabIndex={-1} aria-live="polite">
    {step==='who'&&<><h1>Who needs help?</h1><p className="em-sub">No code needed. Choose the person, or continue if you are not sure.</p>
     <div className="em-grid">{crew.map(c=><button key={c.id} className="em-tile" onClick={()=>setPatient(c.id)}><span className="em-avatar" style={{'--person':c.color}}>{c.initials}</span><b>{c.name}</b><small>{c.role}</small></button>)}<button className="em-tile quiet" onClick={()=>setPatient('unknown')}><span className="em-avatar">?</span><b>Not sure who</b><small>Identify them later</small></button></div></>}
    {step==='what'&&<><h1>What’s happening{person?` to ${name}`:''}?</h1><p className="em-sub">Choosing one alerts the whole crew straight away.</p>
     <div className="em-list">{scenarios.map(s=><button key={s.id} className="em-option" onClick={()=>start(s)}>{s.label}<ChevronRight size={24}/></button>)}</div>
     <button className="em-back" onClick={()=>setPatient(null)}>Change person</button></>}
    {n?.kind==='question'&&<><span className="em-step">Check</span><h1>{n.text}</h1>{n.hint&&<p className="em-sub">{n.hint}</p>}
     <div className={'em-answers n'+n.options.length}>{n.options.map(o=><button key={o.value} className={'em-big '+(o.value==='yes'?'yes':o.value==='no'?'no':'ghost')} onClick={()=>answer(o)}>{o.label}</button>)}</div></>}
    {n?.kind==='action'&&<><span className={'em-step'+(n.urgent?' urgent':'')}>Do this now</span><h1>{n.title}</h1>
     <ol className="em-actions">{n.items.map(i=><li key={i}>{i}</li>)}</ol>
     <button className="em-big primary" onClick={()=>log(`Done: ${n.title}`,{step:n.next})}><Check size={22}/>Done, next step</button></>}
    {n?.kind==='vitals'&&<><span className="em-step">Measure</span><h1>{n.text}</h1><p className="em-sub">{n.hint}</p>
     <Vitals onSave={vs=>onPatch(id,a=>({...a,step:'summary',vitals:[...(a.vitals||[]),...vs.map(v=>({...v,ts:Date.now()}))],log:[...(a.log||[]),{id:uuid(),ts:Date.now(),text:'Vitals recorded: '+vs.map(v=>`${v.label} ${v.value} ${v.unit}`).join(', ')}]}))} onSkip={()=>log('Vitals skipped',{step:'summary'})}/></>}
    {n?.kind==='summary'&&<><span className="em-step">Summary</span><h1>Keep {name} with the CMO</h1><p className="em-sub">Everything below was logged with its time. Share it with the crew and the ground team.</p>
     <ol className="em-log">{(incident.log||[]).map(l=><li key={l.id}><time>{timeLabel(l.ts)}</time><span>{l.text}</span></li>)}</ol>
     <div className="em-row wrap"><button className="em-big primary" onClick={()=>onEarth({...incident,summary:summaryText(incident,person?.name||'Not identified',stamp)})}><Radio size={20}/>Prepare report for Earth</button><button className="em-big ghost" onClick={()=>log('Re-check started',{step:FIRST_STEP})}><RotateCcw size={20}/>Check again</button></div>
     {incident.status==='active'?<div className="em-close"><h2>Close this emergency</h2><p>Choose why. It is logged and the alert disappears for the whole crew.</p><div className="em-row wrap">{['CMO has taken over','Person is stable','False alarm'].map(r=><button key={r} className="em-big ghost close" onClick={()=>onResolve(incident.id,r)}><Check size={20}/>{r}</button>)}</div></div>:<p className="em-sub">Closed {stamp(incident.closedAt)} · {incident.closeReason||'resolved'}.</p>}
     <button className="em-back" onClick={()=>setShowThread(s=>!s)}><MessageSquare size={16}/>{showThread?'Hide':'Open'} incident notes</button>
     {showThread&&<div className="em-thread"><CrewAssistant key={incident.id} person={person||{id:'unknown',name:'Unidentified crew member'}} data={data} alert={incident} onAppend={onAppend} onAssessment={(aid,assessment)=>onPatch(aid,a=>({...a,assessment}))}/></div>}</>}
   </main>
   <aside className="em-side">
    <section><h2><HeartPulse size={18}/>{person?`${name}’s last saved vitals`:'Last saved vitals'}</h2>
     {person?lastVitals.length?<ul className="em-kv">{lastVitals.map(({k,r})=><li key={k}><span>{metrics[k].short}</span><b>{valueLabel(r)} <small>{metrics[k].unit}</small></b><time>{stamp(r.time)}</time></li>)}</ul>:<p>No saved vitals.</p>:<p>Choose the person to see them.</p>}
     {alerts.length>0&&<div className="em-alerts">{alerts.map(a=><span key={a.id} className={a.level==='review'?'red':''}>{a.short}</span>)}</div>}
     <small className="em-note">Shown without a code for safety. Saved values may be old.</small>
    </section>
    {incident&&<section><h2><Users size={18}/>Crew alerted</h2><ul className="em-ack">{others.map(c=><li key={c.id}><span className="em-avatar sm" style={{'--person':c.color}}>{c.initials}</span>{c.name}<em className={incident.acknowledgedBy.includes(c.id)?'ok':''}>{incident.acknowledgedBy.includes(c.id)?<><Check size={14}/>On it</>:'Pending'}</em></li>)}</ul>
     {incident.status==='active'&&!incident.acknowledgedBy.includes(operator.id)&&operator.id!==incident.patient&&<button className="em-big ghost small" onClick={()=>onAcknowledge(incident.id)}>Acknowledge as {operator.name.split(' ')[0]}</button>}</section>}
    {incident?.vitals?.length>0&&<section><h2>Taken during the emergency</h2><ul className="em-kv">{incident.vitals.map((v,i)=><li key={i}><span>{v.label}</span><b>{v.value} <small>{v.unit}</small></b><time>{timeLabel(v.ts)}</time></li>)}</ul></section>}
   </aside>
  </div>
  <footer className="em-foot"><Shield size={16}/>Follow your mission medical procedures. This guide does not replace the flight surgeon. Steps are illustrative.</footer>
 </div>;
}

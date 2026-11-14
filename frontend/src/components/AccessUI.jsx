import React,{useEffect,useRef,useState} from 'react';
import {Lock,Delete,BellRing,ChevronDown,Check,Orbit,Moon,Rocket,Globe2,LockOpen} from 'lucide-react';
import {crew,environments} from '../models/crewModel.js';

/** Large numeric keypad. Works with touch, mouse and the physical keyboard. */
export function PinPad({person,onSuccess,onAuthenticate,onClose,onEmergency,Modal}){
 const [code,setCode]=useState(''),[message,setMessage]=useState(''),[shake,setShake]=useState(false),[busy,setBusy]=useState(false);
 const submit=async value=>{if(busy)return;setBusy(true);setMessage('');try{const result=await onAuthenticate(person.id,value);onSuccess(result.scope,result)}catch(error){setShake(true);setTimeout(()=>setShake(false),420);setCode('');setMessage(error.status===429?'This profile is temporarily locked. Try again later.':error.status===401?'The PIN is incorrect.':error.message||'Could not sign in. Check the connection and try again.')}finally{setBusy(false)}};
 const press=d=>{if(busy)return;setMessage('');setCode(c=>{const next=(c+d).slice(0,4);if(next.length===4)setTimeout(()=>submit(next),120);return next})};
 const back=()=>setCode(c=>c.slice(0,-1));
 useEffect(()=>{const key=e=>{if(/^\d$/.test(e.key))press(e.key);else if(e.key==='Backspace')back()};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)});
 return <Modal title="Private data" onClose={onClose}>
  <div className="pin-pad">
   <span className="pin-avatar" style={{'--person':person.color}}>{person.initials}</span>
   <h2>{person.name}</h2>
   <p>Enter {person.name.split(' ')[0]}’s 4-digit profile PIN.</p>
   <div className={'pin-dots'+(shake?' shake':'')} aria-live="polite" aria-label={`${code.length} of 4 digits entered`}>{[0,1,2,3].map(i=><i key={i} className={i<code.length?'on':''}/>)}</div>
   <p className={'pin-message'+(message?' error':'')} role="status">{message||'Sign-in is verified by the mission health service.'}</p>
   <div className="keypad">{['1','2','3','4','5','6','7','8','9'].map(d=><button key={d} onClick={()=>press(d)} disabled={busy}>{d}</button>)}<span/><button onClick={()=>press('0')} disabled={busy}>0</button><button onClick={back} aria-label="Delete last digit" disabled={busy||!code}><Delete size={22}/></button></div>
   <button className="pin-emergency" onClick={onEmergency}><BellRing size={17}/>Emergency? No code needed</button>
  </div>
 </Modal>;
}

/** Shown in place of private content. */
export function LockedPanel({person,onUnlock,compact=false,what='health data'}){
 return <div className={'locked-panel'+(compact?' compact':'')}><span className="locked-icon"><Lock size={compact?18:24}/></span><div><b>{person?`${person.name.split(' ')[0]}’s ${what} is private`:`This ${what} is private`}</b><p>Sign in with this profile’s PIN to view its data.</p></div>{onUnlock&&<button className="button primary" onClick={onUnlock}><LockOpen size={17}/>Unlock</button>}</div>;
}

/** Header chip: shared session, or who is unlocked, with a lock button. */
export function SessionChip({access,onPick,onLock}){
 const unlocked=access.all||access.ids.length>0;
 const label=access.all?'Commander access':access.ids.map(id=>crew.find(c=>c.id===id)?.name.split(' ')[0]).join(', ');
 return <div className="session-chip">
  <button className="session-main" onClick={onPick} aria-label={unlocked?`Unlocked: ${label}. Open another profile`:'Shared session. Open a profile'}><span className={'session-icon'+(unlocked?' open':'')}>{unlocked?<LockOpen size={17}/>:<Lock size={17}/>}</span><span><b>{unlocked?label:'Shared session'}</b><small>{unlocked?'Private data visible':'Private data locked'}</small></span></button>
  {unlocked&&<button className="session-lock" onClick={onLock}><Lock size={15}/>Lock</button>}
 </div>;
}

export function ProfilePicker({access,onChoose,onClose,Modal}){
 return <Modal title="Open a profile" onClose={onClose}><h2 className="modal-title">Who is using SOMA?</h2><p className="muted">The shared screen stays general. Personal values open with each person’s code.</p>
  <div className="profile-pick">{crew.map(c=><button key={c.id} onClick={()=>onChoose(c.id)}><span className="pin-avatar small" style={{'--person':c.color}}>{c.initials}</span><span><b>{c.name}</b><small>{c.role}</small></span>{(access.all||access.ids.includes(c.id))?<span className="pick-state open"><LockOpen size={16}/>Open</span>:<span className="pick-state"><Lock size={16}/></span>}</button>)}</div>
 </Modal>;
}

const envIcons={station:Orbit,moon:Moon,transit:Rocket,mars:Globe2};
/** Mission situation selector in the header. */
export function MissionSelector({data,day,onChange}){
 const [open,setOpen]=useState(false),ref=useRef();const env=environments[data.environment]||environments.transit,Icon=envIcons[data.environment]||Rocket;
 useEffect(()=>{if(!open)return;const close=e=>{if(!ref.current?.contains(e.target))setOpen(false)};const key=e=>{if(e.key==='Escape')setOpen(false)};document.addEventListener('mousedown',close);document.addEventListener('keydown',key);return()=>{document.removeEventListener('mousedown',close);document.removeEventListener('keydown',key)}},[open]);
 return <div className="mission-select" ref={ref}>
  <button className="mission-chip" aria-haspopup="listbox" aria-expanded={open} onClick={()=>setOpen(o=>!o)}><Icon size={15}/>{env.label} · day {day}<ChevronDown size={15}/></button>
  {open&&<ul className="mission-menu" role="listbox" aria-label="Mission situation">{Object.entries(environments).map(([id,e])=>{const I=envIcons[id];return <li key={id}><button role="option" aria-selected={data.environment===id} className={data.environment===id?'on':''} onClick={()=>{onChange(id);setOpen(false)}}><span className="env-icon"><I size={18}/></span><span><b>{e.label}</b><small>{e.detail} · {e.link||`Earth link · ${e.latency} min delay`}</small></span>{data.environment===id&&<Check size={17}/>}</button></li>})}</ul>}
 </div>;
}

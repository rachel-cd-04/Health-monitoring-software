// "Report a problem": a person says something is wrong with them. It is not a call for rescue
// (that is the Emergency guide). It informs the CMO on board and, optionally, sends a report to Earth
// with the saved samples attached.
import {metrics,metricOrder,latest,valueLabel,stamp,slotNames,localId} from './crewModel.js';

export const SYMPTOMS=['Pain','Stomach ache or nausea','Headache','Dizziness','Breathing feels hard','Fever or chills','Injury','Feeling low or anxious','Something else'];
export const INTENSITY=['Mild','Moderate','Severe'];
export const ONSET=['Just now','Earlier today','Since yesterday','Several days'];

export function validateReport(r){
 if(!r||!SYMPTOMS.includes(r.what))return 'Choose what is happening.';
 if(!INTENSITY.includes(r.intensity))return 'Choose how strong it feels.';
 if(!ONSET.includes(r.since))return 'Choose when it started.';
 if(!r.toCmo&&!r.toEarth)return 'Choose who should receive the report.';
 return null;
}

/** Text sent to the ground team: the report plus saved samples, clearly labelled as historical. */
export function reportBody(r,person,data){
 const samples=metricOrder.map(k=>{const s=latest(data.records,person.id,k),m=metrics[k];return s?`${m.label}: ${valueLabel(s)} ${m.unit}, ${stamp(s.time)} (${slotNames[s.slot]||'Additional assessment'})`:`${m.label}: not recorded`});
 return [`Problem reported by ${person.name}`,`What: ${r.what}${r.where?` · where: ${r.where}`:''}`,`Intensity: ${r.intensity} · started: ${r.since}`,r.note?`In their words: ${r.note}`:null,`CMO on board informed: ${r.toCmo?'yes':'no'}`,'','Saved samples (not current live values):',...samples].filter(x=>x!==null).join('\n');
}

export function buildReport(input,person,data,now=Date.now()){
 const error=validateReport(input);if(error)throw new Error(error);
 const report={id:localId(),crewId:person.id,what:input.what,where:(input.where||'').trim().slice(0,80),intensity:input.intensity,since:input.since,note:(input.note||'').trim().slice(0,1000),toCmo:!!input.toCmo,toEarth:!!input.toEarth,createdAt:now};
 return {report,body:input.toEarth?reportBody(report,person,data):null};
}

export const recentReports=(data,crewId,now=Date.now(),days=7)=>(data.healthReports||[]).filter(r=>r.crewId===crewId&&now-r.createdAt<days*86400000).sort((a,b)=>b.createdAt-a.createdAt);

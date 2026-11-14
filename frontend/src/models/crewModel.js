export const crew = [
  {id:'ana',name:'Ana Vega',role:'Commander',initials:'AV',bodyModel:'female',color:'#72c8e5',pulse:68,temp:36.6,glucose:92,sleep:7.8,bp:118,diastolic:76,mood:4,fatigue:2,exercise:95},
  {id:'leo',name:'Leo Soler',role:'Pilot',initials:'LS',bodyModel:'male',color:'#e9ba75',pulse:72,temp:36.7,glucose:98,sleep:6.8,bp:122,diastolic:79,mood:3,fatigue:2,exercise:80},
  {id:'ines',name:'Inés Vidal',role:'Mission specialist · CMO',initials:'IV',bodyModel:'female',color:'#a6ace5',pulse:72,temp:36.5,glucose:88,sleep:8.1,bp:116,diastolic:74,mood:4,fatigue:1,exercise:105},
  {id:'noa',name:'Noa Ríos',role:'Mission specialist · CMO',initials:'NR',bodyModel:'female',color:'#85c9b1',pulse:65,temp:36.8,glucose:95,sleep:7.4,bp:120,diastolic:77,mood:4,fatigue:2,exercise:90},
];
export const localId=()=>`local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
export const metrics = {
 pulse:{label:'Heart rate',short:'Heart rate',unit:'bpm',min:30,max:220,step:1,description:'Heartbeats recorded per minute. Activity, symptoms and the measurement method give the number context.',why:'Stored check-ins help the medical team follow individual cardiovascular changes.',guide:['I confirmed the person and prepared the instrument according to its manual.','The sensor is positioned as instructed and the person is secured as required by the mission.','The activity context is recorded; avoidable movement has stopped.'],quality:['The instrument completed its reading and the signal or display was stable.','I checked the value and unit against the instrument.']},
 temp:{label:'Body temperature',short:'Temperature',unit:'°C',min:30,max:43,step:.1,description:'A temperature reading depends on the instrument and method.',why:'Use recorded readings and symptoms to communicate changes to the medical team.',guide:['I confirmed the person and checked the thermometer is ready and clean.','I followed the method specified by the instrument.','The instrument is positioned correctly and the measurement cycle can finish.'],quality:['The thermometer indicated that the measurement was complete.','The displayed temperature and unit are recorded correctly.']},
 bp:{label:'Blood pressure',short:'Blood pressure',unit:'mmHg',min:60,max:260,step:1,description:'Record both systolic and diastolic pressure. Use the instrument and positioning procedure approved for the mission.',why:'Blood pressure records provide context about cardiovascular adaptation during the flight.',guide:['I confirmed the person and selected the correct cuff and approved instrument.','The cuff is fitted according to its manual; the limb and person are positioned and secured per mission procedure.','The required rest and activity conditions in the mission procedure have been met.'],quality:['The cuff cycle completed without an error or avoidable movement.','Both systolic and diastolic values match the display.']},
 glucose:{label:'Blood sugar',short:'Blood sugar',unit:'mg/dL',min:20,max:600,step:1,description:'Capillary blood glucose from a finger-prick meter. Recent meals, exercise and the time of day change the value.',why:'Read with meal timing. In this prototype it is an indicative marker of food and nutrition, not a nutrition assessment.',guide:['I confirmed the person and checked the meter and test strips are in date.','Hands are clean and dry; the lancet and strip are ready.','I noted when the person last ate.'],quality:['The meter completed the reading without an error code.','The value and unit match the meter display.']},
 sleep:{label:'Sleep duration',short:'Sleep',unit:'h',min:0,max:24,step:.1,description:'Self-reported time actually asleep during the last rest period. Add interruptions or sleep-quality concerns.',why:'Rest records help explain fatigue and support workload planning.',guide:['I identified the most recent rest period.','I separated time asleep from time spent awake in the rest period.','I considered interruptions and sleep quality.'],quality:['The duration reflects the person’s report or their recorded sleep estimate.','Any uncertainty or sleep-quality concern is noted.']},
 mood:{label:'Mood',short:'Mood',unit:'/5',min:1,max:5,step:1,description:'Self-reported mood: 1 means very low and 5 means very good.',why:'Private self-reporting can help the crew ask for support during an isolated mission.',guide:['The person understands the 1–5 demonstration scale.','The response is their own current self-assessment.','The person can add a private note to the check-in.'],quality:['I confirmed the selected response with the person.','Any request for follow-up is recorded.']},
 fatigue:{label:'Fatigue',short:'Fatigue',unit:'/5',min:1,max:5,step:1,description:'Self-reported tiredness: 1 means rested and 5 means exhausted.',why:'Fatigue, read with sleep, helps the crew plan workload and rest.',guide:['The person understands the 1–5 scale.','The answer is their own current assessment.'],quality:['I confirmed the selected response with the person.']},
 exercise:{label:'Exercise',short:'Exercise',unit:'min',min:0,max:600,step:1,description:'Minutes of countermeasure exercise completed in the last day, from the exercise log or the person’s report.',why:'Daily exercise protects heart, muscle and bone fitness in reduced gravity.',guide:['I counted the exercise sessions completed since the last check-in.'],quality:['The minutes match the exercise log or the person’s report.']},
};
// Mission situations. Delays are illustrative one-way light-time figures for the demo.
export const environments={
 station:{label:'Space station',detail:'Low Earth orbit · microgravity',link:'Earth link · live',connection:'online',latency:1},
 moon:{label:'Moon',detail:'Lunar surface · 1/6 g',link:'Earth link · 1.3 s delay',connection:'online',latency:1},
 transit:{label:'Transit to Mars',detail:'Deep space · microgravity',link:null,connection:'delayed',latency:8},
 mars:{label:'Mars',detail:'Martian surface · 3/8 g',link:null,connection:'delayed',latency:14},
};
export const metricOrder=['pulse','bp','glucose','temp','sleep','mood','fatigue','exercise'];
export const deviceMetrics=['pulse','bp','glucose','temp'];
export const selfMetrics=['sleep','mood','fatigue','exercise'];
export const STATE_VERSION=3;
export const slotNames={daily:'Daily',morning:'Morning',evening:'Evening',unscheduled:'Additional assessment'};
export const DAILY_SLOTS=['daily','morning','evening']; // morning/evening kept for sessions saved before the single daily check-in
export const missionDay=(time=Date.now())=>new Date(time).toISOString().slice(0,10);
export const slotTime=(day,slot,schedule)=>Date.parse(`${day}T${schedule[slot]||schedule.daily||'08:00'}:00Z`);
export const number=v=>Number(v).toLocaleString('en-GB',{maximumFractionDigits:1});
export const timeLabel=t=>new Date(t).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'UTC'});
export const dateLabel=t=>new Date(t).toLocaleDateString('en-GB',{day:'2-digit',month:'short',timeZone:'UTC'});
export const stamp=t=>t?`${dateLabel(t)}, ${timeLabel(t)} UTC`:'Not recorded';
export const valueLabel=r=>r?(r.metric==='bp'?`${number(r.value)}/${r.diastolic!=null?number(r.diastolic):'—'}`:number(r.value)):'—';
export function latest(records,crewId,metric){return records.filter(r=>r.crewId===crewId&&r.metric===metric).sort((a,b)=>b.time-a.time)[0]}
export function checkIn(data,id,slot='daily',day=missionDay()){const match=slot==='daily'?s=>DAILY_SLOTS.includes(s.slot):s=>s.slot===slot;return data.sessions.filter(s=>s.crewId===id&&match(s)&&s.day===day).sort((a,b)=>b.time-a.time)[0]}
export function slotStatus(data,id,slot,now=Date.now()){if(checkIn(data,id,slot,missionDay(now)))return 'complete';return now>=slotTime(missionDay(now),slot,data.schedule)?'due':'scheduled'}
export function nextSlot(){return 'daily'}
export function createInitialState(){
 const now=Date.now(),schedule={daily:'08:00'},sessions=[],records=[];
 for(let dayOffset=13;dayOffset>=0;dayOffset--){const day=missionDay(now-dayOffset*86400000);for(const slot of ['daily']){const time=slotTime(day,slot,schedule);if(time>now)continue;crew.forEach((person,p)=>{if(dayOffset===0&&person.id==='leo')return;const sessionId=`routine-${day}-${slot}-${person.id}`;sessions.push({id:sessionId,crewId:person.id,day,slot,time,operator:person.id,source:'Demo station',complete:true});metricOrder.forEach(metric=>{const v=person[metric]+Math.sin(dayOffset*1.1+p+0)*({pulse:3,temp:.1,glucose:6,bp:3,sleep:.3,mood:0,fatigue:0,exercise:12}[metric]);records.push({id:`${sessionId}-${metric}`,sessionId,crewId:person.id,metric,value:Number(v.toFixed(['temp','sleep'].includes(metric)?1:0)),...(metric==='bp'?{diastolic:person.diastolic}:{}),time,slot,source:'Demo station',context:'Routine check-in',note:'Scheduled demonstration sample',operator:person.id,protocol:{pre:true,quality:true}})})})}}
 seedDemoTrends(records);
 return {version:STATE_VERSION,records,sessions,schedule,messages:[],crewAlerts:[],chatThreads:{},operator:'ines',environment:'transit',connection:'delayed',latency:8};
}
// Demonstration deviations so the explainable signals can be shown on first load (synthetic data).
function seedDemoTrends(records){
 const last=(id,metric,n)=>records.filter(r=>r.crewId===id&&r.metric===metric).sort((a,b)=>b.time-a.time).slice(0,n);
 const set=(id,metric,values)=>last(id,metric,values.length).forEach((r,i)=>{r.value=values[i];r.note='Scheduled demonstration sample · seeded trend'});
 set('leo','sleep',[5.0,4.8,5.1]);   // S-01 · sleep < 6 h for 3 nights
 set('leo','pulse',[92,94,91]);      // C-01 · resting HR > baseline + 15 bpm for 3 days
 set('leo','fatigue',[4,4,3]);
 set('noa','mood',[2,2,2]);          // M-01 · mood ≤ 2 for 3 days
}
export const DAY_MS=86400000;
export function missionDayNumber(data,now=Date.now()){const first=data.sessions.reduce((m,s)=>Math.min(m,Date.parse(s.day+'T00:00:00Z')),Infinity);return Number.isFinite(first)?Math.max(1,Math.floor((now-first)/DAY_MS)+1):1}
// Saved state from an earlier version (with SpO₂ and body observations) is replaced by fresh demo data,
// keeping the operator, schedule and mission situation.
export function readState(){if(import.meta.env?.VITE_API_URL)return {version:STATE_VERSION,records:[],sessions:[],schedule:{daily:'08:00'},messages:[],crewAlerts:[],chatThreads:{},operator:'ines',environment:'station',connection:'online',latency:1,healthReports:[],reminderSnoozes:{}};try{const saved=JSON.parse(localStorage.getItem('soma-v2'));if(saved?.version===STATE_VERSION&&Array.isArray(saved.records)&&Array.isArray(saved.sessions)&&Array.isArray(saved.crewAlerts)&&crew.some(c=>c.id===saved.operator))return saved;const fresh=createInitialState();if(saved&&typeof saved==='object'){if(crew.some(c=>c.id===saved.operator))fresh.operator=saved.operator;const daily=saved.schedule?.daily||saved.schedule?.morning;if(daily)fresh.schedule={daily};if(environments[saved.environment]){fresh.environment=saved.environment;fresh.connection=saved.connection||fresh.connection;fresh.latency=saved.latency||fresh.latency}}return fresh}catch{return createInitialState()}}
export function downloadFile(name,data,type='application/json'){const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}

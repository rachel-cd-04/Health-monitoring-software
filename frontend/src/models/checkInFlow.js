import {metrics,metricOrder,missionDay,deviceMetrics,selfMetrics,localId} from './crewModel.js';
export {deviceMetrics,selfMetrics};
export function validateDeviceReadings(values){
 for(const key of deviceMetrics){const m=metrics[key],raw=String(values[key]??''),n=Number(raw);if(!raw.trim()||!Number.isFinite(n)||n<m.min||n>m.max||(m.step===1&&!Number.isInteger(n)))return {field:key,message:`Check ${m.label.toLowerCase()}: enter ${m.min}–${m.max} ${m.unit}${m.step===1?' in whole numbers':''}. These are entry limits, not clinical safety ranges.`}}
 const raw=String(values.diastolic??''),d=Number(raw);if(!raw.trim()||!Number.isInteger(d)||d<20||d>150||d>=Number(values.bp))return {field:'diastolic',message:'Enter a diastolic pressure between 20 and 150 mmHg, below the systolic pressure.'};
 return null;
}
/** self = {sleep, mood, fatigue, exercise} */
export function validateSelfReport(self){
 const {sleep,mood,fatigue,exercise}=self||{};
 if(String(sleep??'').trim()===''||!Number.isFinite(Number(sleep))||Number(sleep)<0||Number(sleep)>24)return 'Choose how many hours you actually slept (0–24 h).';
 if(!Number.isInteger(Number(mood))||Number(mood)<1||Number(mood)>5)return 'Choose the face that matches your mood.';
 if(!Number.isInteger(Number(fatigue))||Number(fatigue)<1||Number(fatigue)>5)return 'Choose how tired you feel (1–5).';
 if(String(exercise??'').trim()===''||!Number.isInteger(Number(exercise))||Number(exercise)<0||Number(exercise)>600)return 'Enter your exercise minutes since the last check-in (0–600 min).';
 return null;
}
export function buildQuickCheckIn({crewId,slot,operator,values,self={},ready,quality,sources={},times={},now=Date.now()}){
 if(!ready||!quality)throw new Error('Confirm the shared setup and reading checks.');
 const invalid=validateDeviceReadings(values);if(invalid)throw new Error(invalid.message);const reportError=validateSelfReport(self);if(reportError)throw new Error(reportError);
 const id=localId();const session={id,crewId,slot,day:missionDay(now),time:now,operator,complete:true,source:'Visual guided check-in'};
 const records=metricOrder.map(metric=>({id:localId(),sessionId:id,crewId,metric,value:Number(selfMetrics.includes(metric)?self[metric]:values[metric]),...(metric==='bp'?{diastolic:Number(values.diastolic)}:{}),time:times[metric]??now,slot,source:selfMetrics.includes(metric)?'Self-report':sources[metric]||'Manual entry',operator,protocol:{pre:true,quality:true,confirmationMode:'shared',individualChecklist:false}}));
 return {session,records};
}

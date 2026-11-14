import React from 'react';
import {Brain,Heart,Flame,Dumbbell} from 'lucide-react';
import {regions,associated} from '../models/health.js';
import {metrics} from '../models/crewModel.js';

export const regionIcons={head:Brain,heart:Heart,body:Flame,legs:Dumbbell};
const VB_W=600,VB_H=720,SCALE=1.75,FOCUS={x:250,y:330};
const pct=(v,total)=>`${(v/total)*100}%`;

/** What the crew should know about one body area, in one short line. */
export function regionState(key,signals=[]){
 const s=signals.filter(x=>associated[key].includes(x.metric)&&x.level!=='info');
 if(s.length)return {tone:s.some(x=>x.level==='review')?'review':'signal',line:s[0].short,count:s.length};
 return {tone:'calm',line:`Nothing flagged · ${associated[key].map(k=>metrics[k].short).join(', ')}`,count:0};
}

export default function Anatomy({uid='body',data,person,selected=null,onSelect,compact=false,zoom=true,signals=[],hideDots=false,touring=false}){
 const target=regions[selected];
 const scale=target&&zoom?SCALE:1;
 const tx=target&&zoom?FOCUS.x-target.x*scale:0, ty=target&&zoom?FOCUS.y-target.y*scale:0;
 const place=r=>({x:r.x*scale+tx,y:r.y*scale+ty});
 const female=person?.bodyModel==='female';
 const state=target?regionState(selected,signals):null;
 const p=target?place(target):null;
 // Callout card sits to the right of the body; the connector runs from its left edge to the point.
 const card={x:404,y:118};
 const path=p&&`M${card.x} ${card.y+34} C ${card.x-46} ${card.y+34}, ${p.x+70} ${p.y}, ${p.x+24} ${p.y}`;
 return <div className={'body-stage '+(compact?'compact':'')} style={{'--stage-ratio':`${VB_W}/${VB_H}`}}>
  <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="body-svg" role="img" aria-label={compact?`Body illustration for ${person?.name}`:`Body map for ${person?.name}`}>
   <defs>
    <radialGradient id={'halo-'+uid} cx="50%" cy="46%" r="50%"><stop offset="0" stopColor="#ffffff" stopOpacity=".95"/><stop offset=".55" stopColor="#ffffff" stopOpacity=".55"/><stop offset="1" stopColor="#ffffff" stopOpacity="0"/></radialGradient>
    <radialGradient id={'floor-'+uid}><stop stopColor="#5d7a88" stopOpacity=".28"/><stop offset="1" stopColor="#5d7a88" stopOpacity="0"/></radialGradient>
   </defs>
   <circle cx="280" cy="330" r="270" fill={`url(#halo-${uid})`}/>
   {!compact&&<g className="halo-rings" fill="none"><circle cx="280" cy="330" r="232"/><circle cx="280" cy="330" r="176"/></g>}
   <ellipse cx="280" cy="684" rx="150" ry="20" fill={`url(#floor-${uid})`}/>
   <g className="anatomy-camera" style={{transform:`translate(${tx}px, ${ty}px) scale(${scale})`}}>
    <image href={female?'/anatomy-female.png':'/anatomy-body.png'} x="60" y="-8" width="440" height="700" preserveAspectRatio="xMidYMid meet"/>
   </g>
   {!compact&&target&&<g className={'body-connector '+state.tone} key={selected+String(zoom)}>
    <path d={path} pathLength="1"/>
    <circle cx={p.x} cy={p.y} r="5"/>
   </g>}
  </svg>

  {/* Markers live outside the camera group so they stay crisp and the same size while zooming. */}
  <div className="body-markers">
   {Object.entries(regions).map(([key,r])=>{
    const st=regionState(key,signals);
    if(compact&&(hideDots||st.tone==='calm'))return null;
    const pos=place(r),Icon=regionIcons[key],active=selected===key;
    if(target&&zoom&&!active&&(pos.y<40||pos.y>VB_H-30||pos.x<20||pos.x>VB_W-20))return null; // off-camera while zoomed
    const style={left:pct(pos.x,VB_W),top:pct(pos.y,VB_H)};
    if(compact)return <span key={key} className={'body-dot '+st.tone} style={style} aria-hidden="true"/>;
    return <button key={key} className={'body-marker '+st.tone+(st.tone!=='calm'?' affected':'')+(active?' active':'')+(target&&!active?' dim':'')} style={style} aria-pressed={active} aria-label={`${r.label}: ${st.line}`} onClick={()=>onSelect?.(active?null:key)}>
     <Icon size={18} strokeWidth={2}/>{st.count>0&&<b>{st.count}</b>}
    </button>;
   })}
  </div>

  {!compact&&target&&<div className={'body-callout '+state.tone+(touring?' touring':'')} key={'c-'+selected} style={{left:pct(card.x,VB_W),top:pct(card.y,VB_H)}} role="status">
   <span>{target.label}</span>
   <b>{state.line}</b>
  </div>}
 </div>;
}

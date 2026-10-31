import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCampaign } from './game/campaign-store.ts';
import { campaignMap, cells, districts, nodes, wonders, polygonPoints, ringsPath } from './game/campaign-map.ts';
import { movement, unitAvailable, route } from './game/campaign.ts';
import { campaignPalette } from './campaign-palette.ts';
const palette=campaignPalette.districts;
export function Landmark({theme='civic'}:{theme?:string}){
 return <g className={`landmark-icon icon-${theme}`} stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round"><path d="M-12 10H12"/>{theme==='skyline'?<><path d="M-6 9V-8H6V9M-8 4H8M-8-1H8M-8-6H8M-4-9V-14H4V-9M0-14V-19"/><path d="M-9 5L-6 8M9 5L6 8"/></>:theme==='temple'||theme==='hill'?<><path d="M-12-1Q-3-3 0-10Q3-3 12-1ZM-9 0V9M9 0V9M-4 9V2H4V9M-14-2L-16-5M14-2L16-5"/></>:theme==='ecology'?<><circle cx="0" cy="-1" r="9"/><circle cx="-7" cy="-9" r="4"/><circle cx="7" cy="-9" r="4"/><circle cx="-3" cy="-2" r="1"/><circle cx="3" cy="-2" r="1"/><path d="M-2 3Q0 6 2 3"/></>:theme==='park'?<><path d="M-6 10V-3M5 10V0"/><circle cx="-6" cy="-7" r="6"/><circle cx="6" cy="-4" r="6"/></>:theme==='market'||theme==='river'?<><path d="M-11 9V-3H11V9M-13-3L-9-9H9L13-3ZM-6-9L-7-3M0-9V-3M6-9L7-3M-5 9V2H5V9"/></>:theme==='music'?<><path d="M-12 9V-4L-4-10L3-2L12-7V9ZM-6 3V-1L6-3V1"/></>:theme==='spring'?<><path d="M-11 9V-3L0-10L11-3V9M-6 9V2H6V9M-5-13Q-8-16-5-19M1-12Q-2-15 1-18M7-12Q4-15 7-18"/></>:<><path d="M-12-5L0-12L12-5ZM-10 9V-3M-4 9V-3M4 9V-3M10 9V-3M-12 6H12"/></>}</g>;
}
export function CityMap({compact=false}:{compact?:boolean}){
 const {t,i18n}=useTranslation();const lang=i18n.language==='en'?'en':'zh-TW';const {game,districtId,focus}=useCampaign();
 const bounds=campaignMap.districts.reduce((a,d)=>[Math.min(a[0],d.bounds[0]),Math.min(a[1],d.bounds[1]),Math.max(a[2],d.bounds[2]),Math.max(a[3],d.bounds[3])],[Infinity,Infinity,-Infinity,-Infinity]);
 const vb=[bounds[0]-1600,bounds[1]-900,bounds[2]-bounds[0]+3200,bounds[3]-bounds[1]+1800].join(' ');
 return <div className={`city-map ${compact?'compact':''}`}><svg viewBox={vb} role="group" aria-label={t('c_cityMap')}>
 <defs><pattern id="mapgrain" width="250" height="250" patternUnits="userSpaceOnUse"><circle cx="20" cy="20" r="9" fill="#204c86" opacity=".15"/></pattern></defs>
 {districts.map((d,i)=><g key={d.id} className={`city-district ${districtId===d.id?'chosen':''}`} tabIndex={0} role="button" aria-label={t('c_openDistrict',{district:d.name[lang]})} aria-pressed={districtId===d.id} onClick={()=>focus(d.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();focus(d.id);}}}>
 <path d={ringsPath(d.rings)} fill={palette[i]} stroke="#f7faff" strokeWidth="55" fillRule="evenodd"/>
 <path d={ringsPath(d.rings)} fill="url(#mapgrain)" pointerEvents="none" fillRule="evenodd"/>
 <text x={d.center[0]} y={d.center[1]} textAnchor="middle" className="district-label">{d.name[lang].replace(/ District$/,'')}</text>
 </g>)}
 <g fill="#579fc7" opacity=".8" pointerEvents="none">{campaignMap.rivers.map((r,i)=><path key={i} d={ringsPath([r])}/>)}</g>
 {!compact&&districts.map(d=>{const n=nodes.find(n=>n.id===d.wonderId)!;const c=cells.get(n.cellId)!;const stages=game.stages.filter(s=>nodes.find(n=>n.id===s.nodeId)?.districtId===d.id);return <g key={d.id} transform={`translate(${c.x},${c.y})`} pointerEvents="none"><circle r="125" fill="#ffd34e" stroke="#264774" strokeWidth="25"/>{stages.map((s,i)=><rect key={s.nodeId} x={200+i*270} y={-100} width="210" height="210" fill={s.brand==='island'?campaignPalette.stages.island:campaignPalette.stages.soapbox} stroke={s.brand==='island'?campaignPalette.stages.islandTrim:campaignPalette.stages.soapboxTrim} strokeWidth="50"/>)}</g>;})}
 <g transform={`translate(${bounds[2]+400},${bounds[1]+1800})`} fill="#264774"><path d="M0-700L-150 0L0-120L150 0Z"/><text y="450" textAnchor="middle" fontSize="360">{t('c_north')}</text></g>
 </svg><div className="map-stamp">{t('c_mapStamp')}</div></div>;
}

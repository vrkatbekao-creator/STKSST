import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { nodes } from './game/campaign-map.ts';
import type { Cell } from './game/campaign-map.ts';
import { districtScenes,streetVariant } from './district-streets.ts';

/** Distinctive silhouettes based on the existing twelve-Wonder catalog; stylized, not measured. */
export function DistrictLandmark({districtId}:{districtId:string}){
 const motif=districtScenes[districtId]?.motif;
 return <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" className={`district-landmark landmark-${motif}`}>
 <path d="M-15 12H15"/>
 {motif==='lantern'?<><path d="M-13 12V-5H13V12M-16-5H16L12-10H-12ZM-11-10L-14-14M11-10L14-14M-6 12V0H6V12M-13-1H-6M6-1H13"/><path d="M-9-3V5M9-3V5" strokeWidth="4"/><path d="M-9 6V9M9 6V9M-6-7H6"/></>:
 motif==='tower'?<><path d="M-5 12L-7 5H-5L-7-2H-5L-7-9H-4V-15H4V-9H7L5-2H7L5 5H7L5 12ZM0-15V-22M-4-12H4M-5-6H5M-5 1H5M-5 8H5"/><path d="M-14 12V0H-9M9 12V-4H14V12"/></>:
 motif==='garden'?<><path d="M-15 12Q-5 2 0 12Q5 2 15 12M-8 8V-6M8 8V-3"/><path d="M-15-3Q-17-10-10-11Q-7-18-2-10Q4-7-1-2Z M3 0Q0-8 6-9Q10-14 14-7Q20-2 14 2Z"/><path d="M-2 8Q0-2 4 5M-12 14H12"/></>:
 motif==='gallery'?<><path d="M-15 10V-3H2V10ZM-8-3V-12H12V1H2M-15 4H15V10H-15M2 1H15V4M-8-7H12M-10 0H-4M6-8H10"/><path d="M-4-3V4M8 4V10"/></>:
 motif==='civic'?<><path d="M-13 12L-8 6H8L13 12M-8 6V-5H8V6M-13-5L0-15L13-5ZM-4-15L0-19L4-15M-3 6V0H3V6M-10 9H10"/><path d="M-7-8H7M-4-11H4"/></>:
 motif==='arcade'?<><path d="M-14 2L-1-2L11 2V5H-14ZM-11 5V9M7 5V9M-4-1V-13L5-8L-4-7M-15 11Q-10 7-5 11T5 11T15 11M-15 15Q-10 11-5 15T5 15T15 15"/><path d="M-9-2V-7M-13-7H-5M10-1V-6"/></>:
 motif==='temple'?<><path d="M-13 12V0H13V12M-17-1Q-8-1-6-6L0-9L6-6Q8-1 17-1M-17-1L-19-5M17-1L19-5M-11-7Q-4-8 0-14Q4-8 11-7M-11-7L-13-10M11-7L13-10M-5 12V4H5V12M-9 1V9M9 1V9"/><path d="M-14 4V8M14 4V8" strokeWidth="3"/></>:
 motif==='tea'?<><path d="M-15 12V-2Q-15-14 0-14Q15-14 15-2V12M-8 12V-1Q0-9 8-1V12M-16-3H16"/><circle cx="-5" cy="-13" r="3"/><circle cx="5" cy="-13" r="3"/><path d="M-4-5L0-3L4-5M-11 5H-14M11 5H14"/></>:
 motif==='music'?<><path d="M-16 12V0L-8-14L0-5L8-12L16 4V12ZM-16 0L0 5L-8-14M0 5L8-12M0 5L16 4M0 5V12M-9 12V6M8 12V7"/><path d="M-5-18V-23L3-25V-20M-5-18L-7-17M3-20L1-19"/></>:
 motif==='office'?<><path d="M-16 12L-9 2L-2 12M-9 2L-3-4L3 1M-11-5Q-4-6 0-12Q4-6 11-5M-11-5L-14-8M11-5L14-8M-8-4V5M8-4V5M-4 7V0H4V7M-6-12L0-18L6-12M-6-12H6"/><path d="M6 12H16L12 3L7 6"/></>:
 motif==='palace'?<><path d="M-16 12V0H-7V-6H7V0H16V12M-11 0L0-8L11 0M-12-7Q-5-8 0-15Q5-8 12-7M-12-7L-14-10M12-7L14-10M-4-14H4M-4 12V4H4V12M-12 4V9M12 4V9M-8 9H8"/></>:
 <><path d="M-15 12V-2H15V12M-18-2L-8-11H9L18-2ZM-8-11V-15H-4V-11M-10 1H-4V6H-10ZM4 1H10V6H4ZM-2 12V5H2V12"/><path d="M-7-19Q-11-22-7-26M1-18Q-3-21 1-25M9-17Q5-20 9-24"/></>}
 </g>;
}

function Trees({color,variant=0}:{color:string;variant?:number}){
 return <g stroke="#263e46" strokeWidth="3"><path d="M-38 16V-28M23 23V-20" stroke="#acb59d" strokeWidth="6"/><ellipse cx="-38" cy="-32" rx={variant?29:23} ry="26" fill={color}/><ellipse cx="23" cy="-23" rx="24" ry="29" fill={color}/><path d="M-44-42L-34-30M15-30L26-20" stroke="#deebce" opacity=".45"/></g>;
}

function StreetBlock({districtId,variant,night}:{districtId:string;variant:number;night:boolean}){
 const s=districtScenes[districtId],window=night?'#e6c98b':'#324f64';
 // Mix ordinary neighborhood frontage with the district motif: a temple district
 // should still contain homes and shops rather than a temple in every hex.
 if(variant>0&&s.motif!=='tower'&&s.motif!=='office')return <g stroke="#263e4b" strokeWidth="3" strokeLinejoin="round" fill={s.wall}>
 {variant===1?<><path d="M-57-24H49V25L-4 42L-57 24Z"/><path d="M-63-24L-26-42H34L55-24Z" fill={s.roof}/><path d="M-62-3H54L48 9H-56Z" fill={s.accent}/>{[-45,-13,19].map(x=><g key={x}><path d={`M${x}-18H${x+17}V-7H${x}Z`} fill={window}/><path d={`M${x} 29V12Q${x+9} 1 ${x+18} 12V29Z`} fill="#354b59"/></g>)}<path d="M-62 39H52" stroke={s.accent} fill="none"/><g transform="translate(75,9) scale(.55)"><Trees color={s.plant}/></g></>:
 <><path d="M-59-16L-28-31L1-16V27L-29 40L-59 25Z"/><path d="M-28-31V40L1 27V-16Z" fill={s.roof}/><path d="M-13-40L20-55L53-40V13L20 27L-13 12Z"/><path d="M20-55V27L53 13V-40Z" fill={s.roof}/><path d="M-54 0L-34-10M-54 14L-34 4M-8-27L12-36M-8-12L12-21M-8 3L12-6M27-32L45-24M27-15L45-7" stroke={window} strokeWidth="6"/><path d="M-37-30V-43H-25V-31M24-53V-65H38V-48" fill={s.accent}/><path d="M-65 48L-25 55L43 33" stroke={s.accent} strokeWidth="4" fill="none"/></>}
 </g>;
 return <g stroke="#263e4b" strokeWidth="3" strokeLinejoin="round" fill={s.wall} transform={s.motif==='tower'||s.motif==='office'?`scale(${variant===1?.8:1} ${variant===2?.72:1})`:undefined}>
 {s.motif==='tower'||s.motif==='office'?<><path d={`M-48 22V${s.motif==='tower'?-83:-49}L-6 ${s.motif==='tower'?-102:-68}L32 ${s.motif==='tower'?-82:-49}V22L-6 40Z`}/><path d={`M-6 40V${s.motif==='tower'?-102:-68}L32 ${s.motif==='tower'?-82:-49}V22Z`} fill={s.roof}/>{[0,1,2,3].map(i=><path key={i} d={`M-40 ${-43+i*17}L-13 ${-56+i*17}M3 ${-55+i*17}L23 ${-45+i*17}`} stroke={window} strokeWidth="6"/>)}<path d="M-60 43L-5 57L47 30" fill="none" stroke={s.accent} strokeWidth="5"/>{s.motif==='office'&&<path d="M-40-45L23-45M-40-26L23-26" stroke={s.accent} opacity=".6"/>}</>:
 s.motif==='lantern'?<><path d="M-55-22H48V24L-4 42L-55 22Z"/><path d="M-62-20L-44-44H34L55-20Z" fill={s.roof}/>{[-44,-22,0,22].map((x,i)=><path key={x} d={`M${x}-39L${x-8}-19H${x+12}L${x+12}-39Z`} fill={i%2?s.accent:s.roof} strokeWidth="1"/>)}<path d="M-37 20V-11H-14V28M5 29V-11H28V20" fill={window}/><path d="M-58-50Q-5-65 52-50" fill="none" stroke={s.accent}/>{[-45,0,43].map(x=><g key={x}><path d={`M${x}-52V-39`} stroke={s.accent}/><ellipse cx={x} cy="-35" rx="6" ry="9" fill={s.roof}/></g>)}</>:
 s.motif==='arcade'?<><path d="M-58 28V-34H48V28L-4 42Z"/><path d="M-62-34L-28-57L-5-45L15-57L52-34Z" fill={s.roof}/>{[-45,-12,21].map(x=><path key={x} d={`M${x} 28V7Q${x+10}-10 ${x+20} 7V28Z`} fill="#3c4d58"/>)}<path d="M-47-25H-31V-11H-47ZM-11-25H5V-11H-11ZM24-25H39V-11H24Z" fill={window}/><path d="M-57-4H48" stroke={s.accent} strokeWidth="6"/></>:
 s.motif==='temple'||s.motif==='palace'?<><path d="M-46-12H42V28L0 40L-46 28Z"/><path d="M-63-13Q-36-10-25-30L0-42L24-30Q36-10 60-13L52-23M-63-13L-56-24" fill={s.roof}/><path d="M-32-39Q-10-41 0-59Q10-41 32-39L27-48M-32-39L-27-48" fill={s.roof}/><path d="M-30-9V22M29-9V22" stroke={s.motif==='temple'?'#b67b71':s.accent} strokeWidth="8"/><path d="M-12 32V0H12V32" fill={window}/><path d="M-43 42H44M-35 49H36" stroke={s.accent} fill="none"/>{s.motif==='temple'&&<><ellipse cx="-48" cy="6" rx="7" ry="11" fill="#b77f72"/><ellipse cx="47" cy="6" rx="7" ry="11" fill="#b77f72"/></>}</>:
 s.motif==='spring'?<><path d="M-52-15H47V28L0 42L-52 28Z"/><path d="M-61-16L-29-44H26L56-16Z" fill={s.roof}/><path d="M-32-41V-62H-19V-41" fill={s.wall}/>{[-37,-6,25].map(x=><path key={x} d={`M${x} 17V-1Q${x+8}-12 ${x+16}-1V17Z`} fill={window}/>)}<path d="M-51 25H46" stroke={s.accent}/><path d="M-12-56Q-26-70-13-85M9-51Q-4-65 9-80M30-47Q17-61 30-76" stroke={s.accent} opacity={night?.8:.55} fill="none" strokeWidth="5"/></>:
 s.motif==='music'?<><path d="M-58 30V-9L-30-53L-1-26L29-48L56 8V30Z"/><path d="M-58-9L-6 7L-30-53M-6 7L29-48L56 8ZM-6 7V30" fill={s.roof}/><path d="M-43 20L-24-8L-10 22M11 20L30-11L45 20" stroke={s.accent} fill="none" strokeWidth="5"/><path d="M-58 39H56M-48 48H48" stroke="#90a7b9" fill="none"/></>:
 s.motif==='gallery'?<><path d="M-55-8L-13-26L29-8V29L-13 45L-55 28Z"/><path d="M-13 45V-26L29-8V29Z" fill={s.roof}/><path d="M-22-25V-52L17-68L52-52V-24L14-8Z" fill={s.wall}/><path d="M17-68V-40L52-24V-52Z" fill={s.roof}/><path d="M-44 0L-24-8V12L-44 20ZM28-41L43-35V-25L28-31Z" fill={window}/><path d="M-66 39L-52 54L-39 42L-52 29Z" fill={s.accent}/></>:
 s.motif==='civic'?<><path d="M-55-16H52V29H-55Z"/><path d="M-63-17L0-47L61-17Z" fill={s.roof}/>{[-44,-22,0,22,44].map(x=><path key={x} d={`M${x}-12V27`} stroke={s.accent} strokeWidth="8"/>)}<path d="M-60 31H58M-66 40H64" stroke={s.accent} fill="none" strokeWidth="7"/></>:
 s.motif==='tea'?<><path d="M-65 28Q-30 9 63 10M-65 44Q-30 25 63 26M-58 58Q-20 43 55 42" stroke={s.plant} strokeWidth="10" fill="none"/><path d="M-30-6H31V22H-30Z"/><path d="M-45-5L0-39L46-5Z" fill={s.roof}/><path d="M-15 21V1H14V21" fill={window}/><path d="M42-29Q18-50 48-66Q64-44 42-29Z" fill={s.plant}/></>:
 <><path d="M-42-8H32V28L-4 40L-42 25Z"/><path d="M-49-9L-12-32L40-9Z" fill={s.roof}/><path d="M-29 0H-12V14H-29ZM3 0H21V14H3Z" fill={window}/><g transform="translate(40,-30) scale(.65)"><Trees color={s.plant} variant={variant}/></g><path d="M-54 43Q-5 27 54 44" fill="none" stroke={s.accent} strokeWidth="5"/></>}
 </g>;
}

export const DistrictStreets=memo(function DistrictStreets({visible,night,nodeCells,radius=190}:{visible:Cell[];night:boolean;nodeCells:Set<string>;radius?:number}){
 return <g className={`district-streets ${night?'streets-night':''}`} pointerEvents="none" aria-hidden="true">

 {visible.filter(c=>c.terrain!=='water').map(c=>{const s=districtScenes[c.districtId],v=streetVariant(c);return <g key={c.id} data-street-cell={c.id} data-street-motif={s.motif} transform={`translate(${c.x},${c.y}) scale(${radius/190})`}>
 {nodeCells.has(c.id)?<g fill="none" stroke={s.accent} strokeOpacity=".28" strokeWidth="4"><path d="M-125 90H125M-104 113H104M-82 136H82"/></g>:
 c.terrain==='park'?<g transform="translate(-7,-12)"><Trees color={s.plant} variant={v}/><path d="M-63 42Q0 12 62 42" fill="none" stroke={s.accent} strokeWidth="7" opacity=".65"/>{v===1&&<path d="M-8 27H22M-4 24V18M18 24V18" stroke="#c2b59c" strokeWidth="5"/>}</g>:
 c.terrain==='slope'?<g fill="none"><path d="M-120 65Q-65-20-12 11T105-65M-104 91Q-47 3 5 35T122-40M-82 113Q-34 35 23 60T130-14" stroke={s.plant} strokeOpacity=".48" strokeWidth="7"/><g transform="translate(-22,-17) scale(.75)"><Trees color={s.plant}/></g>{(s.motif==='tea'||s.motif==='spring')&&<path d="M-87 72Q-22 38 64 64" stroke={s.accent} opacity=".7" strokeWidth="5"/>}</g>:
 <g opacity={night?.76:.84} transform={`translate(${v===1?10:-6},${v===2?22:14})`}><StreetBlock districtId={c.districtId} variant={v} night={night}/>{v===0&&<g transform="translate(85,50) scale(.45)"><Trees color={s.plant}/></g>}</g>}
 </g>;})}
 </g>;
});

export function DistrictSceneCard({districtId}:{districtId:string}){
 const {t}=useTranslation(),s=districtScenes[districtId];
 return <section className="district-scene-card" aria-label={t('c_sceneCard')} style={{'--scene-accent':s.accent} as React.CSSProperties}>
 <div className="scene-illustration" aria-hidden="true"><svg viewBox="-67 -55 134 100"><g transform="translate(0,17)" color={s.accent}><path d="M-62 20H62M-49 27H49" fill="none" stroke="currentColor" opacity=".25"/><g transform="translate(-43,6) scale(.55)"><Trees color={s.plant}/></g><g transform="scale(1.55)"><DistrictLandmark districtId={districtId}/></g><g transform="translate(47,8) scale(.45)"><Trees color={s.plant}/></g></g></svg></div>
 <div><span className="scene-eyebrow">{t('c_sceneEdition',{number:String((Number(districtId)-6300000)/100).padStart(2,'0')})}</span><h3>{t(`c_sceneTitle_${districtId}`)}</h3><p>{t(`c_sceneBody_${districtId}`)}</p><small>{t('c_sceneSchematic')}</small></div>
 </section>;
}

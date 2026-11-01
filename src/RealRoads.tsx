import { memo,useEffect,useMemo,useState } from 'react';
import { useTranslation } from 'react-i18next';
import { roadsInHex,labelRoads,roadGroups,roadMatches,roadName,roadPath } from './road-map.ts';
import type { Road,RoadData,RoadFilter,MapBounds } from './road-map.ts';
import { allCells } from './game/campaign-map.ts';
const keyOf=(r:Road)=>r.name['zh-TW']||r.name.en||r.ref;
export const RealRoadLayer=memo(function RealRoadLayer({roads,bounds,pixels,names,selected,avoid,avoidRadius=170}:{roads:Road[];bounds:MapBounds;pixels:number;names:boolean;selected:string|null;avoid:number[][];avoidRadius?:number}){
 const {i18n}=useTranslation();
 const paths=useMemo(()=>{const groups=new Map<string,{d:string;kind:string;tunnel:boolean;bridge:boolean}>();for(const r of roads){const key=`${r.class}-${r.tunnel}-${r.bridge}`,old=groups.get(key),d=roadPath(r);if(old)old.d+=d;else groups.set(key,{d,kind:r.class,tunnel:r.tunnel!=='no',bridge:r.bridge!=='no'});}return [...groups.values()];},[roads]);
 const labels=names?labelRoads(roads,bounds,pixels,avoid,i18n.language,avoidRadius):{labels:[],font:0};
 const highlights=selected?roads.filter(r=>keyOf(r)===selected):[];
 return <g className="real-road-layer" data-visible-road-count={roads.length} pointerEvents="none" aria-hidden="true">
 {paths.map((p,i)=><g key={i} className={`road-lines road-${p.kind} ${p.tunnel?'road-tunnel':''} ${p.bridge?'road-bridge':''}`} data-road-kind={p.kind}><path className="road-casing" d={p.d}/><path className="road-stroke" d={p.d}/></g>)}
 {highlights.length>0&&<path className="road-highlight" data-highlighted-road={selected!} d={highlights.map(roadPath).join('')}/>}
 {labels.labels.map(l=>{const name=roadName(l.road,i18n.language);return <g key={l.road.id} className="real-road-name" data-road-label={l.road.id} transform={`translate(${l.x},${l.y})`}><rect x={-l.width/2-4*bounds.width/Math.max(pixels,1)} y={-l.height/2} width={l.width+8*bounds.width/Math.max(pixels,1)} height={l.height} rx={3*bounds.width/Math.max(pixels,1)}/><text textAnchor="middle" dominantBaseline="central" fontSize={labels.font}>{name.length>16?name.slice(0,16)+'…':name}</text></g>;})}
 </g>;
});

export function RoadConsole({data,error,retry,districtId,filter,onFilter,shown,onShown,names,onNames,onLocate,selected,cellId,radius}:{data:RoadData|null;error:boolean;retry:()=>void;districtId:string;filter:RoadFilter;onFilter:(v:RoadFilter)=>void;shown:boolean;onShown:()=>void;names:boolean;onNames:()=>void;onLocate:(key:string,roads:Road[])=>void;selected:string|null;cellId:string;radius:number}){
 const {t,i18n}=useTranslation(),[query,setQuery]=useState('');
 useEffect(()=>setQuery(''),[districtId]);
 const local=useMemo(()=>data?.roads.filter(r=>r.districtIds.includes(districtId))??[],[data,districtId]);
 const groups=useMemo(()=>roadGroups(local.filter(r=>roadMatches(r,filter)),i18n.language,query),[local,filter,i18n.language,query]);
 const current=useMemo(()=>data?roadGroups(roadsInHex(data,allCells.get(cellId)!,radius),i18n.language):[],[data,cellId,radius,i18n.language]);
 return <section className="real-road-console" aria-label={t('c_realRoadControls')}>
 <div className="road-console-heading"><strong>{t('c_realRoads')}</strong></div>
 {!data?<p role="status">{t(error?'c_roadsLoadFailed':'c_roadsLoading')}{error&&<button className="outline-button" onClick={retry}>{t('c_roadsRetry')}</button>}</p>:<>
 <div className="road-toggles"><button aria-pressed={shown} onClick={onShown}>{t('c_showRealRoads')}</button><button aria-pressed={names} disabled={!shown} onClick={onNames}>{t('c_showRoadNames')}</button><label>{t('c_roadFilter')}<select aria-label={t('c_roadFilter')} value={filter} onChange={e=>onFilter(e.target.value as RoadFilter)}>{(['all','arterial','local','path'] as const).map(f=><option value={f} key={f}>{t(`c_roadsFilter_${f}`)}</option>)}</select></label></div>

 <details key={districtId} className="road-search"><summary>{t('c_searchDistrictRoads',{count:groups.length})}</summary><label>{t('c_roadQuery')}<input value={query} placeholder={t('c_roadQueryPlaceholder')} onChange={e=>setQuery(e.target.value)} aria-label={t('c_roadQuery')}/></label>
 <ul>{groups.slice(0,12).map(group=><li key={group.key}><button aria-pressed={selected===group.key} onClick={()=>{onLocate(group.key,group.roads);if(!shown)onShown();}}><strong>{group.name}</strong><span>{t('c_roadSegments',{count:group.roads.length})} · {t(`c_roadClass_${group.roads[0].class}`)}</span></button></li>)}</ul>{!groups.length&&<p>{t('c_noRoadResults')}</p>}{groups.length>12&&<p>{t('c_roadResultsLimited')}</p>}
 </details>
 <details className="road-cell-inspector"><summary>{t('c_roadsInHex',{count:current.length})}</summary><div>{current.slice(0,8).map(group=><button key={group.key} onClick={()=>{onLocate(group.key,group.roads);if(!shown)onShown();}}>{group.name}</button>)}</div>{!current.length&&<p>{t('c_noNamedRoadsInHex')}</p>}</details>
 <div className="real-road-legend"><span className="road-legend-line">{t('c_roadClass_arterial')}</span><span className="road-legend-line road-legend-small">{t('c_roadClass_alley')}</span><span className="road-legend-line road-legend-path">{t('c_roadClass_path')}</span><span className="road-legend-line road-legend-express">{t('c_roadClass_express')}</span><span className="road-legend-line road-legend-selection">{t('c_locatedRoad')}</span></div>
 </>}
 </section>;
}

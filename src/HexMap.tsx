import { useEffect, useMemo, useRef, useState } from 'react';
import { Application, Graphics } from 'pixi.js';
import { useTranslation } from 'react-i18next';
import { useCampaign } from './game/campaign-store.ts';
import { campaignMap, cells, districts, nodes, wonders, polygonPoints, ringsPath } from './game/campaign-map.ts';
import { movement, unitAvailable, route } from './game/campaign.ts';
import { Landmark } from './CampaignMaps.tsx';
import { campaignPalette,factionColors } from './campaign-palette.ts';
const terrainColor:Record<string,number>=campaignPalette.terrain;
export default function HexMap({nodeId,onNode,planned,onPlan}:{nodeId:string;onNode:(id:string)=>void;planned:string|null;onPlan:(id:string|null)=>void}){
 const {t,i18n}=useTranslation();const lang=i18n.language==='en'?'en':'zh-TW';const {game,selected,districtId,select}=useCampaign();
 const [zoom,setZoom]=useState(1);const [pan,setPan]=useState<[number,number]>([0,0]);const d=districts.find(d=>d.id===districtId)!;const u=game.units.find(u=>u.id===selected)!;
 const anchor=cells.get(d.anchor)!;const center=cells.get(u.cellId)!.districtId===d.id?cells.get(u.cellId)!:anchor;
 useEffect(()=>{setPan([0,0]);setZoom(1);},[districtId]);
 const width=3400/zoom,height=width*.72;const cx=center.x+pan[0],cy=center.y+pan[1];const bounds={x:cx-width/2,y:cy-height/2,width,height};
 const visible=useMemo(()=>campaignMap.cells.filter(c=>c.x>bounds.x-220&&c.x<bounds.x+width+220&&c.y>bounds.y-220&&c.y<bounds.y+height+220),[bounds.x,bounds.y,width,height]);
 const reachable=useMemo(()=>movement(game,u).costs,[game,u]);const path=planned?route(game,u,planned):null;
 const host=useRef<HTMLDivElement>(null);const [app,setApp]=useState<Application|null>(null);const [failed,setFailed]=useState(false);
 useEffect(()=>{const a=new Application();let disposed=false;void a.init({width:1000,height:720,backgroundAlpha:0,antialias:true,autoStart:false,preference:'webgl',resolution:Math.min(devicePixelRatio||1,2),autoDensity:true}).then(()=>{if(disposed){a.destroy(true,{children:true});return;}host.current?.appendChild(a.canvas);setApp(a);}).catch(()=>{if(!disposed)setFailed(true);});return()=>{disposed=true;if(a.renderer)a.destroy(true,{children:true});};},[]);
 useEffect(()=>{if(!app)return;app.stage.removeChildren().forEach(c=>c.destroy({children:true}));const g=new Graphics();app.stage.addChild(g);const scale=1000/width;const px=(x:number)=>(x-bounds.x)*scale,py=(y:number)=>(y-bounds.y)*scale;
  for(const c of visible){const points=polygonPoints(c,campaignMap.radiusMetres-6).flatMap(p=>[px(p[0]),py(p[1])]);g.poly(points).fill(terrainColor[c.terrain]??0x273749).stroke({color:0x8cadd9,alpha:.3,width:1});const x=px(c.x),y=py(c.y);
   if(c.terrain==='park'){for(const [dx,dy] of [[-9,4],[5,-5],[12,7]]){g.circle(x+dx,y+dy,5).fill(0x7c9c6d);g.moveTo(x+dx,y+dy+2).lineTo(x+dx,y+dy+8).stroke({color:0xa6ad7f,width:1});}}
   if(c.terrain==='slope')g.poly([x-14,y+9,x-2,y-10,x+8,y+9,x+15,y-4,x+23,y+9]).stroke({color:0xa9ae7f,width:2});
   if(c.terrain==='urban'||c.terrain==='lane'){const shift=Math.abs(c.q+c.r)%3;const theme=districts.find(d=>d.id===c.districtId)!.theme;
    if(theme==='skyline'){g.rect(x-13,y-18,10,25).fill(0x829c98);g.rect(x+2,y-28,11,35).fill(0x647e7b);for(let row=0;row<4;row++)g.rect(x+5,y-23+row*6,5,2).fill(0xffd34e);}
    else if(theme==='market'||theme==='river'||theme==='temple'){g.rect(x-16,y-5,30,15).fill(0x817961);for(let i=0;i<5;i++)g.rect(x-16+i*6,y-9,6,8).fill(i%2?0xcbbd8b:0xa56a4b);}
    else if(theme==='spring'){g.rect(x-16,y-4,29,16).fill(0x9b6e56);g.poly([x-20,y-4,x-1,y-16,x+18,y-4]).fill(0x6d806d);g.rect(x-5,y+2,8,10).fill(0xc5c3a0);}
    else if(theme==='civic'||theme==='culture'||theme==='arts'){g.rect(x-16,y-4,32,15).fill(0x8298b7);g.poly([x-19,y-5,x,y-16,x+19,y-5]).fill(0xc5d6ed);for(let i=0;i<4;i++)g.rect(x-12+i*8,y-3,3,13).fill(0xe0ebfa);}
    else{g.rect(x-14,y-8,10+shift*3,15).fill(0x627c9e);g.rect(x+3,y-13,10,20).fill(0x486380);}g.moveTo(x-17,y+16).lineTo(x+18,y+16).stroke({color:0x92abd0,alpha:.5,width:1});}
  }app.render();
 },[app,visible,width,bounds.x,bounds.y]);
 return <div className={`hex-map theme-${d.theme} ${failed?'no-canvas':''}`}>
 <div className="hex-controls"><button onClick={()=>setZoom(z=>Math.min(2,z+.25))} aria-label={t('c_zoomIn')}>＋</button><button onClick={()=>setZoom(z=>Math.max(.5,z-.25))} aria-label={t('c_zoomOut')}>−</button><button onClick={()=>{setPan([0,0]);setZoom(1);}}>{t('c_center')}</button><span>{t('c_hexScale',{metres:campaignMap.radiusMetres*2})}</span></div>
 <div className="hex-surface"><div ref={host} className="hex-canvas" aria-hidden="true"/><svg viewBox={`${bounds.x} ${bounds.y} ${width} ${height}`} role="group" aria-label={t('c_hexMap',{district:d.name[lang]})}>
 <g className="hex-hit-cells">{visible.map(c=>{const occupant=game.units.find(v=>v.cellId===c.id&&unitAvailable(game,v));return <polygon key={c.id} points={polygonPoints(c,campaignMap.radiusMetres-6).map(p=>p.join(',')).join(' ')} className={`hex-cell terrain-${c.terrain} ${reachable.has(c.id)?'reachable':''} ${planned===c.id?'planned':''}`} role="button" tabIndex={reachable.has(c.id)?0:-1} aria-label={t('c_hexCell',{q:c.q,r:c.r,terrain:t(`c_terrain_${c.terrain}`),cost:reachable.get(c.id)??'—'})} onClick={()=>{if(occupant?.team===game.playerTeam)select(occupant.id);else onPlan(c.id);}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();if(occupant?.team===game.playerTeam)select(occupant.id);else onPlan(c.id);}}}/>;})}</g>
 <g pointerEvents="none" fill="#326d94" opacity=".8">{campaignMap.rivers.map((r,i)=><path key={i} d={ringsPath([r])}/>)}</g>
 <g pointerEvents="none" stroke="#c6dcff" strokeWidth="35" strokeLinecap="round">{campaignMap.bridges.map(b=><path key={b.id} d={`M${b.points[0]}L${b.points[1]}`}/>)}</g>
 <path d={ringsPath(d.rings)} fill="none" stroke="#ffdb73" strokeWidth="22" strokeDasharray="45 30" pointerEvents="none"/>
 {path&&<polyline points={path.path.map(id=>{const c=cells.get(id)!;return `${c.x},${c.y}`;}).join(' ')} stroke="#ffd34e" fill="none" strokeWidth="24" strokeDasharray="25 20" pointerEvents="none"/>}
 {nodes.filter(n=>{const c=cells.get(n.cellId)!;return c.x>bounds.x-200&&c.x<bounds.x+width+200&&c.y>bounds.y-200&&c.y<bounds.y+height+200;}).map(n=>{const c=cells.get(n.cellId)!;const w=wonders.find(w=>w.id===n.wonderId);const stage=game.stages.find(s=>s.nodeId===n.id);const name=w?w.name[lang]:t(`c_node_${n.kind}`);return <g key={n.id} className={`hex-node ${n.id===nodeId?'active':''}`} transform={`translate(${c.x},${c.y})`} role="button" tabIndex={0} aria-label={name} aria-pressed={n.id===nodeId} onClick={()=>{onNode(n.id);onPlan(null);}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onNode(n.id);onPlan(null);}}}>
 <circle r="125" fill={stage?(stage.brand==='island'?campaignPalette.stages.island:campaignPalette.stages.soapbox):n.kind==='wonder'?'#ffd34e':'#ecf3ff'} stroke={stage?(stage.brand==='island'?campaignPalette.stages.islandTrim:campaignPalette.stages.soapboxTrim):'#25436a'} strokeWidth="15"/>
 <g transform="scale(6)" color="#1b365e">{n.kind==='wonder'?<Landmark theme={districts.find(d=>d.id===n.districtId)!.theme}/>:<><path d={n.kind==='venue'?'M-11 8V-5H11V8M-13 8H13M-7-5L0-13L7-5':n.kind==='market'?'M-11 9V-2H11V9M-13-2L-8-10H8L13-2ZM-4 9V2H4V9':n.kind==='transit'?'M-8 7V-9H8V7ZM-7-3H7M-5 7L-8 12M5 7L8 12':'M-11 9V-2L0-11L11-2V9M-4 9V2H4V9'} fill="none" stroke="currentColor" strokeWidth="2"/></>}</g>
 {n.id===nodeId&&<text textAnchor="middle" y="225" className="node-map-label">{t(`c_node_${n.kind}`)}</text>}{stage&&<text textAnchor="middle" y="100" x="0" fontSize="65" fill="#fff" stroke="#163054" strokeWidth="5" paintOrder="stroke">{t(`c_flag_${stage.team}`)}</text>}</g>;})}
 {game.talkZones.filter(z=>z.untilDay>=game.day).map((z,i)=>{const c=cells.get(z.cellId)!;return <g key={`${z.cellId}-${i}`} pointerEvents="none"><circle cx={c.x} cy={c.y} r="510" fill="#c7acff" fillOpacity=".12" stroke="#d3b7ff" strokeWidth="13" strokeDasharray="32 20"/><text x={c.x} y={c.y-520} textAnchor="middle" fontSize="95" fill="#e4d4ff">{t('c_ceasefire')}</text></g>;})}
 {game.surges.filter(s=>s.day===game.day).map((s,i)=>{const c=cells.get(s.cellId)!;return <circle key={`surge-${i}`} cx={c.x} cy={c.y} r="270" fill="none" stroke={factionColors[s.team]} strokeWidth="20" strokeDasharray="20 18" pointerEvents="none"/>;})}
 {game.units.filter(v=>unitAvailable(game,v)).map(v=>{const c=cells.get(v.cellId)!;return <g key={v.id} transform={`translate(${c.x+95},${c.y-100})`} className="map-unit" role="button" tabIndex={0} aria-label={t('c_unitMap',{team:t(v.team),role:t(`c_role_${v.role}`),ap:v.ap})} onClick={()=>v.team===game.playerTeam?select(v.id):onPlan(v.cellId)} onKeyDown={e=>{if(e.key==='Enter'){if(v.team===game.playerTeam)select(v.id);else onPlan(v.cellId);}}}><circle r="83" fill={factionColors[v.team]} stroke={v.id===selected?campaignPalette.yellow:'#d9e8ff'} strokeWidth={v.id===selected?'20':'12'}/><g className="map-facing" transform={`rotate(${-60*v.facing})`}><path d="M99 0L143 0L120-23M143 0L120 23" stroke="#fff" strokeWidth="14" fill="none"/></g><text textAnchor="middle" y="26" fill={v.team==='blue'?'#fff':campaignPalette.ink} fontSize="82" fontWeight="800">{t(`c_mark_${v.role}`)}</text></g>;})}
 </svg></div>
 <div className="pan-controls"><button aria-label={t('c_panWest')} onClick={()=>setPan(p=>[p[0]-width*.4,p[1]])}>←</button><button aria-label={t('c_panNorth')} onClick={()=>setPan(p=>[p[0],p[1]-height*.4])}>↑</button><span>{t('c_hexHint')}</span><button aria-label={t('c_panSouth')} onClick={()=>setPan(p=>[p[0],p[1]+height*.4])}>↓</button><button aria-label={t('c_panEast')} onClick={()=>setPan(p=>[p[0]+width*.4,p[1]])}>→</button></div>
 {failed&&<p role="status" className="canvas-note">{t('c_canvasFallback')}</p>}
 </div>;
}

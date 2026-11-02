import type {Campaign} from './campaign.ts';
import type {Team} from './campaign-teams.ts';
import {teams,teamRecord} from './campaign-teams.ts';
import {allCells,mapFor,streetCellMap,districts} from './campaign-map.ts';
import type {Cell} from './campaign-map.ts';

export type OutreachLedger={cells:Record<string,{day:number;count:number}>;sectors:Record<string,{day:number;heat:number}>;seenSectors:string[];districts:string[];partial:boolean};
export type Outreach=Record<Team,OutreachLedger>;
export const outreachPolicy=Object.freeze({sectorMetres:600,perCellPerDay:2,newSector:2,newDistrict:4,heatCap:6,heatPenalty:2,recoveryDays:2});
export const sectorKey=(c:Cell)=>`${c.districtId}:${Math.floor(c.x/outreachPolicy.sectorMetres)},${Math.floor(c.y/outreachPolicy.sectorMetres)}`;
export function initialOutreach(g?:Campaign):Outreach{return teamRecord(team=>{
 const active=g?.movementProfile==='streets-v2',known=new Set(active?g.trail?.[team].completedNodes??[]:[]),counts:OutreachLedger['cells']={};
 if(active)for(const n of mapFor(g).nodes){const state=g.nodeState[n.id];if(!state)continue;if(state.influence[team]>0||state.visits[team]>0)known.add(n.id);if(state.visits[team]>0)counts[n.cellId]={day:g.day,count:Math.min(2,(counts[n.cellId]?.count??0)+state.visits[team])};}
 const visited=active?[...known].map(id=>mapFor(g).nodeById.get(id)).filter(n=>!!n).map(n=>allCells.get(n!.cellId)!):[];
 return {cells:counts,sectors:{},seenSectors:[...new Set(visited.map(sectorKey))],districts:[...new Set(visited.map(c=>c.districtId))],partial:!!g};
});}
export function outreachQuote(g:Campaign,team:Team,cellId:string,base?:number){
 const c=allCells.get(cellId)!,ledger=(g.outreach??initialOutreach(g))[team],sector=sectorKey(c),entry=ledger.sectors[sector];
 const active=g.movementProfile==='streets-v2',heat=active&&entry?Math.max(0,entry.heat-Math.floor((g.day-entry.day)/outreachPolicy.recoveryDays)):0;
 const count=active&&ledger.cells[cellId]?.day===g.day?ledger.cells[cellId].count:0;
 const freshSector=active&&!ledger.seenSectors.includes(sector),freshDistrict=active&&!ledger.districts.includes(c.districtId);
 const reward=base??(count?4:8);
 return {cellId,sector,count,heat,freshSector,freshDistrict,band:freshSector?'fresh':heat>=3?'saturated':'familiar',points:active?Math.max(1,reward+(freshSector?outreachPolicy.newSector:0)+(freshDistrict?outreachPolicy.newDistrict:0)-heat*outreachPolicy.heatPenalty):reward};
}
export function touchOutreach(g:Campaign,team:Team,cellId:string,base:number){
 const quote=outreachQuote(g,team,cellId,base);if(g.movementProfile!=='streets-v2')return base;
 const state=g.outreach??initialOutreach(g),ledger=state[team],district=allCells.get(cellId)!.districtId;
 g.outreach={...state,[team]:{...ledger,cells:{...ledger.cells,[cellId]:{day:g.day,count:quote.count+1}},sectors:{...ledger.sectors,[quote.sector]:{day:g.day,heat:Math.min(outreachPolicy.heatCap,quote.heat+1)}},seenSectors:quote.freshSector?[...ledger.seenSectors,quote.sector]:ledger.seenSectors,districts:quote.freshDistrict?[...ledger.districts,district]:ledger.districts}};
 return quote.points;
}
const validSectors=new Set([...streetCellMap.values()].filter(c=>c.walkable).map(sectorKey));
const object=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const unique=(v:unknown,set:Set<string>)=>Array.isArray(v)&&v.length<=set.size&&new Set(v).size===v.length&&v.every(id=>typeof id==='string'&&set.has(id));
export function validOutreach(value:unknown,g:Campaign){
 if(!object(value)||Object.keys(value).length!==3)return false;
 return teams.every(team=>{const l=value[team];if(!object(l)||Object.keys(l).length!==5||!object(l.cells)||!object(l.sectors)||typeof l.partial!=='boolean'||!unique(l.seenSectors,validSectors)||!unique(l.districts,new Set(districts.map(d=>d.id))))return false;
  if(Object.keys(l.cells).length>streetCellMap.size||Object.keys(l.sectors).length>validSectors.size||!l.seenSectors.every((id:string)=>l.districts.includes(id.split(':')[0])))return false;
  const day=(d:unknown)=>Number.isInteger(d)&&Number(d)>=1&&Number(d)<=g.day;
  return Object.entries(l.cells).every(([id,v])=>object(v)&&Object.keys(v).length===2&&streetCellMap.get(id)?.walkable&&day(v.day)&&Number.isInteger(v.count)&&v.count>=1&&v.count<=2&&l.seenSectors.includes(sectorKey(streetCellMap.get(id)!)))&&Object.entries(l.sectors).every(([id,v])=>validSectors.has(id)&&object(v)&&Object.keys(v).length===2&&day(v.day)&&Number.isInteger(v.heat)&&v.heat>=1&&v.heat<=6&&l.seenSectors.includes(id));
 });
}

/** Reconstruct exposure from an authenticated graph and the recorded ordered actions. */
import type {Campaign,Team} from './campaign.ts';
import type {VehicleFactionState,FootHeat} from './campaign-vehicle-state.ts';
import type {VehicleGraphColumns} from './vehicle-graph-format.ts';
import type {CoverageDistrict} from './vehicle-geometry.ts';
import type {VehicleLegPlan} from './vehicle-leg-planner.ts';
import {allCells as streetCellMap,mapFor} from './campaign-map.ts';
import {sectorKey} from './campaign-outreach.ts';
import {vehicleRouteFragments} from './vehicle-geometry.ts';
import {newMotorcadeLedger,motorcadeLedgerForDay,applyMotorcadeExposure,creditMotorcadeContacts} from './campaign-motorcade.ts';

const object=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const stable=(v:any):string=>JSON.stringify(v,(_k,x)=>object(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x);
const keys=(v:Record<string,unknown>,expected:string[])=>stable(Object.keys(v).sort())===stable(expected.sort());


/** Proves internal consistency, not the authenticity of old pre-migration actions or weather. */
export function replayVehicleExposure(game:Campaign,team:Team,state:VehicleFactionState,graph:VehicleGraphColumns,districts:readonly CoverageDistrict[]){
 try{
  const cells=mapFor(game).cells,validSectors=new Set([...cells.values()].filter(c=>c.walkable).map(sectorKey));
  const activation=game.vehicle?.activationDay,history=state.history;
  if(!activation||!object(history)||!keys(history,['baseline','events'])||!object(history.baseline)||!Array.isArray(history.events)||history.events.length>100000)return false;
  const foot:FootHeat=structuredClone(history.baseline);
  for(const [sector,entry] of Object.entries(foot))if(!validSectors.has(sector)||!object(entry)||!keys(entry,['day','heat'])||
   !Number.isInteger(entry.day)||entry.day<1||entry.day>=activation||!Number.isInteger(entry.heat)||entry.heat<1||entry.heat>6)return false;
  let exposure=newMotorcadeLedger(activation,team),last=activation*2,previousJourney=-1;const seen=new Set<number>();
  for(const event of history.events){
   if(!object(event)||!Number.isInteger(event.day)||event.day<activation||event.day>game.day||!['day','night'].includes(event.phase))return false;
   const time=event.day*2+(event.phase==='night'?1:0);if(time<last||event.day===game.day&&game.phase==='day'&&event.phase==='night')return false;last=time;
   exposure=motorcadeLedgerForDay(exposure,event.day);
   if(event.kind==='foot'){
    if(!keys(event,['kind','day','phase','cellId'])||typeof event.cellId!=='string')return false;
    const cell=cells.get(event.cellId);if(!cell?.walkable)return false;
    const sector=sectorKey(cell),old=foot[sector],heat=old?Math.max(0,old.heat-Math.floor((event.day-old.day)/2)):0;
    foot[sector]={day:event.day,heat:Math.min(6,heat+1)};
   }else if(event.kind==='motorcade'){
    if(!keys(event,['kind','day','phase','journey'])||!Number.isInteger(event.journey)||event.journey<=previousJourney)return false;
    previousJourney=event.journey;const trip=state.journal.journeys[event.journey];
    if(!trip||trip.mode!=='motorcade'||trip.day!==event.day||trip.phase!==event.phase)return false;seen.add(event.journey);
    let node=trip.carStart;const nodes=[node];for(const edge of trip.carEdges){
     if(edge<graph.offsets[node]||edge>=graph.offsets[node+1])return false;node=graph.targets[edge];nodes.push(node);
    }
    const fragments=vehicleRouteFragments(graph,{nodeIndices:nodes,edgeIndices:trip.carEdges} as VehicleLegPlan,districts);
    const result=applyMotorcadeExposure(exposure,fragments,sector=>{const e=foot[sector];return e?Math.max(0,e.heat-Math.floor((event.day-e.day)/2)):0;});
    exposure=creditMotorcadeContacts(result.ledger,trip.unitId,result.newlyReached).ledger;
   }else return false;
  }
  if(state.journal.journeys.some((j,i)=>j.mode==='motorcade'&&!seen.has(i)))return false;
  exposure=motorcadeLedgerForDay(exposure,game.day);
  return stable(exposure)===stable(state.exposure)&&stable(foot)===stable(game.outreach?.[team].sectors??{});
 }catch{return false;}
}

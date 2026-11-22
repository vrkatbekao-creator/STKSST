/** AI candidate ranking prototype; not yet connected to automatedFactionTurn. */
import type {Campaign,CampaignUnit} from './campaign.ts';
import {actionCost} from './campaign.ts';
import {mapFor} from './campaign-map.ts';
import {outreachQuote,outreachPolicy} from './campaign-outreach.ts';
import {unitAvailable,unitGuarded} from './campaign-tactics.ts';

export type AiDriveQuote={totalAp:number;materials:number};
export type AiDriveChoice={nodeId:string;cellId:string;totalAp:number;materials:number;score:number};

/** Preview is the same authoritative planner intended for the player; no free AI transport. */
export function chooseAiVehicleStop(g:Campaign,u:CampaignUnit,
 preview:(destinationCell:string,reserve:{ap:number;materials:number})=>AiDriveQuote|null,maxCandidates=3):AiDriveChoice|null{
 const actor=g.units.find(v=>v.id===u.id&&v.team===u.team);
 if(!actor||g.result||g.talk||g.movementProfile!=='streets-v2'||!unitAvailable(g,actor)||unitGuarded(g,actor)||actor.bracedUntil>=g.day||
  !Number.isInteger(maxCandidates)||maxCandidates<1||maxCandidates>10)return null;
 const fee=actionCost(g,{type:'canvass',unitId:u.id},u.team);if(actor.ap<fee.ap||g.resources[actor.team].materials<fee.materials)return null;
 const candidates=mapFor(g).nodes.filter(n=>n.sourcePlace&&n.cellId!==actor.cellId&&g.nodeState[n.id]?.visits[actor.team]<2)
  .map(node=>({node,quote:outreachQuote(g,actor.team,node.cellId)}))
  .filter(x=>x.quote.count<outreachPolicy.perCellPerDay)
  .sort((a,b)=>Number(b.quote.freshDistrict)-Number(a.quote.freshDistrict)||Number(b.quote.freshSector)-Number(a.quote.freshSector)||
   a.quote.heat-b.quote.heat||a.node.id.localeCompare(b.node.id)).slice(0,maxCandidates);
 let best:AiDriveChoice|null=null;
 for(const {node,quote} of candidates){const plan=preview(node.cellId,fee);if(!plan||!Number.isSafeInteger(plan.totalAp)||plan.totalAp<0||
   !Number.isSafeInteger(plan.materials)||plan.materials<0||plan.totalAp+fee.ap>actor.ap||plan.materials+fee.materials>g.resources[actor.team].materials)continue;
  const choice={nodeId:node.id,cellId:node.cellId,totalAp:plan.totalAp+fee.ap,materials:plan.materials+fee.materials,score:quote.points/(plan.totalAp+fee.ap)};
  if(!best||choice.score>best.score||choice.score===best.score&&choice.nodeId.localeCompare(best.nodeId)<0)best=choice;
 }
 return best;
}

import type { Campaign,CampaignUnit } from './campaign.ts';
import { interactionCost,interactionCells,movement,routeFromMovement,unitAvailable,unitGuarded } from './campaign.ts';
import { mapFor,playableNode } from './campaign-map.ts';
import {outreachQuote} from './campaign-outreach.ts';
export type VisitPlan={nodeId:string;state:'here'|'travel'|'ap'|'materials'|'capped'|'blocked'|'locked'|'unavailable'|'ended'|'invalid';error:string|null;destination:string|null;path:string[];moveAp:number|null;activityAp:number;totalAp:number|null;materials:number;canAct:boolean};
function makePlan(g:Campaign,u:CampaignUnit,nodeId:string,walk:ReturnType<typeof movement>):VisitPlan{
 const {nodeById}=mapFor(g);const fee=interactionCost('canvass'),n=nodeById.get(nodeId);const base:VisitPlan={nodeId,state:'invalid',error:'c_errorNear',destination:null,path:[],moveAp:null,activityAp:fee.ap,totalAp:null,materials:fee.materials,canAct:false};
 const fail=(state:VisitPlan['state'],error:string):VisitPlan=>({...base,state,error});
 if(g.result)return fail('ended','c_errorEnded');
 if(!g.units.some(v=>v.id===u.id&&v.team===u.team)||!unitAvailable(g,u))return fail('unavailable','c_errorUnit');
 if(!n)return base;
 if(g.nodeState[n.id].visits[u.team]>=2)return fail('capped','c_errorCrowd');
 if(g.movementProfile==='streets-v2'&&outreachQuote(g,u.team,n.cellId).count>=2)return fail('capped','c_errorCrowd');
 const candidates=interactionCells(g,n);
 let destination:string,path:string[],moveAp:number;
 if(candidates.includes(u.cellId)){destination=u.cellId;path=[u.cellId];moveAp=0;}
 else{
  if(unitGuarded(g,u)||u.bracedUntil>=g.day)return fail('locked','c_errorGuardMove');
  const best=candidates.filter(id=>walk.costs.has(id)).sort((a,b)=>walk.costs.get(a)!-walk.costs.get(b)!||a.localeCompare(b))[0];
  if(!best)return fail('blocked','c_errorRoute');destination=best;moveAp=walk.costs.get(best)!;const route=routeFromMovement(u,best,walk);if(!route)return fail('blocked','c_errorRoute');path=route.path;
 }
 const totalAp=moveAp+fee.ap;let state:VisitPlan['state']=moveAp?'travel':'here',error:string|null=null;
 if(u.ap<totalAp){state='ap';error='c_errorAP';}else if(g.resources[u.team].materials<fee.materials){state='materials';error='c_errorMaterials';}
 return {...base,state,error,destination,path,moveAp,totalAp,canAct:error===null};
}
export function planNodeVisit(g:Campaign,u:CampaignUnit,nodeId:string){return makePlan(g,u,nodeId,movement(g,u));}
export function districtVisitPlans(g:Campaign,u:CampaignUnit,districtId:string){const walk=movement(g,u);return mapFor(g).nodes.filter(n=>n.districtId===districtId).map(n=>makePlan(g,u,n.id,walk));}

export function visitPlans(g:Campaign,u:CampaignUnit,walk=movement(g,u)){return mapFor(g).nodes.filter(n=>playableNode(g,n)).map(n=>makePlan(g,u,n.id,walk));}

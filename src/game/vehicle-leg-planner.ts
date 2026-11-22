/** Experimental combined boarding/vehicle/alighting planner. No campaign command uses it yet. */
import type {VehicleGraphColumns} from './vehicle-graph-format.ts';
import type {VehicleMode} from './vehicle-cost.ts';
import type {BoardingRoute} from './vehicle-boarding.ts';
import {vehicleEdgeQuarterMetres,vehicleRoute} from './vehicle-routing.ts';
import {incrementalAllowance,quoteVehicleCost,vehicleCostPolicy,boardingWalkCharge} from './vehicle-cost.ts';

export type VehicleLegPlan={boarding:BoardingRoute;alighting:BoardingRoute;nodeIndices:number[];edgeIndices:number[];
  walkingAp:number;vehicleAp:number;totalAp:number;materials:number;actualQuarterMetres:number;weightedQuarterMetres:number};
export type VehicleRoadConditions={rain:boolean;worksDistrict:string|null};
export type VehicleLegOptions={mode:VehicleMode;origins:readonly BoardingRoute[];destinations:readonly BoardingRoute[];
  ap:number;materials:number;reservedAp:number;previousWeightedQuarterMetres:number;previousTeamQuarterMetres:number;
  sharedWalk?:boolean;previousWalkedEffort?:number;previousWalkCredit?:number;
  allowTurn:(incoming:bigint,node:bigint,outgoing:bigint)=>boolean;edgeWeightQuarters:(edge:number)=>number;
  roadConditions?:VehicleRoadConditions};

type Label={node:number;way:bigint|null;origin:number;walkAp:number;walked:number;credit:number;actual:number;weighted:number;previous:number;edge:number};
type Item={label:number;cost:number};
class Queue{
 private data:Item[]=[];
 push(x:Item){let i=this.data.length;this.data.push(x);while(i){const p=(i-1)>>1;if(this.data[p].cost<=x.cost)break;this.data[i]=this.data[p];i=p;}this.data[i]=x;}
 pop(){if(!this.data.length)return undefined;const first=this.data[0],last=this.data.pop()!;if(this.data.length){let i=0;while(i*2+1<this.data.length){let c=i*2+1;if(c+1<this.data.length&&this.data[c+1].cost<this.data[c].cost)c++;if(this.data[c].cost>=last.cost)break;this.data[i]=this.data[c];i=c;}this.data[i]=last;}return first;}
}
const validStop=(r:BoardingRoute,n:number)=>Number.isInteger(r.vehicleNode)&&r.vehicleNode>=0&&r.vehicleNode<n&&
 Number.isFinite(r.metres)&&r.metres>=0&&r.metres<=600&&Number.isFinite(r.effort)&&r.effort>=r.metres&&Array.isArray(r.edgeIds)&&
 r.edgeIds.every(i=>Number.isInteger(i)&&i>=0)&&((r.edgeIds.length===0)===(r.metres===0));

/** Dijkstra keeps non-dominated origin cost, driven effort and actual distance at each turn state. */
export function planVehicleLeg(graph:VehicleGraphColumns,o:VehicleLegOptions):VehicleLegPlan|null{
 const n=graph.ids.length;
 const prevWalked=o.previousWalkedEffort??0,prevCredit=o.previousWalkCredit??0;
 const boardCharge=(r:BoardingRoute)=>boardingWalkCharge(r.effort,r.edgeIds.length>0,prevWalked,prevCredit,o.sharedWalk===true);
 if(!['drive','motorcade'].includes(o.mode)||![o.ap,o.materials,o.reservedAp,o.previousWeightedQuarterMetres,o.previousTeamQuarterMetres].every(Number.isSafeInteger)||
  Math.min(o.ap,o.materials,o.reservedAp,o.previousWeightedQuarterMetres,o.previousTeamQuarterMetres)<0||
  !Number.isFinite(prevWalked)||prevWalked<0||!Number.isFinite(prevCredit)||prevCredit<0||
  !o.origins.every(r=>validStop(r,n))||!o.destinations.every(r=>validStop(r,n)))throw new RangeError('Invalid vehicle leg options');
 if(o.reservedAp>o.ap||!o.origins.length||!o.destinations.length)return null;
 const perAp=o.mode==='drive'?vehicleCostPolicy.quarterMetresPerDriveAP:vehicleCostPolicy.quarterMetresPerMotorcadeAP;
 const targets=new Map<number,BoardingRoute[]>();for(const d of o.destinations){const list=targets.get(d.vehicleNode)??[];list.push(d);targets.set(d.vehicleNode,list);}
 // A sphere containing all target nodes gives a conservative chord-distance
 // lower bound. 0.65 accounts for per-edge quarter-metre rounding (>= 2/3 of
 // original positive edge length); the one-metre margin covers FP error.
 const radius=6371000,rad=Math.PI/180;
 function xyz(node:number){const lat=graph.latitudes[node]*rad,lon=graph.longitudes[node]*rad,c=Math.cos(lat)*radius;return [c*Math.cos(lon),c*Math.sin(lon),radius*Math.sin(lat)];}
 const targetPoints=[...targets.keys()].map(xyz),center=[0,0,0];
 const minimumAlightingDistance=o.destinations.reduce((best,d)=>Math.min(best,d.metres),Infinity);
 for(const p of targetPoints)for(let i=0;i<3;i++)center[i]+=p[i]/targetPoints.length;
 let sphereRadius=0;for(const p of targetPoints)sphereRadius=Math.max(sphereRadius,Math.hypot(p[0]-center[0],p[1]-center[1],p[2]-center[2]));
 const estimates=new Float64Array(n);estimates.fill(-1);
 function estimate(node:number){if(estimates[node]>=0)return estimates[node];const p=xyz(node),distance=Math.max(0,Math.hypot(p[0]-center[0],p[1]-center[1],p[2]-center[2])-sphereRadius-1);return estimates[node]=Math.floor(distance*4*0.65);}
 const labels:Label[]=[],front=new Map<string,number[]>(),queue=new Queue();
 const sourceDistance=(l:Label)=>o.origins[l.origin].metres;
 function insert(l:Label){const key=`${l.node}:${l.way===null?'start':l.way}`,old=front.get(key)??[];
  const dominates=(a:Label,b:Label)=>a.walkAp<=b.walkAp&&a.credit>=b.credit&&a.walked<=b.walked&&a.actual<=b.actual&&a.weighted<=b.weighted&&sourceDistance(a)<=sourceDistance(b);
  if(old.some(i=>dominates(labels[i],l)))return;
  const kept=old.filter(i=>!dominates(l,labels[i])),index=labels.length;labels.push(l);kept.push(index);front.set(key,kept);
  queue.push({label:index,cost:l.weighted+l.walkAp*perAp+estimate(l.node)});
 }
 for(let i=0;i<o.origins.length;i++){const start=o.origins[i],charge=boardCharge(start);if(charge.ap+o.reservedAp<=o.ap)insert({node:start.vehicleNode,way:null,origin:i,walkAp:charge.ap,walked:charge.walked,credit:charge.credit,actual:0,weighted:0,previous:-1,edge:-1});}
 let best:VehicleLegPlan|null=null,bestDistance=Infinity;
 // An independently valid route can give the exact search an early upper bound.
 // It is only a hint: all other non-dominated candidates are still considered.
 const originHint=o.origins.reduce((a,b)=>{const ca=boardCharge(a).ap,cb=boardCharge(b).ap;return ca<cb||ca===cb&&a.metres<=b.metres?a:b;});
 const hintBoard=boardCharge(originHint);
 const endHint=o.destinations.reduce((a,b)=>{const ca=boardingWalkCharge(a.effort,a.edgeIds.length>0,hintBoard.walked,hintBoard.credit,o.sharedWalk===true).ap,cb=boardingWalkCharge(b.effort,b.edgeIds.length>0,hintBoard.walked,hintBoard.credit,o.sharedWalk===true).ap;return ca<cb||ca===cb&&a.metres<=b.metres?a:b;});
 const hintLimit=Math.min(Number.MAX_SAFE_INTEGER-o.previousWeightedQuarterMetres,(o.ap+1)*perAp);
 if(Number.isSafeInteger(hintLimit)){
  const hint=vehicleRoute(graph,originHint.vehicleNode,endHint.vehicleNode,{allowTurn:o.allowTurn,edgeWeightQuarters:o.edgeWeightQuarters,maxWeightedQuarterMetres:hintLimit});
  if(hint&&Number.isSafeInteger(o.previousTeamQuarterMetres+hint.actualQuarterMetres)){
   const fee=quoteVehicleCost({mode:o.mode,previousWeightedQuarterMetres:o.previousWeightedQuarterMetres,addedWeightedQuarterMetres:hint.weightedQuarterMetres,
    previousTeamQuarterMetres:o.previousTeamQuarterMetres,addedTeamQuarterMetres:hint.actualQuarterMetres});
   const alight=boardingWalkCharge(endHint.effort,endHint.edgeIds.length>0,hintBoard.walked,hintBoard.credit,o.sharedWalk===true);
   const walkingAp=hintBoard.ap+alight.ap,totalAp=walkingAp+fee.ap;
   if(totalAp+o.reservedAp<=o.ap&&fee.supplies<=o.materials){
    best={boarding:originHint,alighting:endHint,...hint,walkingAp,vehicleAp:fee.ap,totalAp,materials:fee.supplies};
    bestDistance=originHint.metres+endHint.metres+hint.actualQuarterMetres/4;
   }
  }
 }
 while(true){const item=queue.pop();if(!item)break;const l=labels[item.label],key=`${l.node}:${l.way===null?'start':l.way}`;if(!front.get(key)?.includes(item.label))continue;
  // The admissible estimate and daily allowance yield a monotone lower bound.
  // Do not discard equal-AP labels: they can shorten travel.
  const estimated=l.weighted+estimate(l.node);
  if(!Number.isSafeInteger(estimated)||!Number.isSafeInteger(o.previousWeightedQuarterMetres+estimated))continue;
  const lowerBound=l.walkAp+incrementalAllowance(o.previousWeightedQuarterMetres,estimated,perAp);
  if(best&&lowerBound>best.totalAp)break;
  // Within the same AP band, a chord lower bound also rules out paths that
  // cannot improve total walking + driving distance.
  if(best&&lowerBound===best.totalAp&&sourceDistance(l)+l.actual/4+estimate(l.node)/4+minimumAlightingDistance>bestDistance)continue;
  if(l.edge>=0)for(const end of targets.get(l.node)??[]){
   const fee=quoteVehicleCost({mode:o.mode,previousWeightedQuarterMetres:o.previousWeightedQuarterMetres,addedWeightedQuarterMetres:l.weighted,
    previousTeamQuarterMetres:o.previousTeamQuarterMetres,addedTeamQuarterMetres:l.actual});
   const alight=boardingWalkCharge(end.effort,end.edgeIds.length>0,l.walked,l.credit,o.sharedWalk===true);
   const walkingAp=l.walkAp+alight.ap,totalAp=walkingAp+fee.ap,totalDistance=sourceDistance(l)+end.metres+l.actual/4;
   if(totalAp+o.reservedAp>o.ap||fee.supplies>o.materials||best&&(totalAp>best.totalAp||totalAp===best.totalAp&&totalDistance>=bestDistance))continue;
   const edgeIndices:number[]=[],nodeIndices:number[]=[l.node];let cursor=item.label;
   while(labels[cursor].previous>=0){edgeIndices.push(labels[cursor].edge);cursor=labels[cursor].previous;nodeIndices.push(labels[cursor].node);}
   best={boarding:o.origins[l.origin],alighting:end,nodeIndices:nodeIndices.reverse(),edgeIndices:edgeIndices.reverse(),walkingAp,
    vehicleAp:fee.ap,totalAp,materials:fee.supplies,actualQuarterMetres:l.actual,weightedQuarterMetres:l.weighted};bestDistance=totalDistance;
  }
  for(let edge=graph.offsets[l.node];edge<graph.offsets[l.node+1];edge++){
   const way=graph.ways[edge];if(l.way!==null&&!o.allowTurn(l.way,graph.ids[l.node],way))continue;
   const weight=o.edgeWeightQuarters(edge);if(!Number.isInteger(weight)||weight<4||weight>7)throw new RangeError('Invalid vehicle edge weight');
   const distance=vehicleEdgeQuarterMetres(graph.metres[edge]);if(!Number.isSafeInteger(distance*weight))throw new RangeError('Vehicle edge too long');
   const actual=l.actual+distance,weighted=l.weighted+Math.ceil(distance*weight/4);
   if(!Number.isSafeInteger(actual)||!Number.isSafeInteger(weighted)||
      !Number.isSafeInteger(o.previousWeightedQuarterMetres+weighted)||!Number.isSafeInteger(o.previousTeamQuarterMetres+actual))continue;
   const partialAp=incrementalAllowance(o.previousWeightedQuarterMetres,weighted,perAp),fuel=incrementalAllowance(o.previousTeamQuarterMetres,actual,vehicleCostPolicy.quarterMetresPerSupply);
   if(l.walkAp+partialAp+o.reservedAp>o.ap||fuel>o.materials||best&&l.walkAp+partialAp>best.totalAp)continue;
   insert({node:graph.targets[edge],way,origin:l.origin,walkAp:l.walkAp,walked:l.walked,credit:l.credit,actual,weighted,previous:item.label,edge});
  }
 }
 return best;
}

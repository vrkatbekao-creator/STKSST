import type { Campaign,CampaignUnit } from './campaign.ts';
import { allCells,routingNodes,routingEdges,routingOutgoing,streetWays,roadWalkCells,walkGeometry,walkSummary,routingCellId,routingEdgeCells } from './campaign-map.ts';
import { adapted } from './campaign-events.ts';

class MinQueue {
 data:[number,number][]=[];
 push(value:[number,number]){let i=this.data.length;this.data.push(value);while(i){const p=(i-1)>>1;if(this.data[p][0]<value[0]||this.data[p][0]===value[0]&&this.data[p][1]<=value[1])break;this.data[i]=this.data[p];i=p;}this.data[i]=value;}
 pop(){const top=this.data[0],last=this.data.pop()!;if(this.data.length){let i=0;while(i*2+1<this.data.length){let n=i*2+1;if(n+1<this.data.length&&(this.data[n+1][0]<this.data[n][0]||this.data[n+1][0]===this.data[n][0]&&this.data[n+1][1]<this.data[n][1]))n++;if(this.data[n][0]>last[0]||this.data[n][0]===last[0]&&this.data[n][1]>=last[1])break;this.data[i]=this.data[n];i=n;}this.data[i]=last;}return top;}
}
export type RoadMovement={costs:Map<string,number>;previous:Map<string,string>;road:{grid?:300;start:number;previous:Map<number,number>;effort:Map<number,number>}};
export const roadAPPolicy=Object.freeze({metresPerAP:1800,stairs:.5,rain:.25,streetworks:.5});
export const paidWalkAP=(totalEffort:number)=>totalEffort<=1e-6?0:Math.max(1,Math.ceil((totalEffort-1e-6)/roadAPPolicy.metresPerAP));
export const roadAPCost=(effort:number,previousWalked=0,walkCredit=0)=>{
 if(effort<=1e-6)return 0;
 const covered=Math.max(previousWalked,walkCredit);
 if(previousWalked+effort<=covered+1e-6)return 0;
 return Math.max(1,Math.ceil((previousWalked+effort-covered-1e-6)/roadAPPolicy.metresPerAP));
};
export const walkingRate=(u:CampaignUnit)=>u.apRules==='golden-week'?roadAPPolicy.metresPerAP:1500;
export const walkingAP=(u:CampaignUnit,effort:number)=>u.apRules==='golden-week'?roadAPCost(effort,u.walkedEffort??0,u.walkCredit??0):Math.max(1,Math.ceil((effort-1e-6)/1500));
export function roadEffort(g:Campaign,edgeId:number,team:CampaignUnit['team']){
 const e=routingEdges[edgeId],way=streetWays.get(e.wayId)!,district=allCells.get(routingNodes[e.to].legacyCellId)!.districtId;
 return e.metres*(1+(way.highway==='steps'?roadAPPolicy.stairs:0)+(g.news==='rain'?roadAPPolicy.rain:0)+(g.surprise?.id==='streetworks'&&g.surprise.districtId===district&&!adapted(g.surprise,team)?roadAPPolicy.streetworks:0));
}
export function checkedRoadMove(game:Campaign,unit:CampaignUnit,destination:string,ids:Uint32Array){
 if(game.movementProfile!=='streets-v2'||!ids.length||ids.length>10000)return null;
 const target=allCells.get(destination)?.roadNode;
 let node=allCells.get(unit.cellId)?.roadNode;
 if(target===undefined||node===undefined)return null;
 const occupied=new Set(game.units.filter(other=>other.id!==unit.id&&other.mobilization>0&&other.withdrawUntil<=game.day).map(other=>other.cellId));
 let effort=0;
 for(const id of ids){
  const edge=routingEdges[id];
  if(!edge||edge.from!==node||routingEdgeCells(game,edge).some(cell=>occupied.has(cell)))return null;
  effort+=roadEffort(game,id,unit.team);
  node=edge.to;
 }
 const cost=walkingAP(unit,effort);
 if(node!==target||cost>unit.ap)return null;
 const edgeIds=Array.from(ids);
 return {cost,effort,path:roadWalkCells(edgeIds,game),edgeIds};
}
export function roadMovement(g:Campaign,u:CampaignUnit,budget:number):RoadMovement{
 const start=allCells.get(u.cellId)!.roadNode!,effort=new Map<number,number>([[start,0]]),previous=new Map<number,number>(),costs=new Map<string,number>([[u.cellId,0]]);
 const walked=u.apRules==='golden-week'?u.walkedEffort??0:0,credit=u.apRules==='golden-week'?u.walkCredit??0:0,covered=Math.max(walked,credit),maxAdded=Math.max(0,covered-walked)+budget*walkingRate(u);
 const occupied=new Set(g.units.filter(v=>v.id!==u.id&&v.mobilization>0&&v.withdrawUntil<=g.day).map(v=>v.cellId));
 const queue=new MinQueue();queue.push([0,start]);
 while(queue.data.length){const [cost,node]=queue.pop();if(cost!==effort.get(node))continue;const c=allCells.get(routingCellId(g,node))!;
  if(c.roadNode===node)costs.set(c.id,node===start?0:walkingAP(u,cost));
  for(const id of routingOutgoing[node]){const e=routingEdges[id];if(routingEdgeCells(g,e).some(id=>occupied.has(id)))continue;const next=cost+roadEffort(g,id,u.team);if(next>maxAdded+1e-6||next>=(effort.get(e.to)??Infinity))continue;effort.set(e.to,next);previous.set(e.to,id);queue.push([next,e.to]);}
 }
 return {costs,previous:new Map(),road:{grid:g.streetGrid,start,previous,effort}};
}
export function roadRoute(walk:RoadMovement,to:string){const target=allCells.get(to)?.roadNode;if(target===undefined||!walk.costs.has(to))return null;const edgeIds:number[]=[];let at=target;while(at!==walk.road.start){const id=walk.road.previous.get(at);if(id===undefined)return null;edgeIds.unshift(id);at=routingEdges[id].from;}const path=edgeIds.length?roadWalkCells(edgeIds,{streetGrid:walk.road.grid}):[to];return {cost:walk.costs.get(to)!,effort:walk.road.effort.get(target)??0,path,edgeIds,get geometry(){return walkGeometry(path,edgeIds);},...walkSummary(edgeIds)};}

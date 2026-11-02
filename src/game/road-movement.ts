import type { Campaign,CampaignUnit } from './campaign.ts';
import { allCells,routingNodes,routingEdges,routingOutgoing,streetWays,roadWalkCells,walkGeometry,walkSummary } from './campaign-map.ts';
import { adapted } from './campaign-events.ts';

class MinQueue {
 data:[number,number][]=[];
 push(value:[number,number]){let i=this.data.length;this.data.push(value);while(i){const p=(i-1)>>1;if(this.data[p][0]<value[0]||this.data[p][0]===value[0]&&this.data[p][1]<=value[1])break;this.data[i]=this.data[p];i=p;}this.data[i]=value;}
 pop(){const top=this.data[0],last=this.data.pop()!;if(this.data.length){let i=0;while(i*2+1<this.data.length){let n=i*2+1;if(n+1<this.data.length&&(this.data[n+1][0]<this.data[n][0]||this.data[n+1][0]===this.data[n][0]&&this.data[n+1][1]<this.data[n][1]))n++;if(this.data[n][0]>last[0]||this.data[n][0]===last[0]&&this.data[n][1]>=last[1])break;this.data[i]=this.data[n];i=n;}this.data[i]=last;}return top;}
}
export type RoadMovement={costs:Map<string,number>;previous:Map<string,string>;road:{start:number;previous:Map<number,number>;effort:Map<number,number>}};
export const roadAPPolicy=Object.freeze({metresPerAP:200,stairs:.5,rain:.25,streetworks:.5});
export const roadAPCost=(effort:number)=>Math.max(1,Math.ceil((effort-1e-6)/roadAPPolicy.metresPerAP));
export function roadEffort(g:Campaign,edgeId:number,team:CampaignUnit['team']){
 const e=routingEdges[edgeId],way=streetWays.get(e.wayId)!,district=allCells.get(routingNodes[e.to].cellId)!.districtId;
 return e.metres*(1+(way.highway==='steps'?roadAPPolicy.stairs:0)+(g.news==='rain'?roadAPPolicy.rain:0)+(g.surprise?.id==='streetworks'&&g.surprise.districtId===district&&!adapted(g.surprise,team)?roadAPPolicy.streetworks:0));
}
export function roadMovement(g:Campaign,u:CampaignUnit,budget:number):RoadMovement{
 const start=allCells.get(u.cellId)!.roadNode!,effort=new Map<number,number>([[start,0]]),previous=new Map<number,number>(),costs=new Map<string,number>([[u.cellId,0]]);
 const occupied=new Set(g.units.filter(v=>v.id!==u.id&&v.mobilization>0&&v.withdrawUntil<=g.day).map(v=>v.cellId));
 const queue=new MinQueue();queue.push([0,start]);
 while(queue.data.length){const [cost,node]=queue.pop();if(cost!==effort.get(node))continue;const c=allCells.get(routingNodes[node].cellId)!;
  if(c.roadNode===node)costs.set(c.id,node===start?0:roadAPCost(cost));
  for(const id of routingOutgoing[node]){const e=routingEdges[id];if(e.cellIds.some(id=>occupied.has(id)))continue;const next=cost+roadEffort(g,id,u.team);if(next>budget*roadAPPolicy.metresPerAP+1e-6||next>=(effort.get(e.to)??Infinity))continue;effort.set(e.to,next);previous.set(e.to,id);queue.push([next,e.to]);}
 }
 return {costs,previous:new Map(),road:{start,previous,effort}};
}
export function roadRoute(walk:RoadMovement,to:string){const target=allCells.get(to)?.roadNode;if(target===undefined||!walk.costs.has(to))return null;const edgeIds:number[]=[];let at=target;while(at!==walk.road.start){const id=walk.road.previous.get(at);if(id===undefined)return null;edgeIds.unshift(id);at=routingEdges[id].from;}const path=edgeIds.length?roadWalkCells(edgeIds):[to];return {cost:walk.costs.get(to)!,path,edgeIds,get geometry(){return walkGeometry(path,edgeIds);},...walkSummary(edgeIds)};}

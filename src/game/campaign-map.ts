import catalog from '../data/taipei-wonders.json' with { type: 'json' };
import {loadStreetRuntime} from './street-runtime.ts';
const {base:data,meta:streetSource,graph:streetGraph}=await loadStreetRuntime();
export {streetSource};
export type Hex = { q:number; r:number };
export type StreetEdge={from:string;to:string;metres:number;assumed:boolean;stairs:boolean;points:number[][];wayIds:number[]};
export type Cell={id:string;q:number;r:number;x:number;y:number;districtId:string;terrain:string;neighbors:string[];walkable?:boolean;roadPoint?:number[];roadNode?:number;parentId?:string};
export const campaignMap={...data,cells:data.cells as Cell[]};
export const districts=data.districts;
export const nodes=data.nodes;
export const wonders=catalog.wonders;
export type CampaignNode={id:string;districtId:string;cellId:string;kind:string;wonderId:string|null;syntheticVenue:boolean;sourceCoordinates?:number[];snapMetres?:number};
export const cells=new Map<string,Cell>(data.cells.map(c=>[c.id,c]));
export const nodeById=new Map(nodes.map(n=>[n.id,n]));
export function hexDistance(a:Hex,b:Hex){const dq=a.q-b.q,dr=a.r-b.r;return Math.max(Math.abs(dq),Math.abs(dr),Math.abs(dq+dr));}
export function polygonPoints(c:{x:number;y:number},radius=data.radiusMetres){return Array.from({length:6},(_,i)=>{const a=(i*60-30)*Math.PI/180;return [c.x+radius*Math.cos(a),c.y+radius*Math.sin(a)];});}
export function ringsPath(rings:number[][][]){return rings.map(r=>r.map((p,i)=>`${i?'L':'M'}${p[0]},${p[1]}`).join(' ')+'Z').join(' ');}
// Charter travel is an abstract transport action, but never links disconnected banks.
export const components=new Map<string,number>();
let component=0;
for(const c of data.cells){if(c.terrain==='water'||components.has(c.id))continue;const queue=[c.id];components.set(c.id,component);for(let i=0;i<queue.length;i++)for(const n of cells.get(queue[i])!.neighbors)if(!components.has(n)){components.set(n,component);queue.push(n);}component++;}
export function connected(a:string,b:string){return components.has(a)&&components.get(a)===components.get(b);}

export type RoadWay={id:number;name:{'zh-TW':string;en:string};highway:string;foot:string;access:string;bridge:string;tunnel:string;layer:string;onewayFoot:string;assumed:boolean};
export function axialAt(x:number,y:number,size:number){const q=x/(Math.sqrt(3)*size)-y/(3*size),r=y/(1.5*size);let a=Math.round(q),b=Math.round(r),c=Math.round(-q-r);const da=Math.abs(a-q),db=Math.abs(b-r),dc=Math.abs(c+q+r);if(da>db&&da>dc)a=-b-c;else if(db>dc)b=-a-c;return {q:a,r:b};}
const anchorIndices=new Map(streetSource.anchors);
const streetCells:Cell[]=streetSource.cells.map(([q,r,district,terrain],index)=>{const x=50*Math.sqrt(3)*(q+r/2),y=75*r,parent=axialAt(x,y,190),roadNode=anchorIndices.get(index),point=roadNode===undefined?undefined:[streetGraph.xy[roadNode*2],streetGraph.xy[roadNode*2+1]];return {id:`${streetSource.version}:${q},${r}`,q,r,x,y,districtId:districts[district].id,terrain:['urban','lane','park','slope','plaza','water'][terrain],neighbors:[],walkable:roadNode!==undefined,roadNode,roadPoint:point?[point[0],point[1]]:undefined,parentId:`taipei-hex-v1:${parent.q},${parent.r}`};});
export const streetCellMap=new Map(streetCells.map(c=>[c.id,c]));
for(const [a,b] of streetSource.cellLinks)streetCells[a].neighbors.push(streetCells[b].id);
export const streetWays=new Map<number,RoadWay>(streetSource.ways.map(([id,name,highway,foot,access,bridge,tunnel,layer,onewayFoot,assumed])=>[id,{id,name,highway,foot,access,bridge,tunnel,layer,onewayFoot,assumed}]));
export type RoutingEdge={id:number;from:number;to:number;metres:number;wayId:number;points:number[][];cellIds:string[]};
export const routingNodes=Array.from({length:streetGraph.nodeCount},(_,i)=>({x:streetGraph.xy[i*2],y:streetGraph.xy[i*2+1],cellId:streetCells[streetGraph.cell[i]].id}));
export const routingEdges:RoutingEdge[]=[];
export const routingOutgoing:number[][]=routingNodes.map(()=>[]),routingIncoming:number[][]=routingNodes.map(()=>[]);
// Full routing topology stays synchronous. Geometry remains packed until a route is drawn.
class PackedEdge implements RoutingEdge{
 id:number;from:number;to:number;metres:number;wayId:number;cellIds:string[];private link:number;private reverse:boolean;
 constructor(id:number,from:number,to:number,metres:number,wayId:number,cellIds:string[],link:number,reverse:boolean){this.id=id;this.from=from;this.to=to;this.metres=metres;this.wayId=wayId;this.cellIds=cellIds;this.link=link;this.reverse=reverse;}
 get points(){const result:number[][]=[];for(let p=streetGraph.pointOffsets[this.link];p<streetGraph.pointOffsets[this.link+1];p+=2)result.push([streetGraph.points[p],streetGraph.points[p+1]]);return this.reverse?result.reverse():result;}
}
function addRoutingEdge(link:number,reverse:boolean){const at=link*3,from=streetGraph.links[at+(reverse?1:0)],to=streetGraph.links[at+(reverse?0:1)],a=routingNodes[from].cellId,b=routingNodes[to].cellId,id=routingEdges.length;
 routingEdges.push(new PackedEdge(id,from,to,streetGraph.metres[link],streetGraph.links[at+2],a===b?[a]:[a,b],link,reverse));routingOutgoing[from].push(id);routingIncoming[to].push(id);
}
for(let i=0;i<streetGraph.linkCount;i++){addRoutingEdge(i,false);if(streetGraph.both[i])addRoutingEdge(i,true);}
const streetNodes:CampaignNode[]=nodes.map(n=>({...n,cellId:streetCells[streetSource.nodeCells[n.id]].id,...(n.kind==='wonder'?{snapMetres:streetSource.nodeSnaps[n.id]}:{})}));
const streetDistricts=districts.map(d=>({...d,anchor:streetCells[streetSource.districtAnchors[d.id]].id}));
export const streetCampaignMap={...campaignMap,version:streetSource.version,radiusMetres:50,cells:streetCells,nodes:streetNodes,districts:streetDistricts};
export const allCells=new Map<string,Cell>([...cells,...streetCellMap]);
for(const c of streetCells)if(c.walkable)components.set(c.id,-1);
export const streetNodeById=new Map(streetNodes.map(n=>[n.id,n]));
export type MovementProfile='legacy-hex'|'streets-v2';
export function mapFor(g:{movementProfile?:MovementProfile}){return g.movementProfile==='streets-v2'?{campaignMap:streetCampaignMap,cells:streetCellMap,nodes:streetNodes,nodeById:streetNodeById,districts:streetDistricts,revision:streetSource.revision}:{campaignMap,cells,nodes,nodeById,districts,revision:'taipei-hex-v1'};}
export function cellPosition(c:Cell){return c.roadPoint??[c.x,c.y];}
export function roadWalkCells(edgeIds:number[]){const result:string[]=[];for(const id of edgeIds)for(const cell of routingEdges[id]?.cellIds??[])if(result.at(-1)!==cell)result.push(cell);return result;}
export function walkGeometry(ids:string[],edgeIds?:number[]){if(!ids.length)return [];if(ids[0].startsWith('taipei-hex-v1:'))return ids.map(id=>cellPosition(allCells.get(id)!));if(!edgeIds)return [];return edgeIds.flatMap((id,i)=>i?routingEdges[id].points.slice(1):routingEdges[id].points);}
export function walkSummary(edgeIds:number[]=[]){const edges=edgeIds.map(id=>routingEdges[id]);return {metres:Math.round(edges.reduce((n,e)=>n+e.metres,0)),assumed:edges.some(e=>streetWays.get(e.wayId)!.assumed),stairs:edges.some(e=>streetWays.get(e.wayId)!.highway==='steps'),ways:[...new Set(edges.map(e=>e.wayId))].map(id=>streetWays.get(id)!)};}
const approachCache=new Map<string,string[]>();
export function approachCells(id:string){const cached=approachCache.get(id);if(cached)return cached;const cell=streetCellMap.get(id)!,start=cell.roadNode;if(start===undefined)return [];const costs=new Map<number,number>([[start,0]]),queue=[start],result=new Set<string>();for(let i=0;i<queue.length;i++){const n=queue[i],cost=costs.get(n)!;const here=streetCellMap.get(routingNodes[n].cellId)!;if(here.roadNode===n&&here.id!==id&&hexDistance(here,cell)<=1)result.add(here.id);for(const edgeId of routingIncoming[n]){const edge=routingEdges[edgeId],next=cost+edge.metres;if(next<=150&&next<(costs.get(edge.from)??Infinity)){costs.set(edge.from,next);queue.push(edge.from);}}}const value=[...result].sort();approachCache.set(id,value);return value;}

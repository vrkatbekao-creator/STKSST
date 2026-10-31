import data from '../data/taipei-map.json' with { type: 'json' };
import catalog from '../data/taipei-wonders.json' with { type: 'json' };
export type Hex = { q:number; r:number };
export const campaignMap=data;
export const districts=data.districts;
export const nodes=data.nodes;
export const wonders=catalog.wonders;
export type Cell=typeof data.cells[number];
export type CampaignNode=typeof nodes[number];
export const cells=new Map(data.cells.map(c=>[c.id,c]));
export const nodeById=new Map(nodes.map(n=>[n.id,n]));
export function hexDistance(a:Hex,b:Hex){const dq=a.q-b.q,dr=a.r-b.r;return Math.max(Math.abs(dq),Math.abs(dr),Math.abs(dq+dr));}
export function polygonPoints(c:{x:number;y:number},radius=data.radiusMetres){return Array.from({length:6},(_,i)=>{const a=(i*60-30)*Math.PI/180;return [c.x+radius*Math.cos(a),c.y+radius*Math.sin(a)];});}
export function ringsPath(rings:number[][][]){return rings.map(r=>r.map((p,i)=>`${i?'L':'M'}${p[0]},${p[1]}`).join(' ')+'Z').join(' ');}
// Charter travel is an abstract transport action, but never links disconnected banks.
export const components=new Map<string,number>();
let component=0;
for(const c of data.cells){if(c.terrain==='water'||components.has(c.id))continue;const queue=[c.id];components.set(c.id,component);for(let i=0;i<queue.length;i++)for(const n of cells.get(queue[i])!.neighbors)if(!components.has(n)){components.set(n,component);queue.push(n);}component++;}
export function connected(a:string,b:string){return components.has(a)&&components.get(a)===components.get(b);}

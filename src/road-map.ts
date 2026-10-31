/** Real road data and presentation selectors. No game commands or costs live here. */
export type RoadClass='express'|'arterial'|'street'|'alley'|'path';
export type RoadFilter='all'|'arterial'|'local'|'path';
export type Road={id:string;osmId:number;highway:string;class:RoadClass;name:{'zh-TW':string;en:string};ref:string;points:number[][];bounds:number[];districtIds:string[];lengthMetres:number;bridge:string;tunnel:string;layer:string;access:string;foot:string;oneway:string;restricted:boolean};
export type RoadData={version:string;projection:string;origin:number[];source:{provider:string;endpoint:string;dataTimestamp:string;retrievedAt:string;licence:string;licenceUrl:string;copyrightUrl:string;sourceSha256:string;fieldsNotProvided:string[]};roads:Road[];cellIndex:Record<string,number[]>;districtCounts:Record<string,number>;displaySimplifyMetres:number};
export type MapBounds={x:number;y:number;width:number;height:number};
const roadClasses=new Set(['express','arterial','street','alley','path']);
export function validRoadData(value:unknown):value is RoadData{
 if(!value||typeof value!=='object')return false;const d=value as RoadData;
 if(d.version!=='taipei-osm-roads-v1'||d.projection!=='EPSG:3826'||!Array.isArray(d.origin)||d.origin[0]!==300000||d.origin[1]!==2800000||!Array.isArray(d.roads)||!d.roads.length||!d.cellIndex||typeof d.cellIndex!=='object'||!d.source||!/^\d{4}-\d\d-\d\dT/.test(d.source.dataTimestamp)||d.source.licence!=='ODbL-1.0')return false;
 const ids=new Set<string>();
 for(const r of d.roads){if(!r||typeof r.id!=='string'||ids.has(r.id)||!Number.isSafeInteger(r.osmId)||r.osmId<=0||!roadClasses.has(r.class)||!r.name||typeof r.name['zh-TW']!=='string'||typeof r.name.en!=='string'||!Array.isArray(r.points)||r.points.length<2||!r.points.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite))||!Array.isArray(r.bounds)||r.bounds.length!==4||!r.bounds.every(Number.isFinite)||r.bounds[0]>r.bounds[2]||r.bounds[1]>r.bounds[3]||r.points.some(p=>p[0]<r.bounds[0]-.11||p[0]>r.bounds[2]+.11||p[1]<r.bounds[1]-.11||p[1]>r.bounds[3]+.11)||!Array.isArray(r.districtIds)||!r.districtIds.length||r.districtIds.some(id=>!/^630(?:0[1-9]|1[0-2])00$/.test(id))||!Number.isFinite(r.lengthMetres)||r.lengthMetres<0||typeof r.bridge!=='string'||typeof r.tunnel!=='string'||typeof r.ref!=='string')return false;ids.add(r.id);}
 return Object.entries(d.cellIndex).every(([id,indices])=>/^taipei-hex-v1:-?\d+,-?\d+$/.test(id)&&Array.isArray(indices)&&indices.every(i=>Number.isSafeInteger(i)&&i>=0&&i<d.roads.length));
}
export function roadName(r:Road,lang:string){return lang==='en'?(r.name.en||r.name['zh-TW']||r.ref):r.name['zh-TW']||r.ref;}
export function roadMatches(r:Road,filter:RoadFilter){return filter==='all'||filter==='arterial'&&(r.class==='arterial'||r.class==='express')||filter==='local'&&(r.class==='street'||r.class==='alley')||filter==='path'&&r.class==='path';}
export function roadsInView(data:RoadData,cellIds:string[],bounds:MapBounds,filter:RoadFilter){
 const found=new Set<number>();for(const id of cellIds)for(const index of data.cellIndex[id]??[])found.add(index);
 return [...found].map(i=>data.roads[i]).filter(r=>roadMatches(r,filter)&&r.bounds[0]<=bounds.x+bounds.width&&r.bounds[2]>=bounds.x&&r.bounds[1]<=bounds.y+bounds.height&&r.bounds[3]>=bounds.y);
}
export function roadGroups(roads:Road[],lang:string,query=''){
 const grouped=new Map<string,{key:string;name:string;roads:Road[]}>(),q=query.trim().normalize('NFKC').toLocaleLowerCase();
 for(const r of roads){const name=roadName(r,lang),key=r.name['zh-TW']||r.name.en||r.ref;if(!key)continue;
  if(q&&!`${r.name['zh-TW']} ${r.name.en} ${r.ref}`.normalize('NFKC').toLocaleLowerCase().includes(q))continue;
  const old=grouped.get(key);if(old)old.roads.push(r);else grouped.set(key,{key,name,roads:[r]});
 }
 return [...grouped.values()].sort((a,b)=>a.name.localeCompare(b.name,lang==='en'?'en':'zh-Hant'));
}
export function roadPath(r:Road){return r.points.map((p,i)=>`${i?'L':'M'}${p[0]},${p[1]}`).join('');}
export function labelRoads(roads:Road[],bounds:MapBounds,pixels:number,avoid:number[][],lang='zh-TW',avoidRadius=170){
 const unit=bounds.width/Math.max(pixels,1),font=11*unit,padding=15*unit,placed:{road:Road;x:number;y:number;width:number;height:number}[]=[],names=new Set<string>();
 const candidates=[...roads].sort((a,b)=>(a.class==='arterial'?-1:0)-(b.class==='arterial'?-1:0)||b.lengthMetres-a.lengthMetres);
 for(const r of candidates){const name=roadName(r,lang);if(!name||names.has(name))continue;
  const width=Math.min(17,name.length)*11*unit,height=20*unit;
  const possible=r.points.filter(p=>p[0]>bounds.x+width/2+padding&&p[0]<bounds.x+bounds.width-width/2-padding&&p[1]>bounds.y+height&&p[1]<bounds.y+bounds.height-height);
  const p=possible.find(p=>!avoid.some(a=>Math.abs(a[0]-p[0])<width/2+avoidRadius&&Math.abs(a[1]-p[1])<height/2+avoidRadius)&&!placed.some(a=>Math.abs(a.x-p[0])<(a.width+width)/2+18*unit&&Math.abs(a.y-p[1])<height*1.5));
  if(!p)continue;names.add(name);placed.push({road:r,x:p[0],y:p[1],width,height});if(placed.length>=(pixels<600?4:10))break;
 }
 return {labels:placed,font};
}

export function coarseRoadCells(cells:{id:string;parentId?:string}[]){const result=new Set<string>();for(const c of cells){const id=c.parentId??c.id;result.add(id);if(!c.parentId)continue;const [q,r]=id.split(':')[1].split(',').map(Number);for(const [dq,dr] of [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]])result.add(`taipei-hex-v1:${q+dq},${r+dr}`);}return [...result];}
/** Convex segment clipping against the complete shared hex, including boundary hits. */
export function roadsInHex(data:RoadData,cell:{id:string;x:number;y:number;parentId?:string},radius:number){
 const vertices=Array.from({length:6},(_,i)=>{const a=(i*60-30)*Math.PI/180;return [cell.x+radius*Math.cos(a),cell.y+radius*Math.sin(a)];});
 const intersects=(a:number[],b:number[])=>{let lo=0,hi=1;for(let i=0;i<6;i++){const p=vertices[i],q=vertices[(i+1)%6],dx=q[0]-p[0],dy=q[1]-p[1],f=dx*(a[1]-p[1])-dy*(a[0]-p[0]),delta=dx*(b[1]-a[1])-dy*(b[0]-a[0]);if(Math.abs(delta)<1e-9){if(f<-.11)return false;}else if(delta>0)lo=Math.max(lo,(-.11-f)/delta);else hi=Math.min(hi,(-.11-f)/delta);if(lo>hi)return false;}return true;};
 const candidates=new Set<number>();for(const id of coarseRoadCells([cell]))for(const i of data.cellIndex[id]??[])candidates.add(i);
 return [...candidates].map(i=>data.roads[i]).filter(r=>r.points.some((p,i)=>i>0&&intersects(r.points[i-1],p)));
}

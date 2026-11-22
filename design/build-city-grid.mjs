// Reassign the frozen walking topology to a 300 m lattice; never reorder road edges.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {projectVehiclePoint} from '../src/game/vehicle-geometry.ts';
const read=name=>JSON.parse(readFileSync(new URL(`../src/data/${name}`,import.meta.url),'utf8'));
const raw=read('taipei-street-map-v2.json'),base=read('taipei-map.json'),places=read('taipei-places.json');
const size=150,version='taipei-street-hex-v3';
const pos=([q,r],s=size)=>[s*Math.sqrt(3)*(q+r/2),1.5*s*r];
function axial(x,y){const q=x/(Math.sqrt(3)*size)-y/(3*size),r=y/(1.5*size);let a=Math.round(q),b=Math.round(r),c=Math.round(-q-r);const da=Math.abs(a-q),db=Math.abs(b-r),dc=Math.abs(c+q+r);if(da>db&&da>dc)a=-b-c;else if(db>dc)b=-a-c;return [a,b];}
function ringContains([x,y],ring){let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
function districtAt(p){return base.districts.findIndex(d=>d.rings.reduce((inside,r)=>inside!==ringContains(p,r),false));}
const candidates=new Map();
for(const c of raw.cells){const [q,r]=axial(...pos(c,raw.radiusMetres));const key=`${q},${r}`;if(candidates.has(key))continue;const district=districtAt(pos([q,r]));if(district>=0)candidates.set(key,[q,r,district,0]);}
const cells=[...candidates.values()].sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
const index=new Map(cells.map((c,i)=>[`${c[0]},${c[1]}`,i]));
const square=(a,b)=>(a[0]-b[0])**2+(a[1]-b[1])**2;
function closest(point,allowed){let best=-1,distance=Infinity;for(let i=0;i<cells.length;i++)if(!allowed||allowed(i)){const d=square(point,pos(cells[i]));if(d<distance){best=i;distance=d;}}if(best<0)throw Error('No grid anchor');return best;}
const fineCells=raw.cells.map(c=>{const p=pos(c,raw.radiusMetres),a=axial(...p);return index.get(a.join(','))??closest(p);});
const terrain=cells.map(()=>new Map());raw.cells.forEach((c,i)=>terrain[fineCells[i]].set(c[3],(terrain[fineCells[i]].get(c[3])??0)+1));
cells.forEach((c,i)=>c[3]=[...terrain[i]].sort((a,b)=>b[1]-a[1]||a[0]-b[0])[0]?.[0]??0);
const anchors=new Map(),distances=new Map();
raw.graphNodes.forEach((point,node)=>{const cell=fineCells[point[2]],actual=axial(point[0],point[1]);if(actual[0]!==cells[cell][0]||actual[1]!==cells[cell][1])return;const distance=square(point,pos(cells[cell]));if(distance<(distances.get(cell)??Infinity)){anchors.set(cell,node);distances.set(cell,distance);}});
for(const cell of anchors.keys())if(cells[cell][3]===5)cells[cell][3]=0;
const links=new Set();for(const [a,b] of raw.cellLinks){const ca=fineCells[a],cb=fineCells[b],x=cells[ca],y=cells[cb],dq=x[0]-y[0],dr=x[1]-y[1];if(ca!==cb&&Math.max(Math.abs(dq),Math.abs(dr),Math.abs(dq+dr))===1)links.add(`${ca},${cb}`);}
const fineAnchors=new Map(raw.anchors),fineIndex=new Map(raw.cells.map((c,i)=>[`${raw.version}:${c[0]},${c[1]}`,i]));
function originalPosition(n){const fine=raw.nodeCells[n.id]??fineIndex.get(n.cellId);if(fine===undefined)throw Error(`Missing source ${n.id}`);return n.sourceCoordinates?projectVehiclePoint(...n.sourceCoordinates):raw.graphNodes[fineAnchors.get(fine)]??pos(raw.cells[fine],raw.radiusMetres);}
function relocate(n){const original=originalPosition(n),district=base.districts.findIndex(d=>d.id===n.districtId);let cell=-1,distance=Infinity;for(const [i,anchor] of anchors)if(cells[i][2]===district){const d=square(original,raw.graphNodes[anchor]);if(d<distance){cell=i;distance=d;}}if(cell<0)throw Error(`No venue anchor ${n.id}`);return [n.id,cell];}
const nodeCells=Object.fromEntries([...base.nodes,...places.places].map(relocate));
const districtAnchors=Object.fromEntries(base.districts.map(d=>[d.id,nodeCells[d.wonderId]]));
const nodeSnaps=Object.fromEntries([...base.nodes,...places.places].map(n=>[n.id,Math.round(Math.sqrt(square(originalPosition(n),raw.graphNodes[anchors.get(nodeCells[n.id])]))*10)/10]));
const data={version,radiusMetres:size,routingRevision:raw.revision,cells,fineCells,anchors:[...anchors].sort((a,b)=>a[0]-b[0]),cellLinks:[...links].map(x=>x.split(',').map(Number)),nodeCells,nodeSnaps,districtAnchors};
const revision=createHash('sha256').update(JSON.stringify(data)).digest('hex');
writeFileSync(new URL('../src/data/taipei-grid-300.json',import.meta.url),JSON.stringify({...data,revision})+'\n');
console.log(JSON.stringify({version,revision,cells:cells.length,walkable:anchors.size,sourceNodes:raw.graphNodes.length,sourceEdges:raw.graphLinks.length,venues:Object.keys(nodeCells).length}));

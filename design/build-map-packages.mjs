// Repackage frozen, licensed snapshots. No network or geometry/rule changes.
import {readFileSync,writeFileSync,mkdirSync,readdirSync,unlinkSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),out=new URL('public/data/runtime-v1/',root);
mkdirSync(out,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
const manifest={version:1,revision:'',core:null,meta:null,base:null,districts:[]};
const written=new Set();
function emit(name,bytes){const sha256=hash(bytes),file=`${name}.${sha256.slice(0,16)}.gz`,packed=gzipSync(bytes,{level:9,mtime:0});writeFileSync(new URL(file,out),packed);written.add(file);return {file,sha256,bytes:bytes.length,gzipBytes:packed.length};}
const json=(name,data)=>emit(name,Buffer.from(JSON.stringify(data,(_key,value)=>Object.is(value,-0)?JSON.rawJSON('-0'):value)));
const raw=JSON.parse(readFileSync(new URL('src/data/taipei-street-map-v2.json',root),'utf8'));
const base=JSON.parse(readFileSync(new URL('src/data/taipei-map.json',root),'utf8'));
manifest.base=json('base-map',base);
manifest.revision=raw.revision;
// Aligned, lossless binary arrays. Original link order determines stable directed edge IDs.
let offset=16;const arrays=[];
function add(Type,values){offset=Math.ceil(offset/Type.BYTES_PER_ELEMENT)*Type.BYTES_PER_ELEMENT;const data=Type.from(values);arrays.push({offset,data});offset+=data.byteLength;}
add(Float64Array,raw.graphNodes.flatMap(n=>n.slice(0,2)));
add(Uint32Array,raw.graphNodes.map(n=>n[2]));
add(Uint32Array,raw.graphLinks.flatMap(e=>[e[0],e[1],e[3]]));
add(Float64Array,raw.graphLinks.map(e=>e[2]));
add(Uint8Array,raw.graphLinks.map(e=>e[5]));
let pointOffset=0;const offsets=raw.graphLinks.map(e=>{const start=pointOffset;pointOffset+=e[4].length;return start;});offsets.push(pointOffset);
add(Uint32Array,offsets);
add(Float64Array,raw.graphLinks.flatMap(e=>e[4]));
const binary=Buffer.alloc(offset);binary.write('STR1');binary.writeUInt32LE(raw.graphNodes.length,4);binary.writeUInt32LE(raw.graphLinks.length,8);binary.writeUInt32LE(pointOffset,12);
for(const a of arrays)binary.set(new Uint8Array(a.data.buffer,a.data.byteOffset,a.data.byteLength),a.offset);
manifest.core=emit('routing',binary);
const {graphNodes,graphLinks,...meta}=raw;manifest.meta=json('street-meta',meta);
const roads=JSON.parse(gunzipSync(readFileSync(new URL('public/data/taipei-roads-v1.json.gz',root))));
const buildings=JSON.parse(gunzipSync(readFileSync(new URL('public/data/taipei-buildings-v1.json.gz',root))));
function subset(items,predicate,index){const selected=[],mapping=new Map();items.forEach((r,i)=>{if(predicate(r)){mapping.set(i,selected.length);selected.push(r);}});return {selected,index:Object.fromEntries(Object.entries(index).map(([k,ids])=>[k,ids.filter(i=>mapping.has(i)).map(i=>mapping.get(i))]).filter(([,ids])=>ids.length))};}
for(const d of base.districts){
 const r=subset(roads.roads,r=>r.districtIds.includes(d.id),roads.cellIndex),b=subset(buildings.buildings,b=>b[8].includes(d.id),buildings.index);
 const roadData={...roads,roads:r.selected,cellIndex:r.index},buildingData={...buildings,buildings:b.selected,index:b.index};
 const allBounds=[...r.selected.map(r=>r.bounds),...b.selected.map(b=>b[6])];
 const bounds=[Math.min(...allBounds.map(b=>b[0])),Math.min(...allBounds.map(b=>b[1])),Math.max(...allBounds.map(b=>b[2])),Math.max(...allBounds.map(b=>b[3]))];
 manifest.districts.push({id:d.id,bounds,roads:json(`roads-${d.id}`,roadData),buildings:json(`buildings-${d.id}`,buildingData)});
}
// Only remove this generator's obsolete hashed files within its exact output directory.
for(const file of readdirSync(out))if(/^(routing|street-meta|base-map|roads-630\d{4}|buildings-630\d{4})\.[a-f0-9]{16}\.gz$/.test(file)&&!written.has(file))unlinkSync(new URL(file,out));
writeFileSync(new URL('manifest.json',out),JSON.stringify(manifest,null,2)+'\n');
writeFileSync(new URL('src/data/map-packages.json',root),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({revision:manifest.revision,core:manifest.core,meta:manifest.meta,districts:manifest.districts.map(d=>({id:d.id,roads:d.roads.gzipBytes,buildings:d.buildings.gzipBytes}))},null,2));

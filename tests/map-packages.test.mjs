import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';
import {manifest,readPackage,readJsonPackage,viewDistricts,packageCache} from '../src/map-packages.ts';
import {loadStreetRuntime,decodeRouting} from '../src/game/street-runtime.ts';
import {mergeRoads,mergeBuildings} from '../src/district-packages.ts';
import {validRoadData,roadsInView,coarseRoadCells,roadGroups} from '../src/road-map.ts';
import {decodeBuildings,buildingsInView} from '../src/building-map.ts';
import {cellsInBounds} from '../src/map-cell-index.ts';
const source=()=>JSON.parse(readFileSync(new URL('../src/data/taipei-street-map-v2.json',import.meta.url),'utf8'));
const snapshot=file=>JSON.parse(gunzipSync(readFileSync(new URL(`../public/data/${file}`,import.meta.url))));
test('packed routing retains every ordered link, coordinate, metre, direction and anchor exactly',async()=>{
 const raw=source(),{graph,meta}=await loadStreetRuntime();assert.equal(meta.revision,raw.revision);const {graphNodes,graphLinks,...rest}=raw;assert.deepEqual(meta,rest);assert.equal(graph.nodeCount,graphNodes.length);assert.equal(graph.linkCount,graphLinks.length);
 graphNodes.forEach((n,i)=>{assert.equal(graph.xy[i*2],n[0]);assert.equal(graph.xy[i*2+1],n[1]);assert.equal(graph.cell[i],n[2]);});
 graphLinks.forEach((e,i)=>{assert.equal(graph.links[i*3],e[0]);assert.equal(graph.links[i*3+1],e[1]);assert.equal(graph.metres[i],e[2]);assert.equal(graph.links[i*3+2],e[3]);assert.equal(graph.both[i],e[5]);assert.deepEqual(Array.from(graph.points.subarray(graph.pointOffsets[i],graph.pointOffsets[i+1])),e[4]);});
});
test('all twelve district packages retain complete source features and search names',async()=>{
 const fullRoads=snapshot('taipei-roads-v1.json.gz'),fullBuildings=decodeBuildings(snapshot('taipei-buildings-v1.json.gz'));
 for(const d of manifest.districts){const roads=await readJsonPackage(d.roads),buildings=decodeBuildings(await readJsonPackage(d.buildings));assert.ok(validRoadData(roads));assert.deepEqual(roads.roads,fullRoads.roads.filter(r=>r.districtIds.includes(d.id)));assert.deepEqual(buildings.buildings,fullBuildings.buildings.filter(b=>b.districtIds.includes(d.id)));assert.deepEqual(roadGroups(roads.roads,'en'),roadGroups(fullRoads.roads.filter(r=>r.districtIds.includes(d.id)),'en'));}
});
test('border view packages merge without duplicates or missing roads/buildings',async()=>{
 const {base,meta}=await loadStreetRuntime(),fullRoads=snapshot('taipei-roads-v1.json.gz'),fullBuildings=decodeBuildings(snapshot('taipei-buildings-v1.json.gz'));
 // Every district anchor, wide border view and north/south extremities.
 const spots=base.districts.map(d=>{const i=meta.districtAnchors[d.id],[q,r]=meta.cells[i];return {id:d.id,x:50*Math.sqrt(3)*(q+r/2),y:75*r};});
 spots.push({id:'6300100',x:8000,y:10000},{id:'6300800',x:6000,y:22000});
 for(const s of spots){const bounds={x:s.x-1700,y:s.y-1200,width:3400,height:2400},ids=viewDistricts(s.id,bounds);const chunks=await Promise.all(ids.map(async id=>{const d=manifest.districts.find(d=>d.id===id);return {r:await readJsonPackage(d.roads),b:decodeBuildings(await readJsonPackage(d.buildings))};}));const r=mergeRoads(chunks.map(c=>c.r)),b=mergeBuildings(chunks.map(c=>c.b));assert.equal(new Set(r.roads.map(r=>r.id)).size,r.roads.length);assert.equal(new Set(b.buildings.map(b=>b.id)).size,b.buildings.length);
 const cellIds=Object.keys(fullRoads.cellIndex),wanted=roadsInView(fullRoads,cellIds,bounds,'all').map(r=>r.id).sort();assert.deepEqual(roadsInView(r,cellIds,bounds,'all').map(r=>r.id).sort(),wanted);assert.deepEqual(buildingsInView(b,bounds).map(b=>b.id).sort(),buildingsInView(fullBuildings,bounds).map(b=>b.id).sort());}
});
test('package integrity failures and truncated binary cannot silently initialize a map',async()=>{
 await assert.rejects(readPackage({...manifest.core,sha256:'0'.repeat(64)}));await assert.rejects(readPackage({...manifest.core,bytes:12}));const bytes=await readPackage(manifest.core);assert.throws(()=>decodeRouting(bytes.slice(0,40)));const bad=bytes.slice(0);new DataView(bad).setUint32(0,0,true);assert.throws(()=>decodeRouting(bad));
});
test('district cache coalesces requests, bounds concurrent loads, evicts and retries failures',async()=>{
 let active=0,peak=0,calls=0,fail=true;const releases=[];const cache=packageCache(2,async id=>{calls++;active++;peak=Math.max(peak,active);await new Promise(r=>releases.push(r));active--;if(id==='bad'&&fail){fail=false;throw Error('failed');}return id;});
 const a=cache.get('a'),duplicate=cache.get('a'),b=cache.get('b'),c=cache.get('c');await new Promise(setImmediate);assert.equal(calls,2);releases.splice(0).forEach(r=>r());await new Promise(setImmediate);assert.equal(calls,3);releases.splice(0).forEach(r=>r());assert.deepEqual(await Promise.all([a,duplicate,b,c]),['a','a','b','c']);assert.equal(peak,2);assert.deepEqual(cache.keys(),['b','c']);
 const first=cache.get('bad');await new Promise(setImmediate);releases.shift()();await assert.rejects(first);const retry=cache.get('bad');await new Promise(setImmediate);releases.shift()();assert.equal(await retry,'bad');assert.equal(cache.keys().length,2);
});
test('indexed viewport cells preserve the full-scan ordering and exact boundary hits',()=>{
 const cells=Array.from({length:41000},(_,i)=>({id:String(i),x:(i%200)*86.6-4000,y:Math.floor(i/200)*75-1500}));for(const bounds of [{x:0,y:0,width:1000,height:720},{x:-4220,y:-1720,width:1000,height:720},{x:3000,y:7000,width:6800,height:4800}])assert.deepEqual(cellsInBounds(cells,bounds),cells.filter(c=>c.x>bounds.x-220&&c.x<bounds.x+bounds.width+220&&c.y>bounds.y-220&&c.y<bounds.y+bounds.height+220));
});

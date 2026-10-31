import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { validRoadData,roadName,roadGroups,roadMatches,roadsInView,labelRoads } from '../src/road-map.ts';
import { cells,districts } from '../src/game/campaign-map.ts';
import { initialCampaign } from '../src/game/campaign.ts';
const data=JSON.parse(gunzipSync(readFileSync(new URL('../public/data/taipei-roads-v1.json.gz',import.meta.url))));
const at=id=>{const d=districts.find(d=>d.id===id);return (data.cellIndex[d.anchor]??[]).map(i=>data.roads[i]);};
test('frozen real-road data has the correct projection, twelve districts and traceable ODbL source',()=>{
 assert.ok(validRoadData(data));assert.equal(data.roads.length,66081);assert.equal(data.source.dataTimestamp,'2026-10-29T21:21:26Z');
 const raw=readFileSync(new URL('../design/assets/taipei-roads-osm-source.json.gz',import.meta.url));assert.equal(createHash('sha256').update(raw).digest('hex'),data.source.sourceSha256);
 for(const d of districts)assert.ok(data.districtCounts[d.id]>0);assert.match(readFileSync(new URL('../public/data/ROAD-DATA-LICENSE.txt',import.meta.url),'utf8'),/OpenStreetMap contributors/);
});
test('real streets intersect the expected landmark hexes across all twelve districts',()=>{
 const expected={'6300100':'饒河街','6300200':'信義路五段','6300300':'信義路三段','6300400':'中山北路三段','6300500':'中山南路','6300600':'環河北路一段','6300700':'廣州街','6300800':'新光路二段','6300900':'南港路二段','6301000':'碧山路','6301100':'至善路二段113巷','6301200':'光明路'};
 for(const [id,name] of Object.entries(expected))assert.ok(at(id).some(r=>r.name['zh-TW']===name),`${id}: ${name}`);
});
test('the spatial index uses actual game hex IDs and valid road indices, without invented walking permissions',()=>{
 for(const [id,indices] of Object.entries(data.cellIndex)){assert.ok(cells.has(id));assert.equal(new Set(indices).size,indices.length);for(const index of indices)assert.ok(data.roads[index]);}
 assert.ok(data.roads.some(r=>r.bridge==='yes'));assert.ok(data.roads.some(r=>r.tunnel==='yes'));assert.ok(data.roads.some(r=>r.layer!=='0'));
 assert.ok(data.roads.every(r=>r.foot==='unknown'&&r.access==='unknown'));assert.ok(data.source.fieldsNotProvided.includes('foot'));
 assert.ok(data.roads.filter(r=>r.highway==='motorway'||r.highway==='motorway_link').every(r=>r.restricted));
});
test('viewport culling and class filters do not create extra segments or change campaign state',()=>{
 const g=initialCampaign(),before=JSON.stringify(g),d=districts.find(d=>d.id==='6300700'),c=cells.get(d.anchor),bounds={x:c.x-1700,y:c.y-1224,width:3400,height:2448};
 const candidates=[...cells.values()].filter(c=>c.x>bounds.x-220&&c.x<bounds.x+3620&&c.y>bounds.y-220&&c.y<bounds.y+2668).map(c=>c.id);
 const all=roadsInView(data,candidates,bounds,'all');assert.ok(all.length>0);assert.equal(new Set(all.map(r=>r.id)).size,all.length);
 for(const filter of ['arterial','local','path']){const roads=roadsInView(data,candidates,bounds,filter);assert.ok(roads.length>0);assert.ok(roads.every(r=>roadMatches(r,filter)&&all.includes(r)));}
 assert.deepEqual(roadsInView(data,candidates,{x:-100000,y:-100000,width:10,height:10},'all'),[]);assert.equal(JSON.stringify(g),before);
});
test('name search groups source segments, handles normalized queries and never invents missing English names',()=>{
 const roads=at('6300200'),before=JSON.stringify(roads),groups=roadGroups(roads,'en','信義');assert.ok(groups.some(g=>g.name==='信義路五段'));
 const r=roads.find(r=>r.name['zh-TW']==='信義路五段');assert.equal(roadName(r,'en'),'信義路五段');assert.equal(roadName({...r,name:{'zh-TW':'','en':''},ref:'106'},'en'),'106');
 const fixture={...r,name:{'zh-TW':'測試路','en':'Test Street'}};assert.equal(roadGroups([fixture],'en','ｔｅｓｔ')[0].name,'Test Street');assert.equal(JSON.stringify(roads),before);
});
test('street labels have bounded density and keep clear of activity nodes and each other',()=>{
 const d=districts.find(d=>d.id==='6300700'),c=cells.get(d.anchor),bounds={x:c.x-1700,y:c.y-1224,width:3400,height:2448};
 const roads=data.roads.filter(r=>r.districtIds.includes(d.id));
 for(const pixels of [330,840]){const result=labelRoads(roads,bounds,pixels,[[c.x,c.y]]);assert.ok(result.labels.length>0&&result.labels.length<=(pixels<600?4:10));assert.equal(new Set(result.labels.map(l=>roadName(l.road,'zh-TW'))).size,result.labels.length);for(const l of result.labels){assert.ok(l.x-l.width/2>bounds.x&&l.x+l.width/2<bounds.x+bounds.width);assert.ok(Math.hypot(l.x-c.x,l.y-c.y)>=160);}for(let i=0;i<result.labels.length;i++)for(let j=i+1;j<result.labels.length;j++){const a=result.labels[i],b=result.labels[j];assert.ok(Math.abs(a.x-b.x)>=(a.width+b.width)/2||Math.abs(a.y-b.y)>=a.height);}}
});
test('invalid projections, geometry, duplicate IDs and corrupt indices are rejected before rendering',()=>{
 const r=data.roads[0],small={...data,roads:[r],cellIndex:{[districts[0].anchor]:[0]}};assert.ok(validRoadData(small));
 for(const invalid of [{...small,projection:'EPSG:4326'},{...small,origin:[0,0]},{...small,roads:[r,r]},{...small,roads:[{...r,points:[[NaN,1],[2,3]]}]},{...small,roads:[{...r,bounds:[4,4,2,2]}]},{...small,cellIndex:{bad:[0]}},{...small,cellIndex:{[districts[0].anchor]:[1]}}])assert.equal(validRoadData(invalid),false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { decodeBuildings,buildingsInView,buildingsInHex,buildingName,buildingPath } from '../src/building-map.ts';
import { decodeSurface,surfaceHeight,surfaceContours,surfaceProfile } from '../src/surface-map.ts';
import { initialCampaign,route,movement,campaignCommand } from '../src/game/campaign.ts';
import { mapFor } from '../src/game/campaign-map.ts';
import { encodeSave,decodeSave } from '../src/game/campaign-save.ts';
const packed=JSON.parse(gunzipSync(readFileSync(new URL('../public/data/taipei-buildings-v1.json.gz',import.meta.url))));
const buildings=decodeBuildings(packed),surface=decodeSurface(JSON.parse(gunzipSync(readFileSync(new URL('../public/data/taipei-surface-v1.json.gz',import.meta.url)))));

test('78,449 individual building features retain source IDs, holes and explicitly unknown heights',()=>{
 assert.equal(buildings.buildings.length,78449);assert.equal(new Set(buildings.buildings.map(b=>b.id)).size,78449);assert.equal(buildings.source.dataTimestamp,'2026-10-29T21:21:26Z');
 assert.equal(buildings.source.extractSha256,createHash('sha256').update(readFileSync(new URL('../design/assets/taipei-buildings-source.json.gz',import.meta.url))).digest('hex'));
 assert.equal(buildings.buildings.filter(b=>b.height!==null).length,6107);assert.equal(buildings.buildings.filter(b=>b.levels!==null).length,25330);assert.equal(buildings.buildings.filter(b=>b.polygons.some(p=>p.length>1)).length,283);
 for(const b of buildings.buildings)if(!b.name.en)assert.equal(buildingName(b,'en'),b.name['zh-TW']);
 const holed=buildings.buildings.find(b=>b.polygons.some(p=>p.length>1));assert.equal((buildingPath(holed).match(/Z/g)??[]).length,holed.polygons.reduce((n,p)=>n+p.length,0));
});

test('building spatial query is complete, deduplicated and respects courtyard interiors',()=>{
 const g=initialCampaign(1,'blue','streets-v2'),m=mapFor(g);for(const d of m.districts){const c=m.cells.get(d.anchor),bounds={x:c.x-500,y:c.y-400,width:1000,height:800},found=buildingsInView(buildings,bounds);assert.ok(found.length>0,d.id);assert.equal(new Set(found.map(b=>b.id)).size,found.length);const brute=buildings.buildings.filter(b=>b.bounds[0]<=bounds.x+1000&&b.bounds[2]>=bounds.x&&b.bounds[1]<=bounds.y+800&&b.bounds[3]>=bounds.y);assert.deepEqual(new Set(found.map(b=>b.id)),new Set(brute.map(b=>b.id)));}
 const feature={id:'w1',name:{'zh-TW':'','en':''},kind:'yes',height:null,levels:null,minHeight:null,bounds:[-100,-100,100,100],polygons:[[[[-100,-100],[100,-100],[100,100],[-100,100],[-100,-100]],[[-50,-50],[50,-50],[50,50],[-50,50],[-50,-50]]]],districtIds:['6300500']};
 const fixture={...buildings,buildings:[feature],index:{'-1,-1':[0],'-1,0':[0],'0,-1':[0],'0,0':[0]}};
 assert.equal(buildingsInHex(fixture,{x:0,y:0},20).length,0,'a hex entirely in a courtyard is not a building');assert.equal(buildingsInHex(fixture,{x:70,y:0},15).length,1);assert.equal(buildingsInHex(fixture,{x:105,y:0},15).length,1,'boundary intersection counts');
});

test('surface is the frozen 2021 public GLO-30 DSM, with valid city mask and source hashes',()=>{
 assert.equal(surface.source.model,'DSM');assert.equal(surface.source.release,'2021');assert.equal(surface.source.verticalDatum,'EGM2008 (EPSG:3855)');assert.match(surface.source.acquisition,/2011/);assert.equal(surface.step,30);assert.equal(surface.values.filter(v=>v!==surface.nodata).length,298380);assert.equal(surface.source.sourceSubsetSha256,createHash('sha256').update(readFileSync(new URL('../design/assets/taipei-copdem-30m.tif',import.meta.url))).digest('hex'));
 const valid=surface.values.filter(v=>v!==surface.nodata);assert.ok(Math.max(...valid.slice(0,10000))<20000);assert.ok(valid.some(v=>v>10000));assert.ok(valid.some(v=>v<0));assert.ok(surface.values.includes(surface.nodata));
 const m=mapFor(initialCampaign(1,'blue','streets-v2'));for(const d of m.districts){const c=m.cells.get(d.anchor),height=surfaceHeight(surface,...c.roadPoint);assert.ok(height!==null&&height>-50&&height<1500,d.id);}
});

test('bilinear sampling honours pixel centres, edges and nodata instead of inventing heights',()=>{
 const d={...surface,x:0,y:0,width:2,height:2,values:[0,100,200,300]};assert.equal(surfaceHeight(d,15,15),0);assert.equal(surfaceHeight(d,30,30),15);assert.equal(surfaceHeight(d,45,45),30);assert.equal(surfaceHeight(d,-1,15),null);
 const missing={...d,values:[0,100,200,d.nodata]};assert.equal(surfaceHeight(missing,30,30),null);assert.equal(surfaceHeight(missing,15,15),0);assert.equal(surfaceHeight(missing,45,45),null);
 const p=surfaceProfile(missing,[[15,15],[30,30],[45,45]]);assert.equal(p.samples.length,3);assert.equal(p.missing,2);assert.equal(p.min,0);assert.equal(p.max,0);assert.ok(p.metres>0);
});

test('surface contours are culled to the viewport and never join disjoint nodata segments',()=>{
 const c=surface.contours.find(c=>c[1].length>3),[x,y]=c[1][0],bounds={x:x-50,y:y-50,width:100,height:100};const result=surfaceContours(surface,bounds);assert.ok(result.length);assert.ok(result.every(c=>c.height%50===0));for(const row of result)for(const [a,b,c,d] of row.lines)assert.ok(Math.min(a,c)<=bounds.x+100&&Math.max(a,c)>=bounds.x&&Math.min(b,d)<=bounds.y+100&&Math.max(b,d)>=bounds.y);
});

test('viewing buildings and satellite profiles never changes AP, routes, seed, rules or save compatibility',()=>{
 const g=initialCampaign(1,'blue','streets-v2');g.news='clear';const u=g.units[0],to=[...movement(g,u).costs].find(([id,c])=>c>=3&&c<6)[0],before=JSON.stringify(g),p=route(g,u,to),cost=p.cost;
 buildingsInView(buildings,{x:0,y:29000,width:1500,height:1000});surfaceProfile(surface,p.geometry);assert.equal(JSON.stringify(g),before);assert.equal(route(g,u,to).cost,cost);
 const moved=campaignCommand(g,{type:'move',unitId:u.id,cellId:to});assert.equal(moved.error,undefined);assert.equal(moved.game.units[0].ap,u.ap-cost);
 const s={game:moved.game,selected:u.id,districtId:mapFor(g).cells.get(to).districtId,view:'street'},save=encodeSave(s);assert.equal(save.version,4);assert.equal(save.rules,'0.16.0');assert.deepEqual(decodeSave(JSON.stringify(save)).save.session,s);
});

test('corrupt footprints, duplicate IDs, invalid grids and nonsurface model declarations are rejected',()=>{
 const tiny={...packed,buildings:[packed.buildings[0]],index:{'0,0':[0]}};assert.ok(decodeBuildings(tiny));assert.throws(()=>decodeBuildings({...tiny,buildings:[...tiny.buildings,...tiny.buildings]}));assert.throws(()=>decodeBuildings({...tiny,projection:'EPSG:4326'}));assert.throws(()=>decodeBuildings({...tiny,index:{'0,0':[99]}}));const broken=structuredClone(tiny);broken.buildings[0][7][0][0][0][0]=Infinity;assert.throws(()=>decodeBuildings(broken));assert.throws(()=>decodeSurface({...surface,source:{...surface.source,model:'DTM'}}));assert.throws(()=>decodeSurface({...surface,values:surface.values.slice(1)}));assert.throws(()=>decodeSurface({...surface,step:1}));
});

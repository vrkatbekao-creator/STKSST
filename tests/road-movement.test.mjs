import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { initialCampaign,movement,route,routeFromMovement,campaignCommand,endCampaignPhase,intelligence } from '../src/game/campaign.ts';
import { mapFor,routingNodes,routingEdges,routingOutgoing,streetWays,streetSource,hexDistance,roadWalkCells,walkGeometry } from '../src/game/campaign-map.ts';
import { roadEffort,roadAPCost } from '../src/game/road-movement.ts';
import { planNodeVisit } from '../src/game/campaign-plans.ts';
import { encodeSave,decodeSave,validSession } from '../src/game/campaign-save.ts';
import { createCampaignStore } from '../src/game/campaign-store.ts';
import { roadsInHex,coarseRoadCells } from '../src/road-map.ts';
const fresh=(team='blue')=>{const g=initialCampaign(1,team,'streets-v2');g.news='clear';g.surprise=null;return g;};
const session=g=>({game:g,selected:`${g.playerTeam}1`,districtId:mapFor(g).cells.get(g.units.find(u=>u.id===`${g.playerTeam}1`).cellId).districtId,view:'street'});
const act=(g,cmd)=>{const out=campaignCommand(g,cmd);assert.equal(out.error,undefined,JSON.stringify(cmd));return out.game;};

test('100 m shared tactical lattice uses source topology, preserves grade tags and excludes expressways',()=>{
 const g=fresh(),m=mapFor(g);assert.equal(m.campaignMap.radiusMetres,50);assert.equal(m.cells.size,41336);assert.equal(m.nodes.length,378);assert.ok(streetSource.audit.maxNodeSnap<=161);
 for(const c of m.cells.values())for(const id of c.neighbors)assert.equal(hexDistance(c,m.cells.get(id)),1);
 for(const w of streetWays.values()){assert.ok(!['motorway','motorway_link','trunk','trunk_link'].includes(w.highway));assert.ok(['unknown','yes','designated','permissive','official'].includes(w.foot));if(w.highway==='cycleway')assert.notEqual(w.foot,'unknown');}
 assert.ok([...streetWays.values()].some(w=>w.bridge!=='no'));assert.ok([...streetWays.values()].some(w=>w.tunnel!=='no'));assert.ok([...streetWays.values()].some(w=>w.layer!=='0'));assert.ok([...streetWays.values()].some(w=>w.foot==='unknown'&&w.assumed));
 for(const e of routingEdges){assert.ok(streetWays.has(e.wayId));assert.deepEqual(e.points[0],[routingNodes[e.from].x,routingNodes[e.from].y]);assert.deepEqual(e.points.at(-1),[routingNodes[e.to].x,routingNodes[e.to].y]);assert.ok(e.metres>0);}
});

test('all district anchors and 60 activity nodes are reachable both ways through the full road graph',()=>{
 const m=mapFor(fresh()),start=m.cells.get(m.districts[0].anchor).roadNode,seen=new Set([start]),queue=[start];for(let i=0;i<queue.length;i++)for(const id of routingOutgoing[queue[i]]){const n=routingEdges[id].to;if(!seen.has(n)){seen.add(n);queue.push(n);}}
 assert.equal(seen.size,routingNodes.length);for(const n of m.nodes)assert.ok(seen.has(m.cells.get(n.cellId).roadNode),n.id);
 const incoming=routingNodes.map(()=>[]);for(const e of routingEdges)incoming[e.to].push(e.from);const back=new Set([start]),q=[start];for(let i=0;i<q.length;i++)for(const n of incoming[q[i]])if(!back.has(n)){back.add(n);q.push(n);}assert.equal(back.size,routingNodes.length);
});

test('Wanhua and Xinyi preview, AP deduction, road geometry and saved ordered walks agree',()=>{
 for(const district of ['6300700','6300200']){let g=fresh();const m=mapFor(g),anchor=m.districts.find(d=>d.id===district).anchor,u=g.units.find(u=>u.cellId===anchor)??g.units[0];u.cellId=anchor;const walk=movement(g,u),to=[...walk.costs].find(([id,c])=>c>=4&&c<=7&&id!==u.cellId)[0],p=routeFromMovement(u,to,walk);assert.ok(p.edgeIds.length);assert.equal(p.cost,roadAPCost(p.edgeIds.reduce((sum,id)=>sum+roadEffort(g,id,u.team),0)));assert.deepEqual(p.path,roadWalkCells(p.edgeIds));assert.deepEqual(p.geometry,walkGeometry(p.path,p.edgeIds));assert.ok(p.geometry.length>=p.path.length);
  const before=u.ap;g=act(g,{type:'move',unitId:u.id,cellId:to});assert.equal(g.units.find(v=>v.id===u.id).ap,before-p.cost);assert.deepEqual(g.trail.blue.walks[0].edgeIds,p.edgeIds);assert.ok(validSession(session(g)));const encoded=encodeSave(session(g),'2026-10-31T22:00:00Z');assert.equal(encoded.version,5);assert.equal(encoded.mapRevision,streetSource.revision);assert.deepEqual(decodeSave(JSON.stringify(encoded)).save.session,session(g));
 }
});

test('distance penalties share the command formula; occupancy and unaffordable moves are atomic',()=>{
 const g=fresh(),u=g.units[0],walk=movement(g,u),to=[...walk.costs].find(([id,c])=>c>=3&&c<=5)[0],p=routeFromMovement(u,to,walk);const rain=structuredClone(g);rain.news='rain';assert.ok(Math.abs(p.edgeIds.reduce((n,id)=>n+roadEffort(rain,id,u.team),0)-1.25*p.edgeIds.reduce((n,id)=>n+roadEffort(g,id,u.team),0))<1e-6);
 const stairs=routingEdges.find(e=>streetWays.get(e.wayId).highway==='steps');assert.ok(stairs);assert.equal(roadEffort(g,stairs.id,u.team),stairs.metres*1.5);
 const works=structuredClone(g),district=mapFor(g).cells.get(routingNodes[p.edgeIds[0]===undefined?0:routingEdges[p.edgeIds[0]].to].cellId).districtId;works.surprise={id:'streetworks',districtId:district,responses:{blue:null,green:null,white:null}};assert.ok(roadEffort(works,p.edgeIds[0],u.team)>roadEffort(g,p.edgeIds[0],u.team));works.surprise.responses.blue='adapt';assert.equal(roadEffort(works,p.edgeIds[0],u.team),roadEffort(g,p.edgeIds[0],u.team));
 const poor=structuredClone(g);poor.units[0].ap=0;const failed=campaignCommand(poor,{type:'move',unitId:u.id,cellId:to});assert.ok(failed.error);assert.equal(failed.game,poor);const occupied=structuredClone(g);occupied.units[3].cellId=to;assert.equal(route(occupied,occupied.units[0],to),null);
});

test('road travel uses 200-metre AP bands with one AP minimum and no per-edge rounding',()=>{
 assert.equal(roadAPCost(.01),1);assert.equal(roadAPCost(200),1);assert.equal(roadAPCost(200.001),2);assert.equal(roadAPCost(1000),5);assert.equal(roadAPCost(1250),7);
 const g=fresh(),u=g.units[0],walk=movement(g,u,5);assert.equal(walk.costs.get(u.cellId),0);
 const candidate=[...walk.costs].map(([id])=>routeFromMovement(u,id,walk)).find(p=>p.edgeIds.length>2&&p.metres>800&&p.metres<=1000&&p.edgeIds.every(id=>streetWays.get(routingEdges[id].wayId).highway!=='steps'));
 assert.ok(candidate);assert.equal(candidate.cost,5);assert.ok(candidate.cost<Math.ceil(candidate.metres/100));assert.ok(candidate.edgeIds.length>candidate.cost);
 const limited=movement(g,u,4);assert.equal(limited.costs.has(candidate.path.at(-1)),false);
 const exact=structuredClone(g);exact.units[0].ap=5;const moved=act(exact,{type:'move',unitId:u.id,cellId:candidate.path.at(-1)});assert.equal(moved.units[0].ap,0);assert.equal(exact.units[0].ap,5);
});

test('rain, stairs and construction use bounded additive effort and faction-specific mitigation',()=>{
 const g=fresh(),stairs=routingEdges.find(e=>streetWays.get(e.wayId).highway==='steps'),flat=routingEdges.find(e=>streetWays.get(e.wayId).highway!=='steps');
 assert.equal(roadEffort(g,flat.id,'blue'),flat.metres);g.news='rain';assert.equal(roadEffort(g,flat.id,'blue'),flat.metres*1.25);
 g.surprise={id:'streetworks',districtId:mapFor(g).cells.get(routingNodes[stairs.to].cellId).districtId,responses:{blue:null,green:null,white:null}};
 assert.equal(roadEffort(g,stairs.id,'blue'),stairs.metres*2.25);g.surprise.responses.blue='adapt';assert.equal(roadEffort(g,stairs.id,'blue'),stairs.metres*1.75);assert.equal(roadEffort(g,stairs.id,'green'),stairs.metres*2.25);
});

test('save round-trips keep spent AP and history while the next road move uses the new rate',()=>{
 const g=fresh(),u=g.units[0];u.ap=7;const oldSession=session(g),raw=JSON.stringify(encodeSave(oldSession,'2026-11-01T20:00:00Z')),restored=decodeSave(raw).save.session;
 assert.deepEqual(restored,oldSession);assert.equal(restored.game.units[0].ap,7);
 const target=[...movement(restored.game,restored.game.units[0]).costs].find(([,cost])=>cost===3)[0],next=act(restored.game,{type:'move',unitId:u.id,cellId:target});assert.equal(next.units[0].ap,4);assert.equal(g.units[0].ap,7);
 const legacy=initialCampaign(1);legacy.news='rain';legacy.surprise=null;const legacyWalk=movement(legacy,legacy.units[0]);const neighbour=mapFor(legacy).cells.get(legacy.units[0].cellId).neighbors.find(id=>legacyWalk.costs.get(id)===2);assert.ok(neighbour);assert.equal(legacyWalk.costs.get(neighbour),2);
});

test('move-and-canvass reserves outreach AP and matches the legal two-command sequence for all factions',()=>{
 for(const team of ['blue','green','white']){const g=fresh(team),u=g.units.find(u=>u.id===`${team}1`),m=mapFor(g),plans=m.nodes.map(n=>planNodeVisit(g,u,n.id)),p=plans.find(p=>p.canAct&&p.moveAp>0);assert.ok(p,team);const separate=act(act(g,{type:'move',unitId:u.id,cellId:p.destination}),{type:'canvass',unitId:u.id,nodeId:p.nodeId});assert.deepEqual(act(g,{type:'canvassRoute',unitId:u.id,nodeId:p.nodeId}),separate);const poor=structuredClone(g);poor.resources[team].materials=0;const failed=campaignCommand(poor,{type:'canvassRoute',unitId:u.id,nodeId:p.nodeId});assert.equal(failed.game,poor);assert.equal(failed.error,'c_errorMaterials');}
});

test('new saves reject forged road histories and map revisions; legacy saves retain positions and rules',()=>{
 let g=fresh();const u=g.units[0],to=[...movement(g,u).costs].find(([id,c])=>c>=4)[0];g=act(g,{type:'move',unitId:u.id,cellId:to});const s=session(g),forged=structuredClone(s);forged.game.trail.blue.walks[0].edgeIds.reverse();assert.equal(validSession(forged),false);const mixed=structuredClone(s);mixed.game.units[0].cellId=initialCampaign().units[0].cellId;assert.equal(validSession(mixed),false);const wrong=encodeSave(s);wrong.mapRevision='obsolete';assert.equal(decodeSave(JSON.stringify(wrong)).error,'c_saveIncompatible');
 const legacy=session(initialCampaign());const old=encodeSave(legacy);assert.equal(old.version,5);assert.equal(old.map,'taipei-hex-v1');const port={getItem:()=>JSON.stringify(old),setItem:()=>{}};const store=createCampaignStore(port,'streets-v2');store.getState().resume();assert.deepEqual(store.getState().game,legacy.game);store.getState().menu();assert.equal(store.getState().game.movementProfile,'streets-v2');
});

test('new-mode opponents use road walks and a complete 28-day game preserves polling blackout and deterministic continuation',()=>{
 const play=()=>{let g=fresh('white');for(let day=1;day<=28;day++){const night=endCampaignPhase(g);assert.equal(night.units[0].ap,g.units[0].ap);g=endCampaignPhase(night);assert.ok(validSession(session(g)),`day ${day}`);if(g.day>=15&&!g.result)assert.equal(intelligence(g).kind,'rumor');if(day===1){assert.ok(g.trail.blue.walks.length+g.trail.green.walks.length>0);for(const team of ['blue','green'])for(const w of g.trail[team].walks)assert.ok(w.edgeIds.length);const out=decodeSave(JSON.stringify(encodeSave(session(g))));assert.deepEqual(out.save.session.game,g);}}return g;};
 const g=play();assert.equal(g.day,28);assert.equal(g.phase,'night');assert.ok(g.result);assert.equal(intelligence(g).kind,'result');assert.deepEqual(g.pollHistory.map(p=>p.releasedDay),[2,4,6,8,10,12,14]);assert.deepEqual(play(),g);
});

test('fine-hex road inspection uses exact intersection with the coarse spatial index',()=>{
 const data=JSON.parse(gunzipSync(readFileSync(new URL('../public/data/taipei-roads-v1.json.gz',import.meta.url))));const m=mapFor(fresh());for(const district of ['6300700','6300200']){const c=m.cells.get(m.districts.find(d=>d.id===district).anchor);assert.ok(coarseRoadCells([c]).length>=7);const roads=roadsInHex(data,c,50);assert.ok(roads.length);assert.ok(roads.every(r=>r.bounds[0]<=c.x+50&&r.bounds[2]>=c.x-50&&r.bounds[1]<=c.y+50&&r.bounds[3]>=c.y-50));}
});

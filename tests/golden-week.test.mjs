import test from 'node:test';
import assert from 'node:assert/strict';
import {initialCampaign,campaignCommand,endCampaignPhase,movement,routeFromMovement,actionCost,chooseCommander} from '../src/game/campaign.ts';
import {mapFor,allCells,axialAt,routingNodes,routingEdges,roadWalkCells} from '../src/game/campaign-map.ts';
import {roadAPCost} from '../src/game/road-movement.ts';
import {boardingWalkCharge} from '../src/game/vehicle-cost.ts';
import {assistError,supportAPCap} from '../src/game/campaign-growth.ts';
import {encodeSave,decodeSave,validSession} from '../src/game/campaign-save.ts';
const fresh=()=>({...initialCampaign(17,'blue','streets-v2'),news:'clear',surprise:null});
const session=game=>({game,selected:'blue1',districtId:allCells.get(game.units[0].cellId).districtId,view:'street'});
const act=(g,cmd)=>{const out=campaignCommand(g,{unitId:'blue1',...cmd});assert.equal(out.error,undefined);return out.game;};

test('300 m grid preserves the source graph and assigns all venues and anchors to their district',()=>{
 const g=fresh(),m=mapFor(g);assert.equal(m.campaignMap.radiusMetres,150);assert.equal(m.cells.size,4594);
 assert.equal(routingNodes.length,234577);assert.ok(routingEdges.length>276502);assert.equal(m.nodes.length,378);
 for(const c of m.cells.values())if(c.walkable){const a=axialAt(...c.roadPoint,150);assert.deepEqual(a,{q:c.q,r:c.r});}
 for(const n of m.nodes){const c=m.cells.get(n.cellId);assert.ok(c.walkable);assert.equal(c.districtId,n.districtId);assert.ok(Number.isFinite(n.snapMetres));}
 assert.equal(new Set(g.units.map(u=>u.cellId)).size,9);
});

test('walking credit is cumulative across short moves, day and night, and persists through save/resume',()=>{
 let g=fresh(),u=g.units[0],walk=movement(g,u,1);
 const destination=[...walk.costs].find(([id,ap])=>id!==u.cellId&&ap===1&&routeFromMovement(u,id,walk).effort<900)[0];
 const before=u.ap;g=act(g,{type:'move',cellId:destination});u=g.units[0];assert.equal(u.ap,before-1);assert.equal(u.walkCredit,1800);
 const stored=decodeSave(JSON.stringify(encodeSave(session(g))));assert.equal(stored.error,null);assert.deepEqual(stored.save.session.game,g);
 g=endCampaignPhase(stored.save.session.game);u=g.units[0];assert.equal(u.ap,before+3);assert.equal(u.walkCredit,1800);
 const free=[...movement(g,u,0).costs].find(([id])=>id!==u.cellId);assert.ok(free);
 const after=act(g,{type:'move',cellId:free[0]});assert.equal(after.units[0].ap,u.ap);assert.ok(after.units[0].walkedEffort>u.walkedEffort);
 assert.ok(validSession(session(after)));assert.equal(roadAPCost(100,1700,1800),0);assert.equal(roadAPCost(100.001,1700,1800),1);
});

test('HQ orders charge successful actions only, benefit every faction, and recover next morning',()=>{
 let g=fresh();assert.deepEqual(g.units.slice(0,3).map(u=>u.ap),[15,15,19]);
 for(const team of ['blue','green','white'])assert.equal(actionCost(g,{type:'prepare'},team).ap,0);
 g=act(g,{type:'prepare',topic:'housing'});assert.equal(g.hqTokens.blue,1);assert.equal(g.units[0].ap,15);
 const rejected=campaignCommand(g,{type:'prepare',unitId:'blue1',topic:'housing'});assert.equal(rejected.game,g);assert.equal(g.hqTokens.blue,1);
 g.surprise={id:'donation',districtId:allCells.get(g.units[0].cellId).districtId,responses:{blue:null,green:null,white:null}};
 g=act(g,{type:'respond',choice:'adapt'});assert.equal(g.hqTokens.blue,0);assert.equal(g.units[0].ap,15);assert.equal(actionCost(g,{type:'prepare'}).ap,2);
 g=act(g,{type:'streetCanvass'});assert.equal(g.units[0].ap,14);assert.equal(actionCost(g,{type:'rest'}).ap,1);
 const night=endCampaignPhase(g);assert.equal(night.units[0].ap,18);const morning=endCampaignPhase(night,{automatedTurn:x=>x});
 assert.equal(morning.day,2);assert.equal(morning.hqTokens.blue,2);assert.equal(morning.units[0].walkCredit,undefined);assert.ok(validSession(session(morning)));
});

test('paid walking, boarding and alighting share credit without per-segment AP rounding',()=>{
 const board=boardingWalkCharge(400,true,0,0);assert.equal(board.ap,1);assert.equal(board.credit,1800);
 const alight=boardingWalkCharge(500,true,board.walked,board.credit);assert.equal(alight.ap,0);assert.equal(alight.walked,900);
 assert.equal(roadAPCost(900,alight.walked,alight.credit),0);
 assert.deepEqual(boardingWalkCharge(299,true,900,1800),{ap:0,walked:900,credit:1800,curbside:true});
 assert.equal(boardingWalkCharge(400,true,0,0,false).ap,1);assert.equal(boardingWalkCharge(500,true,0,0,false).ap,1);
});

test('recruitment uses an HQ order but a new helper keeps zero AP through the first night',()=>{
 const g=act(fresh(),{type:'recruit',helper:'logistic'});assert.equal(g.hqTokens.blue,1);assert.equal(g.units[0].ap,14);
 const helper=g.units.find(u=>u.id==='blue4');assert.equal(helper.ap,0);assert.equal(helper.joinedDay,1);
 const night=endCampaignPhase(g);assert.equal(night.units.find(u=>u.id===helper.id).ap,0);assert.ok(validSession(session(night)));
 const morning=endCampaignPhase(night,{automatedTurn:x=>x});assert.ok(morning.units.find(u=>u.id===helper.id).ap>0);assert.ok(validSession(session(morning)));
 const another=act(morning,{type:'recruit',helper:'logistic'}),support=campaignCommand(another,{type:'assist',unitId:'blue4',targetId:'blue5'});
 assert.equal(support.error,'g_noNeed');assert.equal(support.game,another);assert.equal(another.units.find(u=>u.id==='blue5').ap,0);
});

test('nighttime AP remains available to tactical transfers and logistics support',()=>{
 let g=act(chooseCommander(fresh(),'huang'),{type:'recruit',helper:'logistic'});
 g=endCampaignPhase(endCampaignPhase(g),{automatedTurn:x=>x});g=endCampaignPhase(g);
 const origin=mapFor(g).cells.get(g.units[0].cellId),enemy=g.units.find(u=>u.id==='green1');enemy.cellId=origin.neighbors.find(id=>!g.units.some(u=>u.cellId===id));
 const before=g.units[0].ap,after=act(g,{type:'skill',targetId:enemy.id});assert.equal(after.units[0].ap,before);assert.ok(validSession(session(after)));
 const helper=g.units.find(u=>u.id==='blue4');g.units[0].ap=supportAPCap(g,g.units[0])-2;assert.equal(assistError(g,helper,'blue1'),null);
 const supported=act(g,{type:'assist',unitId:helper.id,targetId:'blue1'});assert.equal(supported.units[0].ap,supportAPCap(g,g.units[0]));assert.ok(validSession(session(supported)));
});

test('old 100 m saves retain their position, AP, routes and rules without receiving HQ orders',()=>{
 let old=initialCampaign(17,'blue','streets-v2','legacy');old.news='clear';old.surprise=null;
 const walk=movement(old,old.units[0],1),to=[...walk.costs].find(([id])=>id!==old.units[0].cellId)[0];old=act(old,{type:'move',cellId:to});
 const bytes=JSON.stringify(encodeSave(session(old))),loaded=decodeSave(bytes);assert.equal(loaded.error,null);assert.deepEqual(loaded.save.session,session(old));
 assert.equal(mapFor(loaded.save.session.game).campaignMap.radiusMetres,50);assert.equal(old.units[0].maxAp,14);assert.equal(old.hqTokens,undefined);
 const night=endCampaignPhase(old);assert.equal(night.units[0].ap,old.units[0].ap);assert.deepEqual(roadWalkCells(old.trail.blue.walks[0].edgeIds,old),old.trail.blue.walks[0].cells);
 const bad=structuredClone(session(fresh()));bad.game.units[0].walkedEffort=1801;bad.game.units[0].walkCredit=1800;assert.equal(validSession(bad),false);
});

test('a supplied move-and-visit route stays atomic and cannot bypass its destination or resource checks',()=>{
 const g=fresh(),u=g.units[0],m=mapFor(g),walk=movement(g,u,2);
 const node=m.nodes.find(n=>n.cellId!==u.cellId&&walk.costs.has(n.cellId)&&walk.costs.get(n.cellId)===1);assert.ok(node);
 const p=routeFromMovement(u,node.cellId,walk),edges=Uint32Array.from(p.edgeIds),cmd={type:'canvassRoute',unitId:u.id,nodeId:node.id};
 const out=campaignCommand(g,cmd,u.team,edges,()=>{throw new Error('A reviewed route must not trigger a second search');});assert.equal(out.error,undefined);
 const separate=campaignCommand(campaignCommand(g,{type:'move',unitId:u.id,cellId:node.cellId}).game,{type:'canvass',unitId:u.id,nodeId:node.id});
 assert.deepEqual(out.game,separate.game);
 const poor=structuredClone(g);poor.resources.blue.materials=0;assert.equal(campaignCommand(poor,cmd,u.team,edges).game,poor);
 assert.equal(campaignCommand(g,cmd,u.team,Uint32Array.of(0xffffffff)).game,g);
 const remote=m.nodes.find(n=>n.districtId!==node.districtId&&n.districtId!==m.cells.get(u.cellId).districtId);assert.ok(remote);
 assert.equal(campaignCommand(g,{...cmd,nodeId:remote.id},u.team,edges).game,g);
});

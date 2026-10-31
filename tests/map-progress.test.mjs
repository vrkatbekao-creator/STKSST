import test from 'node:test';
import assert from 'node:assert/strict';
import { initialCampaign,campaignCommand,endCampaignPhase,movement,route,intelligence } from '../src/game/campaign.ts';
import { trailFor,nodeProgress,districtProgress } from '../src/game/campaign-progress.ts';
import { cells,nodes } from '../src/game/campaign-map.ts';
import { teams } from '../src/game/campaign-teams.ts';
import { encodeSave,decodeSave,validSession } from '../src/game/campaign-save.ts';
import { createCampaignStore } from '../src/game/campaign-store.ts';
const act=(g,command,team=g.playerTeam)=>{const out=campaignCommand(g,command,team);assert.equal(out.error,undefined);return out.game;};
const session=g=>({game:g,selected:`${g.playerTeam}1`,districtId:cells.get(g.units.find(u=>u.id===`${g.playerTeam}1`).cellId).districtId,view:'street'});
test('deployment is an arrival, not a completed activity, and each faction has its own trail',()=>{
 const g=initialCampaign();for(const team of teams){assert.equal(trailFor(g,team).arrivedCells.length,3);assert.equal(trailFor(g,team).partial,false);assert.equal(trailFor(g,team).completedNodes.length,0);const u=g.units.find(u=>u.id===`${team}1`),n=nodes.find(n=>n.cellId===u.cellId);assert.equal(nodeProgress(g,n.id,team).arrived,true);assert.equal(nodeProgress(g,n.id,team).completed,false);}
});
test('movement records every actual route step, never the preview or a failed command',()=>{
 let g=initialCampaign(1);g.news='clear';const u=g.units[0],destination=[...movement(g,u).costs].find(([,cost])=>cost>=3)[0];const before=structuredClone(g.trail),path=route(g,u,destination);assert.deepEqual(g.trail,before);const invalid=campaignCommand(g,{type:'move',unitId:u.id,cellId:'missing'});assert.equal(invalid.game,g);assert.deepEqual(g.trail,before);
 const ap=u.ap;g=act(g,{type:'move',unitId:u.id,cellId:destination});assert.equal(g.units[0].ap,ap-path.cost);for(const id of path.path)assert.ok(trailFor(g).arrivedCells.includes(id));assert.equal(new Set(trailFor(g).arrivedCells).size,trailFor(g).arrivedCells.length);assert.deepEqual(trailFor(g,'green'),before.green);assert.deepEqual(trailFor(g,'white'),before.white);
});
test('a charter records only its destination, without inventing a walked cross-city route',()=>{
 let g=initialCampaign(3);const before=trailFor(g).arrivedCells;g=act(g,{type:'transport',unitId:'blue1',districtId:'6300200'});assert.deepEqual(new Set(trailFor(g).arrivedCells),new Set([...before,g.units[0].cellId]));assert.equal(trailFor(g).completedNodes.length,0);
});
test('completed activity and daily count are distinct; only the count resets next morning',()=>{
 let g=initialCampaign(3);g.surprise=null;const n=nodes.find(n=>n.cellId===g.units[0].cellId);g=act(g,{type:'canvass',unitId:'blue1',nodeId:n.id});assert.equal(nodeProgress(g,n.id).today,1);assert.equal(nodeProgress(g,n.id).completed,true);g=act(g,{type:'visit',unitId:'blue1',nodeId:n.id});assert.equal(nodeProgress(g,n.id).today,2);assert.equal(trailFor(g).completedNodes.filter(id=>id===n.id).length,1);const before=JSON.stringify(g.trail);assert.ok(campaignCommand(g,{type:'visit',unitId:'blue1',nodeId:n.id}).error);assert.equal(JSON.stringify(g.trail),before);
 g=endCampaignPhase(endCampaignPhase(g));assert.equal(nodeProgress(g,n.id).today,0);assert.equal(nodeProgress(g,n.id).completed,true);assert.deepEqual(districtProgress(g,n.districtId),{completed:1,total:5});
});
test('an activity from an adjacent cell marks the location but does not invent arrival on its hex',()=>{
 let g=initialCampaign();const n=nodes.find(n=>n.kind==='wonder'),neighbor=cells.get(n.cellId).neighbors.find(id=>!g.units.some(u=>u.cellId===id));g.units[0].cellId=neighbor;g.surprise=null;g.trail.blue.arrivedCells=[];g=act(g,{type:'visit',unitId:'blue1',nodeId:n.id});assert.equal(nodeProgress(g,n.id).completed,true);assert.equal(nodeProgress(g,n.id).arrived,false);
});
test('building alone does not mark outreach completed, while a staffed stage session does',()=>{
 let g=initialCampaign();g.surprise=null;const n=nodes.find(n=>n.kind==='venue');g.units[0].cellId=n.cellId;g=act(g,{type:'build',unitId:'blue1',nodeId:n.id,brand:'soapbox'});assert.equal(nodeProgress(g,n.id).completed,false);g.stages[0].openDay=1;g=act(g,{type:'staff',unitId:'blue1',nodeId:n.id});g=act(g,{type:'stageEvent',unitId:'blue1',nodeId:n.id});assert.equal(nodeProgress(g,n.id).completed,true);assert.equal(nodeProgress(g,n.id).today,0);
});
test('arrival and activity progress survive save and resume without exposing blackout scores',()=>{
 let g=initialCampaign(4,'white');const n=nodes.find(n=>n.cellId===g.units.find(u=>u.id==='white1').cellId);g=act(g,{type:'canvass',unitId:'white1',nodeId:n.id});while(g.day<15)g=endCampaignPhase(endCampaignPhase(g));const decoded=decodeSave(JSON.stringify(encodeSave(session(g))));assert.equal(decoded.error,null);assert.deepEqual(decoded.save.session.game.trail,g.trail);assert.equal(nodeProgress(decoded.save.session.game,n.id).completed,true);assert.equal(intelligence(decoded.save.session.game).kind,'rumor');assert.equal('support' in intelligence(decoded.save.session.game),false);
});
test('v0.5 saves migrate known activities and present positions, marking older routes incomplete',()=>{
 const old=encodeSave(session(initialCampaign(7)));delete old.session.game.trail;const n=nodes.find(n=>n.kind==='market');old.session.game.nodeState[n.id].influence.blue=2;const {checksum:discard,...data}=old;let hash=2166136261;const raw=JSON.stringify(data);for(let i=0;i<raw.length;i++)hash=Math.imul(hash^raw.charCodeAt(i),16777619);old.checksum=hash>>>0;
 const input=JSON.stringify(old),decoded=decodeSave(input);assert.equal(decoded.error,null);const g=decoded.save.session.game;assert.equal(trailFor(g).partial,true);assert.deepEqual(trailFor(g).arrivedCells,g.units.filter(u=>u.team==='blue').map(u=>u.cellId));assert.ok(trailFor(g).completedNodes.includes(n.id));assert.equal(g.seed,old.session.game.seed);assert.deepEqual(g.support,old.session.game.support);assert.equal(JSON.stringify(old),input);assert.equal(decodeSave(JSON.stringify(decoded.save)).error,null);assert.ok(validSession(decoded.save.session));
});
test('unknown, duplicate or malformed trail entries are rejected',()=>{
 for(const mutate of [g=>g.trail.blue.arrivedCells.push('missing'),g=>g.trail.white.completedNodes.push('missing'),g=>g.trail.green.arrivedCells.push(g.trail.green.arrivedCells[0]),g=>g.trail.blue.partial='no']){const s=session(initialCampaign());mutate(s.game);assert.equal(validSession(s),false);assert.throws(()=>encodeSave(s));}
});
test('crossing a district boundary focuses and saves the district actually reached',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},store=createCampaignStore(storage),g=initialCampaign(1,'white');
 const occupied=new Set(g.units.map(u=>u.cellId));const source=[...cells.values()].find(c=>!occupied.has(c.id)&&c.neighbors.some(id=>cells.get(id).districtId!==c.districtId&&!occupied.has(id)));
 const destination=source.neighbors.find(id=>cells.get(id).districtId!==source.districtId&&!occupied.has(id));g.units.find(u=>u.id==='white1').cellId=source.id;store.setState({game:g,selected:'white1',districtId:source.districtId,started:true});store.getState().dispatch({type:'move',unitId:'white1',cellId:destination});
 assert.equal(store.getState().error,null);assert.equal(store.getState().districtId,cells.get(destination).districtId);assert.equal(store.getState().saved.session.districtId,cells.get(destination).districtId);assert.ok(trailFor(store.getState().game).arrivedCells.includes(destination));
});

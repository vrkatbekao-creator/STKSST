import test from 'node:test';
import assert from 'node:assert/strict';
import { initialCampaign,campaignCommand,endCampaignPhase,actionCost } from '../src/game/campaign.ts';
import { planNodeVisit,districtVisitPlans } from '../src/game/campaign-plans.ts';
import { todaysWalks,trailFor } from '../src/game/campaign-progress.ts';
import { cells,nodes,nodeById } from '../src/game/campaign-map.ts';
import { teams } from '../src/game/campaign-teams.ts';
import { createCampaignStore } from '../src/game/campaign-store.ts';
import { encodeSave,decodeSave,validSession } from '../src/game/campaign-save.ts';
const act=(g,cmd,team=g.playerTeam)=>{const out=campaignCommand(g,cmd,team);assert.equal(out.error,undefined);return out.game;};
const session=g=>({game:g,selected:`${g.playerTeam}1`,districtId:cells.get(g.units.find(u=>u.id===`${g.playerTeam}1`).cellId).districtId,view:'street'});
function fixture(team='blue'){const g=initialCampaign(1,team);g.news='clear';g.surprise=null;const u=g.units.find(u=>u.id===`${team}1`);if(team==='green')u.cellId=cells.get(g.units[0].cellId).neighbors.find(id=>!g.units.some(v=>v.cellId===id));const p=nodes.map(n=>planNodeVisit(g,u,n.id)).find(p=>p.canAct&&p.moveAp>=2&&!g.units.some(v=>v.cellId===nodeById.get(p.nodeId).cellId));assert.ok(p);return {g,u,p,n:nodeById.get(p.nodeId)};}
test('planner and move-and-canvass are identical to the legal two-command sequence for each faction',()=>{
 for(const team of teams){const {g,u,p,n}=fixture(team),before=JSON.stringify(g);assert.deepEqual(actionCost(g,{type:'canvassRoute',unitId:u.id,nodeId:n.id}),{ap:p.totalAp,materials:1});const moved=act(g,{type:'move',unitId:u.id,cellId:p.destination}),manual=act(moved,{type:'canvass',unitId:u.id,nodeId:n.id}),combined=act(g,{type:'canvassRoute',unitId:u.id,nodeId:n.id});assert.deepEqual(combined,manual);assert.equal(combined.units.find(v=>v.id===u.id).ap,u.ap-p.totalAp);assert.equal(combined.resources[team].materials,g.resources[team].materials-1);assert.equal(JSON.stringify(g),before);}
});
test('a defended activity hex is approached from a free, passable neighboring hex',()=>{
 const {g,u,n}=fixture();g.units.find(v=>v.team==='green').cellId=n.cellId;const p=planNodeVisit(g,u,n.id);assert.ok(p.canAct);assert.notEqual(p.destination,n.cellId);assert.ok(cells.get(n.cellId).neighbors.includes(p.destination));const out=act(g,{type:'canvassRoute',unitId:u.id,nodeId:n.id});assert.equal(new Set(out.units.map(v=>v.cellId)).size,out.units.length);assert.equal(out.nodeState[n.id].visits.blue,1);
});
test('enough AP to reach a hex is insufficient when no AP remains for canvassing; nothing is spent',()=>{
 const {g,u,p,n}=fixture();u.ap=p.moveAp;assert.equal(planNodeVisit(g,u,n.id).state,'ap');const before=JSON.stringify(g),out=campaignCommand(g,{type:'canvassRoute',unitId:u.id,nodeId:n.id});assert.equal(out.error,'c_errorAP');assert.equal(out.game,g);assert.equal(JSON.stringify(g),before);assert.equal(todaysWalks(g,u.id).length,0);
});
test('materials, daily caps, withdrawal, ended games and foreign units reject the entire combined action',()=>{
 for(const reason of ['materials','cap','withdrawn','ended','foreign']){const {g,u,n}=fixture();if(reason==='materials')g.resources.blue.materials=0;if(reason==='cap')g.nodeState[n.id].visits.blue=2;if(reason==='withdrawn')u.mobilization=0;if(reason==='ended')g.result='white';const before=JSON.stringify(g),out=campaignCommand(g,{type:'canvassRoute',unitId:u.id,nodeId:n.id},reason==='foreign'?'green':'blue');assert.ok(out.error,reason);assert.equal(out.game,g);assert.equal(JSON.stringify(g),before);}
});
test('holding position permits nearby canvassing, but rejects travel to a distant location',()=>{
 const {g,u,n}=fixture();u.guardedUntil=3;assert.equal(planNodeVisit(g,u,n.id).state,'locked');const here=nodes.find(v=>v.cellId===u.cellId),p=planNodeVisit(g,u,here.id);assert.equal(p.moveAp,0);assert.equal(p.totalAp,2);assert.ok(p.canAct);const next=act(g,{type:'canvassRoute',unitId:u.id,nodeId:here.id});assert.equal(next.actions,g.actions+1);assert.equal(next.units[0].cellId,u.cellId);assert.equal(todaysWalks(next,u.id).length,0);
});
test('rain and street works affect plan cost and actual combined execution in the same way',()=>{
 const {g,u,n}=fixture();g.news='rain';g.surprise={id:'streetworks',districtId:n.districtId,responses:{blue:null,green:null,white:null}};let p=planNodeVisit(g,u,n.id);assert.ok(p.canAct);let next=act(g,{type:'canvassRoute',unitId:u.id,nodeId:n.id});assert.equal(next.units[0].ap,u.ap-p.totalAp);g.surprise.responses.blue='adapt';const adapted=planNodeVisit(g,u,n.id);assert.ok(adapted.totalAp<=p.totalAp);next=act(g,{type:'canvassRoute',unitId:u.id,nodeId:n.id});assert.equal(next.units[0].ap,u.ap-adapted.totalAp);
});
test('district options are pure and recompute from the selected member and current shared resources',()=>{
 const {g,u,n}=fixture();const before=JSON.stringify(g),plans=districtVisitPlans(g,u,n.districtId);assert.equal(plans.length,5);assert.equal(JSON.stringify(g),before);g.resources.blue.materials=0;assert.ok(districtVisitPlans(g,u,n.districtId).every(p=>!p.canAct));assert.equal(planNodeVisit(g,u,'missing').state,'invalid');
});
test('ordered walks stay separate across backtracking, members and day/night phases',()=>{
 let {g,u}=fixture();const origin=u.cellId,to=cells.get(origin).neighbors.find(id=>!g.units.some(v=>v.cellId===id));g=act(g,{type:'move',unitId:u.id,cellId:to});g=act(g,{type:'move',unitId:u.id,cellId:origin});assert.deepEqual(todaysWalks(g,u.id).map(w=>w.cells),[[origin,to],[to,origin]]);assert.equal(todaysWalks(g,'blue2').length,0);g=endCampaignPhase(g);g=act(g,{type:'move',unitId:u.id,cellId:to});assert.equal(todaysWalks(g,u.id)[2].phase,'night');g=endCampaignPhase(g);assert.equal(todaysWalks(g,u.id).length,0);assert.equal(trailFor(g).walks.length,3);
});
test('charters are arrivals without fabricated walking lines, and previews never create lines',()=>{
 let {g,u,n}=fixture();const before=JSON.stringify(g.trail);planNodeVisit(g,u,n.id);assert.equal(JSON.stringify(g.trail),before);g=act(g,{type:'transport',unitId:u.id,districtId:'6300200'});assert.equal(todaysWalks(g,u.id).length,0);assert.ok(trailFor(g).arrivedCells.includes(g.units[0].cellId));
});
test('ordered walks round-trip through saves; v0.5.1 footprints never become inferred routes',()=>{
 let {g,u,p}=fixture();g=act(g,{type:'move',unitId:u.id,cellId:p.destination});const saved=decodeSave(JSON.stringify(encodeSave(session(g))));assert.equal(saved.error,null);assert.deepEqual(todaysWalks(saved.save.session.game,u.id),todaysWalks(g,u.id));for(const team of teams)delete g.trail[team].walks;const old=decodeSave(JSON.stringify(encodeSave(session(g))));assert.equal(old.error,null);assert.equal(todaysWalks(old.save.session.game,u.id).length,0);assert.deepEqual(trailFor(old.save.session.game).arrivedCells,trailFor(g).arrivedCells);
});
test('invalid walking records, cross-river jumps, wrong owners and future phases are rejected',()=>{
 const {g,u,p}=fixture();const valid=act(g,{type:'move',unitId:u.id,cellId:p.destination});for(const edit of [w=>w.unitId='white1',w=>w.day=29,w=>w.phase='night',w=>w.cells=[w.cells[0],g.units.find(v=>v.id==='green1').cellId],w=>w.cells=[w.cells[0],w.cells[0]]]){const bad=structuredClone(valid);edit(bad.trail.blue.walks[0]);assert.equal(validSession(session(bad)),false);assert.throws(()=>encodeSave(session(bad)));}
});
test('a combined command saves once, focuses its activity district and resumes with its exact path',()=>{
 const data=new Map();let writes=0;const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>{writes++;data.set(k,v);}},store=createCampaignStore(storage);const {g,u,n}=fixture('white');store.setState({...session(g),started:true});store.getState().dispatch({type:'canvassRoute',unitId:u.id,nodeId:n.id});assert.equal(store.getState().error,null);assert.equal(writes,1);assert.equal(store.getState().districtId,n.districtId);assert.equal(todaysWalks(store.getState().game,u.id).length,1);const loaded=createCampaignStore(storage);loaded.getState().resume();assert.deepEqual(loaded.getState().game,store.getState().game);
});

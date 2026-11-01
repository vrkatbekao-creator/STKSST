import test from 'node:test';import assert from 'node:assert/strict';
import {initialCampaign,campaignCommand,endCampaignPhase} from '../src/game/campaign.ts';
import {career,grantXP,capacity,dailyAP,helperTypes} from '../src/game/campaign-growth.ts';
import {encodeSave,decodeSave,validSession} from '../src/game/campaign-save.ts';
import {mapFor} from '../src/game/campaign-map.ts';
const session=g=>({game:g,selected:'blue1',districtId:mapFor(g).cells.get(g.units[0].cellId).districtId,view:'city'});
const act=(g,cmd,team=g.playerTeam)=>{const out=campaignCommand(g,cmd,team);assert.equal(out.error,undefined,JSON.stringify(cmd));return out.game;};
test('independent XP caps daily, levels persist and leveling never refills current AP',()=>{
 const g=initialCampaign(10),u=g.units[0],ap=u.ap;grantXP(g,u,100);assert.equal(career(u).xp,8);grantXP(g,u,100);assert.equal(career(u).xp,8);
 g.day=2;grantXP(g,u,8);assert.equal(career(u).level,2);assert.equal(u.ap,ap);assert.equal(career(u).morale,60);assert.equal(career(u).health,100);
 for(let day=3;day<=15;day++){g.day=day;grantXP(g,u,8);}assert.equal(career(u).level,5);assert.equal(capacity(u),16);assert.equal(u.ap,ap);
});
test('health, morale, fatigue and mobilization are distinct; rest restores condition without XP',()=>{
 let g=initialCampaign(10);g.news='clear';const u=g.units[0];u.career.health=30;u.career.morale=20;u.fatigue=6;u.mobilization=4;assert.equal(dailyAP(g,u),8);
 const before=u.ap;g=act(g,{type:'rest',unitId:'blue1'});const v=g.units[0];assert.equal(v.ap,before-2);assert.equal(v.career.health,48);assert.equal(v.career.morale,28);assert.equal(v.fatigue,2);assert.equal(v.mobilization,8);assert.equal(v.career.xp,0);
});
test('recruitment caps each faction at seven including originals, spawns uniquely with zero same-day AP',()=>{
 let g=initialCampaign(10);g.resources.blue.materials=500;
 for(let i=0;i<4;i++){const before=g.units[0].ap;g=act(g,{type:'recruit',unitId:'blue1',helper:helperTypes[i%3]});assert.equal(g.units[0].ap,before-3);assert.equal(g.units.at(-1).ap,0);assert.equal(g.units.at(-1).career.level,1);}
 assert.equal(g.units.filter(u=>u.team==='blue').length,7);assert.equal(new Set(g.units.map(u=>u.cellId)).size,g.units.length);assert.ok(validSession(session(g)));
 const fail=campaignCommand(g,{type:'recruit',unitId:'blue1',helper:'medic'});assert.equal(fail.error,'g_rosterFull');assert.equal(fail.game,g);
 assert.equal(campaignCommand(initialCampaign(),{type:'recruit',unitId:'blue2',helper:'medic'}).error,'g_recruitLeader');
 const saved=decodeSave(JSON.stringify(encodeSave(session(g))));assert.equal(saved.error,null);assert.deepEqual(saved.save.session.game,g);
});
test('all support types share one recipient daily limit and respect caps, team and range',()=>{
 for(const helper of helperTypes){let g=initialCampaign(10);g=act(g,{type:'recruit',unitId:'blue1',helper});g=endCampaignPhase(endCampaignPhase(g));const actor=g.units.find(u=>u.id==='blue4');g.units[0].career.health=40;g.units[0].career.morale=40;g.units[0].ap=3;
  g=act(g,{type:'assist',unitId:actor.id,targetId:'blue1'});const target=g.units[0];if(helper==='medic')assert.equal(target.career.health,62);if(helper==='organizer')assert.equal(target.career.morale,55);if(helper==='logistic')assert.equal(target.ap,5);
  assert.equal(campaignCommand(g,{type:'assist',unitId:actor.id,targetId:'blue1'}).error,'g_assisted');assert.equal(campaignCommand(g,{type:'assist',unitId:actor.id,targetId:'green1'}).error,'g_assistRange');assert.ok(validSession(session(g)));
 }
});
test('exhausted health withdraws a member and next morning returns them without overlapping',()=>{
 let g=initialCampaign(12);g.units[0].career.health=1;const node=mapFor(g).nodes.find(n=>n.cellId===g.units[0].cellId);g=act(g,{type:'canvass',unitId:'blue1',nodeId:node.id});assert.equal(g.units[0].career.health,0);assert.equal(g.units[0].ap,0);assert.equal(campaignCommand(g,{type:'move',unitId:'blue1',cellId:g.units[0].cellId}).error,'c_errorUnit');g=endCampaignPhase(endCampaignPhase(g));assert.equal(g.units[0].career.health,10);assert.ok(validSession(session(g)));
});
test('v1 and v2 fixtures migrate envelope only, preserving old AP, seed, map and missing-history meaning',()=>{
 for(const profile of ['legacy-hex','streets-v2']){const g=initialCampaign(10,'blue',profile);for(const u of g.units)delete u.career;const s=session(g),save=encodeSave(s);save.version=profile==='streets-v2'?2:1;save.rules=profile==='streets-v2'?'0.6.0':'0.5.0';const {checksum:_,...data}=save;let hash=2166136261;const raw=JSON.stringify(data);for(let i=0;i<raw.length;i++)hash=Math.imul(hash^raw.charCodeAt(i),16777619);save.checksum=hash>>>0;const decoded=decodeSave(JSON.stringify(save));assert.equal(decoded.error,null);assert.equal(decoded.save.version,3);assert.deepEqual(decoded.save.session,s);const next=act(decoded.save.session.game,{type:'rest',unitId:'blue1'});assert.equal(next.seed,g.seed);assert.equal(next.units[0].ap,g.units[0].ap-2);assert.equal(next.units[0].career.xp,0);}
});
test('save rejects invalid levels, eighth members, helper roles and non-object units',()=>{
 const g=initialCampaign();for(const mutate of [g=>g.units[0].career.level=5,g=>g.units[0].career.health=-1,g=>g.units.push(null),g=>g.units[0].helper='medic']){const bad=structuredClone(g);mutate(bad);assert.equal(validSession(session(bad)),false);}
});

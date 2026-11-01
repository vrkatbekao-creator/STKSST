import test from 'node:test';import assert from 'node:assert/strict';
import {initialCampaign,campaignCommand,endCampaignPhase,totals,intelligence} from '../src/game/campaign.ts';
import {autoReply,talkStep,replies} from '../src/game/campaign-dialogue.ts';
import {encodeSave,decodeSave,validSession} from '../src/game/campaign-save.ts';
import {mapFor} from '../src/game/campaign-map.ts';
const advance=(g,day)=>{while(g.day<day)g=endCampaignPhase(endCampaignPhase(g));return g;};
const session=g=>({game:g,selected:`${g.playerTeam}1`,districtId:mapFor(g).cells.get(g.units[0].cellId).districtId,view:'city'});
const answer=g=>campaignCommand(g,{type:'talkAnswer',unitId:g.talk.unitId,talkId:g.talk.id,step:talkStep(g.talk),reply:autoReply(g.talk)});
test('a scheduled broadcast reserves entry once, resumes exact questions and settles once',()=>{
 let g=advance(initialCampaign(7),7);const before=structuredClone(g);let out=campaignCommand(g,{type:'talkStart',unitId:'blue1',mode:'debate'});assert.equal(out.error,undefined);g=out.game;
 assert.equal(g.units[0].ap,before.units[0].ap-4);assert.equal(g.resources.blue.materials,before.resources.blue.materials-3);assert.deepEqual(g.support,before.support);
 g=answer(g).game;assert.equal(g.talk.beat,'follow');assert.equal(endCampaignPhase(g),g);
 assert.equal(campaignCommand(g,{type:'rest',unitId:'blue1'}).error,'d_finishFirst');
 const saved=decodeSave(JSON.stringify(encodeSave(session(g))));assert.equal(saved.error,null);assert.deepEqual(saved.save.session.game.talk,g.talk);
 const stale={type:'talkAnswer',unitId:'blue1',talkId:g.talk.id,step:0,reply:'listen'};assert.equal(campaignCommand(g,stale).game,g);
 const id=g.talk.id;while(g.talk)g=answer(g).game;assert.equal(g.talkReports[0].quality,'strong');assert.ok(totals(g.support).blue>totals(before.support).blue);assert.equal(g.eventDone.blue,7);assert.ok(validSession(session(g)));
 assert.equal(campaignCommand(g,{type:'talkLeave',unitId:'blue1',talkId:id}).game,g);assert.equal(campaignCommand(g,{type:'talkStart',unitId:'blue1',mode:'debate'}).error,'c_errorEvent');
});
test('staffed stage Q&A validates location and ownership, charges once and logs qualitative recap',()=>{
 let g=initialCampaign(18);const node=mapFor(g).nodes.find(n=>n.kind==='venue');g.units[0].cellId=node.cellId;g.stages=[{nodeId:node.id,team:'blue',brand:'island',openDay:1,staffed:true,lastEventDay:0}];
 const before=totals(g.support).blue;g=campaignCommand(g,{type:'talkStart',unitId:'blue1',mode:'stage',nodeId:node.id}).game;assert.equal(g.talk.rounds.length,3);
 while(g.talk)g=answer(g).game;assert.ok(totals(g.support).blue-before<=14);assert.ok(g.trail.blue.completedNodes.includes(node.id));assert.equal(g.logs[0].values.action,'talkComplete');assert.ok(!Object.hasOwn(g.logs[0].values,'support'));assert.ok(validSession(session(g)));
});
test('premature exit keeps completed rounds, invalid replies are atomic and blackout stays qualitative',()=>{
 let g=advance(initialCampaign(9),21);g=campaignCommand(g,{type:'talkStart',unitId:'blue1',mode:'debate'}).game;
 const invalid=campaignCommand(g,{type:'talkAnswer',unitId:'blue1',talkId:g.talk.id,step:0,reply:'fake'});assert.equal(invalid.game,g);assert.equal(invalid.error,'d_stale');
 g=answer(g).game;g=answer(g).game;const id=g.talk.id;g=campaignCommand(g,{type:'talkLeave',unitId:'blue1',talkId:id}).game;assert.equal(g.talk,null);assert.equal(g.talkReports[0].abandoned,true);assert.equal(g.talkReports[0].index,1);assert.equal(intelligence(g).kind,'rumor');assert.equal('support' in intelligence(g),false);
});

import test from 'node:test';import assert from 'node:assert/strict';
import {initialCampaign,campaignCommand,endCampaignPhase,automatedFactionTurn} from '../src/game/campaign.ts';
import {dailySupplies,career} from '../src/game/campaign-growth.ts';
import {copyCampaign} from '../src/game/campaign-copy.ts';
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.freeze(x);for(const v of Object.values(x))freeze(v);}return x;};
test('append-only timeline sharing never mutates a prior campaign, including frozen saves',()=>{
 let g=initialCampaign(8);for(let day=0;day<7;day++)g=endCampaignPhase(endCampaignPhase(g));freeze(g);const before=JSON.stringify(g);const copy=copyCampaign(g);
 assert.equal(copy.history[0],g.history[0]);assert.equal(copy.poll,g.poll);assert.notEqual(copy.units,g.units);assert.notEqual(copy.trail.blue.walks,g.trail.blue.walks);
 const out=campaignCommand(g,{type:'rest',unitId:'blue1'});assert.equal(out.error,undefined);endCampaignPhase(endCampaignPhase(out.game));assert.equal(JSON.stringify(g),before);
});
test('larger rosters retain enough supplies and AI saves toward actual recruitment',()=>{
 let g=initialCampaign(17);assert.equal(dailySupplies(g,'blue'),8);g.resources.blue.materials=500;for(let i=0;i<4;i++)g=campaignCommand(g,{type:'recruit',unitId:'blue1',helper:'medic'}).game;assert.equal(dailySupplies(g,'blue'),6);
 let live=initialCampaign(17);for(let day=1;day<=12;day++){live=automatedFactionTurn(live,live.playerTeam);live=endCampaignPhase(endCampaignPhase(live));}
 for(const team of ['blue','green','white']){const roster=live.units.filter(u=>u.team===team);assert.ok(roster.length>=4&&roster.length<=7);assert.ok(live.resources[team].materials>=0);assert.ok(roster.every(u=>career(u).health>=0));}
});
test('empty broadcast exit never farms experience',()=>{
 let g=initialCampaign(17);for(let day=1;day<7;day++)g=endCampaignPhase(endCampaignPhase(g));const before=career(g.units[0]).xp;
 g=campaignCommand(g,{type:'talkStart',unitId:'blue1',mode:'debate'}).game;g=campaignCommand(g,{type:'talkLeave',unitId:'blue1',talkId:g.talk.id}).game;assert.equal(career(g.units[0]).xp,before);
});

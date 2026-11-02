import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {roleLabel,helperLabel,memberIndex,memberKinds} from '../src/campaign-character.ts';
import {initialCampaign,campaignCommand} from '../src/game/campaign.ts';
import {unitLabel} from '../src/campaign-unit-label.ts';
import {mediaEvent} from '../src/campaign-media-event.ts';
const strings=lang=>JSON.parse(readFileSync(new URL(`../src/locales/${lang}.json`,import.meta.url),'utf8'));
test('scout identities belong to their faction, independently of chosen commander',()=>{
 for(const lang of ['zh-TW','en']){const data=strings(lang),t=k=>data[k];const labels=['blue','green','white'].map(team=>roleLabel(team,'scout',t));assert.equal(new Set(labels).size,3);assert.deepEqual(labels,lang==='zh-TW'?['藍鷹斥候','小水滴','瘋狂小草']:['Blue Eagle Scout','Little Droplet','Crazy Sprout']);for(const team of ['blue','green','white'])for(const kind of memberKinds){const label=data[`r_${team}_${kind}`];assert.ok(label&&!label.includes('undefined'));if(team!=='white')assert.ok(!/小草|Sprout/.test(label));}}
});
test('all faction helper types have distinct names and art slots while the seven-member rule remains',()=>{
 for(const team of ['blue','green','white']){let g=initialCampaign(2,team);g.resources[team].materials=500;for(const helper of ['medic','organizer','logistic','medic'])g=campaignCommand(g,{type:'recruit',unitId:`${team}1`,helper}).game;for(const lang of ['zh-TW','en']){const d=strings(lang),t=k=>d[k],labels=g.units.filter(u=>u.team===team).map(u=>unitLabel(g,u,t));assert.equal(new Set(labels).size,7);assert.ok(labels[3].startsWith(helperLabel(team,'medic',t)));}assert.equal(memberIndex('heavy','medic'),3);assert.equal(memberIndex('ranged','organizer'),4);assert.equal(memberIndex('scout','logistic'),5);}
});
test('helper action cut-ins preserve both faction and helper identity rather than showing a generic soldier',()=>{
 let a=initialCampaign(8,'green');a.resources.green.materials=500;a=campaignCommand(a,{type:'recruit',unitId:'green1',helper:'medic'}).game;const helper=a.units.find(u=>u.id==='green4');helper.ap=14;a.units.find(u=>u.id==='green1').career.health=70;const b=campaignCommand(a,{type:'assist',unitId:'green4',targetId:'green1'}).game;const event=mediaEvent({game:a,started:true},{game:b,started:true});assert.equal(event.actorHelper,'medic');assert.equal(event.actorRole,'heavy');assert.equal(event.team,'green');assert.equal(event.action,'assist');
});
test('production character atlases match the inspected art manifest',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../design/member-art-manifest.json',import.meta.url),'utf8'));assert.equal(manifest.files.length,4);for(const entry of manifest.files){const data=readFileSync(new URL(`../${entry.file}`,import.meta.url));assert.equal(createHash('sha256').update(data).digest('hex'),entry.sha256);assert.equal(data.readUInt32BE(16),entry.width);assert.equal(data.readUInt32BE(20),entry.height);assert.equal(data[25],6,'RGBA atlas required');}
});

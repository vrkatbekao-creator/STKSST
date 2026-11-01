import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {initialCampaign,campaignCommand} from '../src/game/campaign.ts';import {unitLabel} from '../src/campaign-unit-label.ts';
test('same-role support members have distinct bilingual labels throughout a seven-person roster',()=>{
 let g=initialCampaign(19);g.resources.blue.materials=500;for(let i=0;i<4;i++)g=campaignCommand(g,{type:'recruit',unitId:'blue1',helper:'medic'}).game;
 for(const lang of ['zh-TW','en']){const strings=JSON.parse(readFileSync(new URL(`../src/locales/${lang}.json`,import.meta.url),'utf8'));const labels=g.units.filter(u=>u.team==='blue').map(u=>unitLabel(g,u,k=>strings[k]));assert.equal(new Set(labels).size,7);assert.ok(labels.every(s=>typeof s==='string'&&!s.includes('undefined')));assert.ok(labels[3].endsWith('#4'));assert.ok(labels[6].endsWith('#7'));}
});

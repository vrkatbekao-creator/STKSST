import {performance} from 'node:perf_hooks';import {writeFileSync} from 'node:fs';import assert from 'node:assert/strict';
import {initialCampaign,automatedFactionTurn,endCampaignPhase} from '../src/game/campaign.ts';import {copyCampaign} from '../src/game/campaign-copy.ts';
let game=initialCampaign(7919);while(!game.result){game=automatedFactionTurn(game,game.playerTeam);game=endCampaignPhase(endCampaignPhase(game));}
assert.deepEqual(copyCampaign(game),structuredClone(game));
for(let i=0;i<10;i++){structuredClone(game);copyCampaign(game);}
const samples=200;let start=performance.now();for(let i=0;i<samples;i++)structuredClone(game);const fullMs=performance.now()-start;start=performance.now();for(let i=0;i<samples;i++)copyCampaign(game);const copyMs=performance.now()-start;
const report={date:'2026-11-01',units:game.units.length,historyDays:game.history.length,samples,fullCloneMs:Number(fullMs.toFixed(2)),appendOnlyCopyMs:Number(copyMs.toFixed(2)),ratio:Number((fullMs/copyMs).toFixed(2)),equalValues:true,scope:'Single-host CPU microbenchmark, not browser FPS or end-to-end responsiveness.'};writeFileSync(new URL('../artifacts/campaign-copy-benchmark.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(report);

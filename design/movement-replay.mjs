import assert from 'node:assert/strict';
import {writeFileSync,readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {initialCampaign,automatedFactionTurn,endCampaignPhase,intelligence} from '../src/game/campaign.ts';
import {mapFor,placeRevision} from '../src/game/campaign-map.ts';
import {validSession,encodeSave,decodeSave} from '../src/game/campaign-save.ts';

const version=JSON.parse(readFileSync('package.json','utf8')).version;const results=[];
for(const team of ['blue','green','white']){
  const started=performance.now();let game=initialCampaign(17,team,'streets-v2');let checkpoints=0;
  for(let day=1;day<=28;day++){
    game=automatedFactionTurn(game,team);
    const before=new Map(game.units.filter(u=>u.team===team).map(u=>[u.id,u.ap]));
    game=endCampaignPhase(game);
    for(const unit of game.units.filter(u=>u.team===team))assert.equal(unit.ap,before.get(unit.id),'day/night cannot refill AP');
    game=endCampaignPhase(game);
    const actor=game.units.find(u=>u.id===`${team}1`),session={game,selected:actor.id,districtId:mapFor(game).cells.get(actor.cellId).districtId,view:'city'};
    assert.ok(validSession(session),`${team} day ${day}`);
    for(const faction of ['blue','green','white']){assert.ok(game.units.filter(u=>u.team===faction).length<=7);assert.ok(game.resources[faction].materials>=0);}
    if(game.day>=15&&!game.result)assert.equal(intelligence(game).kind,'rumor');
    if([7,15,28].includes(day)){const restored=decodeSave(JSON.stringify(encodeSave(session)));assert.equal(restored.error,null);assert.deepEqual(restored.save.session,session);game=restored.save.session.game;checkpoints++;}
  }
  assert.equal(game.day,28);assert.equal(game.phase,'night');assert.ok(game.result);assert.equal(intelligence(game).kind,'result');assert.deepEqual(game.pollHistory.map(p=>p.releasedDay),[2,4,6,8,10,12,14]);
  results.push({team,seed:17,completedDays:28,saveCheckpoints:checkpoints,invariants:true,coverage:Object.fromEntries(['blue','green','white'].map(t=>[t,{districts:game.outreach?.[t].districts.length??0,sectors:game.outreach?.[t].seenSectors.length??0,contactedCells:Object.keys(game.outreach?.[t].cells??{}).length,sourcePlaces:game.trail[t].completedNodes.filter(id=>id.startsWith('poi_')).length}])),walks:Object.fromEntries(['blue','green','white'].map(t=>[t,game.trail[t].walks.length])),elapsedMs:Math.round(performance.now()-started)});
  console.log(`${team}: 28 days and ${checkpoints} save checkpoints passed`);
}
writeFileSync(`artifacts/movement-replay-v${version.replaceAll('.','')}.json`,JSON.stringify({date:'2026-11-03',version,placeRevision,synthetic:true,method:'Three player factions, seed 17, all factions use the authoritative AI; checks resource, roster, day/night AP, save and blackout invariants. Not a human balance or win-rate study.',results},null,2)+'\n');

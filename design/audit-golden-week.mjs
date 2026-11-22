// Run after building stksst-core for wasm32-unknown-unknown.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {initialCampaign,campaignCommand,routeFromMovement,automatedFactionTurn} from '../src/game/campaign.ts';
import {mapFor,streetSource} from '../src/game/campaign-map.ts';
import {roadMovement} from '../src/game/road-movement.ts';
import {campaignRoadQuery,rustRoadSearch} from '../src/game/rust-campaign-routing.ts';
import {instantiateRustRouting,encodeRoutingMetadata} from '../src/game/rust-routing.ts';
import {instantiateRustVehicle} from '../src/game/rust-vehicle.ts';
import {parseVehicleGraph} from '../src/game/vehicle-graph-format.ts';
import {planVehicleLeg} from '../src/game/vehicle-leg-planner.ts';
import {manifest,readPackage} from '../src/map-packages.ts';
const module=await WebAssembly.compile(readFileSync(new URL('../stksst-core/target/wasm32-unknown-unknown/release/stksst_core.wasm',import.meta.url)));
const query=await instantiateRustRouting(module,await readPackage(manifest.core),encodeRoutingMetadata(streetSource));
const wasmSearch=rustRoadSearch(query),ordered=map=>[...map].sort(([a],[b])=>a.localeCompare(b)),report={walking:[],vehicle:[],ai:false};
for(const rules of ['golden-week','legacy'])for(const rain of [false,true]){
 let g=initialCampaign(17,'blue','streets-v2',rules);g.news=rain?'rain':'clear';g.surprise=null;g.units[0].ap=2;
 for(let leg=0;leg<2;leg++){
  const u=g.units[0],ts=roadMovement(g,u,u.ap),wasm=wasmSearch(g,u,u.ap);assert.deepEqual(ordered(wasm.costs),ordered(ts.costs));
  const dest=[...ts.costs].find(([id,ap])=>id!==u.cellId&&(leg===0?ap===1:ap===0))?.[0];if(!dest){assert.equal(rules,'legacy');break;}
  const path=query({...campaignRoadQuery(g,u,u.ap),target:mapFor(g).cells.get(dest).roadNode,algorithm:'dijkstra'});
  assert.ok(path);const reference=campaignCommand(g,{type:'move',unitId:u.id,cellId:dest}),actual=campaignCommand(g,{type:'move',unitId:u.id,cellId:dest},u.team,path.values);
  assert.equal(actual.error,undefined);assert.deepEqual(actual.game,reference.game);report.walking.push({rules,rain,leg,cells:ts.costs.size,ap:u.ap-actual.game.units[0].ap});g=actual.game;
 }
}
// Two nodes and one real directed car leg; connectors can share purchased walking credit.
const bytes=new ArrayBuffer(96),view=new DataView(bytes);view.setUint32(0,0x33504756,true);view.setUint32(4,2,true);view.setUint32(8,1,true);
new BigUint64Array(bytes,16,2).set([10n,20n]);new Float64Array(bytes,32,2).set([121,121.001]);new Float64Array(bytes,48,2).set([25,25]);
new Uint32Array(bytes,64,3).set([0,1,1]);new Uint32Array(bytes,76,1).set([1]);new BigUint64Array(bytes,80,1).set([8n]);new Float64Array(bytes,88,1).set([100]);
const graph=parseVehicleGraph(bytes),planWasm=await instantiateRustVehicle(module,graph),stop=(vehicleNode,effort)=>({walkingNode:vehicleNode,vehicleNode,metres:effort,effort,edgeIds:effort?[1]:[]});
for(const sharedWalk of [false,true])for(const previousWalkedEffort of [0,1400,1750]){
 const options={mode:'motorcade',origins:[stop(0,400),stop(0,0)],destinations:[stop(1,500),stop(1,100)],ap:4,materials:2,reservedAp:1,
  previousWeightedQuarterMetres:0,previousTeamQuarterMetres:0,sharedWalk,previousWalkedEffort,previousWalkCredit:previousWalkedEffort?1800:0,allowTurn:()=>true,edgeWeightQuarters:()=>4};
 const ts=planVehicleLeg(graph,options),wasm=planWasm(options);assert.deepEqual(wasm,ts);report.vehicle.push({sharedWalk,previousWalkedEffort,walkingAp:wasm.walkingAp,totalAp:wasm.totalAp});
}
const ai=initialCampaign(17,'blue','streets-v2');ai.news='clear';ai.surprise=null;
const tsAI=automatedFactionTurn(ai,'green',{recruit:false}),wasmAI=automatedFactionTurn(ai,'green',{recruit:false,roadSearch:wasmSearch});
assert.deepEqual(wasmAI,tsAI);report.ai=true;
writeFileSync(new URL('../.tools/golden-wasm-audit.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));

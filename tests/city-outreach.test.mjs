import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {initialCampaign,campaignCommand,movement,automatedFactionTurn,nearbyNodes,siteTransferDestination,actionCost} from '../src/game/campaign.ts';
import {mapFor,streetCellMap,sourcePlaces,placeRevision,approachCells} from '../src/game/campaign-map.ts';
import {outreachQuote,touchOutreach,sectorKey,initialOutreach} from '../src/game/campaign-outreach.ts';
import {encodeSave,decodeSave,validSession,SAVE_KEY} from '../src/game/campaign-save.ts';
import {createCampaignStore} from '../src/game/campaign-store.ts';
const fresh=()=>{const g=initialCampaign(0,'blue','streets-v2');g.news='clear';g.surprise=null;return g;};
const actor=g=>g.units.find(u=>u.id==='blue1');
const session=g=>({game:g,selected:'blue1',districtId:mapFor(g).cells.get(actor(g).cellId).districtId,view:'street'});
const act=(g,cmd)=>{const out=campaignCommand(g,{unitId:'blue1',...cmd});assert.equal(out.error,undefined);return out.game;};
const rehash=save=>{const {checksum:_,...data}=save,raw=JSON.stringify(data);let hash=2166136261;for(let i=0;i<raw.length;i++)hash=Math.imul(hash^raw.charCodeAt(i),16777619);return JSON.stringify({...data,checksum:hash>>>0});};

test('official places have multiple uneven district counts, byte-traceable sources and walkable same-district anchors',()=>{
 const data=JSON.parse(readFileSync(new URL('../src/data/taipei-places.json',import.meta.url),'utf8'));assert.equal(data.revision,placeRevision);assert.equal(sourcePlaces.length,318);assert.deepEqual(data.audit.byType,{market:47,nightmarket:41,station:230});assert.ok(new Set(Object.values(data.audit.byDistrict)).size>1);assert.ok(Object.values(data.audit.byDistrict).every(n=>n>1));
 for(const source of data.sources){const bytes=readFileSync(new URL(`../design/assets/places-source/${source.file}`,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),source.sha256);assert.equal(source.licence,'Open Government Data License 1.0');}
 for(const n of sourcePlaces){const c=streetCellMap.get(n.cellId);assert.ok(c.walkable);assert.equal(c.districtId,n.districtId);assert.ok(n.snapMetres<=180);assert.ok(n.name['zh-TW']&&n.name.en);assert.equal(n.syntheticVenue,false);}
 const nanmen=sourcePlaces.find(n=>n.name['zh-TW'].includes('南門市場'));assert.equal(nanmen.districtId,'6300500');assert.ok(nanmen.locationCorrections.length);assert.ok(JSON.stringify(nanmen.locationCorrections).includes('BEF065E68FF7E843'));
});

test('street canvassing works away from fixed sites and shares AP, material, XP and sector rules',()=>{
 let g=fresh(),u=actor(g);const occupied=new Set(g.units.map(v=>v.cellId));const c=[...streetCellMap.values()].find(c=>c.walkable&&!occupied.has(c.id)&&!nearbyNodes(g,{...u,cellId:c.id}).length);assert.ok(c);u.cellId=c.id;
 const before=structuredClone(g),quote=outreachQuote(g,'blue',c.id);g=act(g,{type:'streetCanvass'});assert.equal(actor(g).ap,12);assert.equal(g.resources.blue.materials,35);assert.equal(actor(g).career.xp,2);assert.equal(g.support[c.districtId].blue-before.support[c.districtId].blue,quote.points);assert.equal(g.seed,before.seed);assert.equal(g.trail.blue.walks.length,0);assert.ok(validSession(session(g)));assert.deepEqual(before.outreach,initialOutreach());
});

test('a road contact and nearby fixed-site contact share the same two-contact daily ceiling',()=>{
 let g=fresh();const id=actor(g).cellId,node=mapFor(g).nodes.find(n=>n.kind==='wonder'&&n.cellId===id),district=streetCellMap.get(id).districtId,before=g.support[district].blue;
 g=act(g,{type:'streetCanvass'});assert.equal(g.support[district].blue-before,14);const first=g.support[district].blue;g=act(g,{type:'canvass',nodeId:node.id});assert.equal(g.support[district].blue-first,2);assert.equal(outreachQuote(g,'blue',id).count,2);
 for(const cmd of [{type:'streetCanvass'},{type:'canvass',nodeId:node.id}]){const out=campaignCommand(g,{...cmd,unitId:'blue1'});assert.equal(out.error,'c_errorCrowd');assert.equal(out.game,g);}
});

test('sector saturation crosses adjacent cells, rewards new districts once and recovers after a break',()=>{
 const g=fresh(),start=actor(g).cellId,c=streetCellMap.get(start),same=[...streetCellMap.values()].find(n=>n.walkable&&n.id!==c.id&&sectorKey(n)===sectorKey(c)),other=[...streetCellMap.values()].find(n=>n.walkable&&n.districtId!==c.districtId);assert.ok(same);
 const before=JSON.stringify(g);outreachQuote(g,'blue',start);assert.equal(JSON.stringify(g),before);assert.equal(touchOutreach(g,'blue',start,8),14);assert.equal(outreachQuote(g,'blue',same.id).freshSector,false);assert.equal(outreachQuote(g,'blue',same.id).points,6);assert.equal(outreachQuote(g,'green',start).points,14);
 const daily=[];for(let day=2;day<=5;day++){g.day=day;daily.push(touchOutreach(g,'blue',start,8));}assert.deepEqual(daily,[6,4,2,1]);g.day=17;assert.equal(outreachQuote(g,'blue',start).points,8);assert.equal(outreachQuote(g,'blue',start).freshDistrict,false);assert.equal(outreachQuote(g,'blue',other.id).freshDistrict,true);touchOutreach(g,'blue',other.id,8);assert.equal(g.outreach.blue.districts.length,2);
});

test('place transfers work within a district, cost four AP and never fabricate walking histories',()=>{
 const g=fresh(),u=actor(g),district=streetCellMap.get(u.cellId).districtId,n=sourcePlaces.find(n=>n.districtId===district&&siteTransferDestination(g,u,n.id));assert.ok(n);const destination=siteTransferDestination(g,u,n.id).id;
 const moved=act(g,{type:'siteTransfer',nodeId:n.id});assert.equal(actor(moved).cellId,destination);assert.equal(actor(moved).ap,10);assert.equal(moved.resources.blue.materials,32);assert.equal(actor(moved).transportDay,1);assert.deepEqual(moved.trail.blue.walks,g.trail.blue.walks);assert.ok(moved.trail.blue.arrivedCells.includes(destination));assert.equal(campaignCommand(moved,{type:'siteTransfer',unitId:'blue1',nodeId:n.id}).error,'c_errorTransport');assert.ok(validSession(session(moved)));
 assert.deepEqual(actionCost(g,{type:'transport'}),{ap:3,materials:4});assert.deepEqual(actionCost(initialCampaign(),{type:'transport'}),{ap:6,materials:4});const locked=structuredClone(g);actor(locked).guardedUntil=3;assert.equal(campaignCommand(locked,{type:'siteTransfer',unitId:'blue1',nodeId:n.id}).game,locked);
});

test('schema 4 loads without rewriting bytes, adding only neutral sites and known outreach coverage',()=>{
 let g=fresh();const original=mapFor(g).nodes.find(n=>n.kind==='wonder'&&n.cellId===actor(g).cellId);g=act(g,{type:'canvass',nodeId:original.id});const save=encodeSave(session(g));save.version=4;save.rules='0.16.0';delete save.placeRevision;delete save.session.game.outreach;for(const n of sourcePlaces)delete save.session.game.nodeState[n.id];const oldGame=structuredClone(save.session.game),raw=rehash(save),writes=[],port={getItem:k=>k===SAVE_KEY?raw:null,setItem:(k,v)=>writes.push([k,v])};
 const store=createCampaignStore(port,'streets-v2');store.getState().resume();const restored=store.getState().game;assert.equal(writes.length,0);assert.deepEqual(restored.units,oldGame.units);assert.deepEqual(restored.resources,oldGame.resources);assert.deepEqual(restored.support,oldGame.support);assert.equal(restored.seed,oldGame.seed);assert.deepEqual(restored.trail,oldGame.trail);for(const [id,state] of Object.entries(oldGame.nodeState))assert.deepEqual(restored.nodeState[id],state);assert.equal(Object.keys(restored.nodeState).length,378);assert.equal(restored.outreach.blue.partial,true);assert.equal(restored.outreach.blue.seenSectors.length,1);assert.equal(outreachQuote(restored,'blue',actor(restored).cellId).freshDistrict,false);assert.equal(outreachQuote(restored,'blue',original.cellId).count,1);assert.ok(validSession(session(restored)));
});

test('invalid outreach counters and catalogue revisions cannot enter a current save',()=>{
 const g=act(fresh(),{type:'streetCanvass'}),id=actor(g).cellId,sector=sectorKey(streetCellMap.get(id));for(const corrupt of [g=>g.outreach.blue.cells[id].count=3,g=>g.outreach.blue.cells[id].day=29,g=>g.outreach.blue.sectors[sector].heat=7,g=>g.outreach.blue.seenSectors.push(sector),g=>g.outreach.blue.cells.unknown={day:1,count:1}]){const bad=structuredClone(g);corrupt(bad);assert.equal(validSession(session(bad)),false);}
 const save=encodeSave(session(g));save.placeRevision='obsolete';assert.equal(decodeSave(rehash(save)).error,'c_saveIncompatible');const missing=encodeSave(session(g));delete missing.session.game.outreach;assert.equal(decodeSave(rehash(missing)).error,'c_saveInvalid');
});

test('failed road outreach cannot spend resources, reveal rewards or mutate prior snapshots',()=>{
 for(const setup of [g=>actor(g).ap=1,g=>g.resources.blue.materials=0]){const g=fresh();setup(g);const before=structuredClone(g),out=campaignCommand(g,{type:'streetCanvass',unitId:'blue1'});assert.ok(out.error);assert.equal(out.game,g);assert.deepEqual(g,before);}
 const g=fresh();assert.equal(campaignCommand(g,{type:'streetCanvass',unitId:'green1'}).error,'c_errorUnit');const old=structuredClone(g),out=act(g,{type:'streetCanvass'});assert.deepEqual(g,old);assert.notEqual(out.outreach,g.outreach);assert.ok(!Object.values(out.logs[0].values).some(v=>typeof v==='number'&&v===14));
});

test('three factions use the same road-contact rule and AI can canvass ordinary roads',()=>{
 const g=fresh();for(const team of ['blue','green','white']){const u=g.units.find(u=>u.id===`${team}1`),out=campaignCommand(g,{type:'streetCanvass',unitId:u.id},team);assert.equal(out.error,undefined);assert.equal(out.game.units.find(v=>v.id===u.id).ap,u.ap-2);assert.equal(out.game.outreach[team].districts.length,1);}
 const u=actor(g),occupied=new Set(g.units.map(v=>v.cellId));u.cellId=[...streetCellMap.values()].find(c=>c.walkable&&!occupied.has(c.id)&&!nearbyNodes(g,{...u,cellId:c.id}).length).id;const ai=automatedFactionTurn(g,'blue');assert.ok(ai.logs.some(l=>l.values.action==='streetCanvass'));assert.ok(ai.outreach.blue.seenSectors.length>0);assert.ok(validSession(session(ai)));
});

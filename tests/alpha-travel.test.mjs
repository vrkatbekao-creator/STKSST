import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaignStore} from '../src/game/campaign-store.ts';
import {campaignCommand,initialCampaign,nearbyNodes,movement} from '../src/game/campaign.ts';
import {encodeSave,decodeSave} from '../src/game/campaign-save.ts';
import {mapFor} from '../src/game/campaign-map.ts';
import {nextVisitColor} from '../src/game/campaign-visit-colors.ts';
import {autoReply,talkStep} from '../src/game/campaign-dialogue.ts';

test('reviewed route stays read-only and can be committed only once on the same snapshot',async()=>{
 const bytes=new Map();let writes=0;
 const store=createCampaignStore({getItem:key=>bytes.get(key)??null,setItem:(key,value)=>{writes++;bytes.set(key,value);}},'streets-v2');
 store.getState().start();
 const before=store.getState().game,actor=before.units[0];
 const cellId=[...movement(before,actor,1).costs].find(([,ap])=>ap===1)[0];
 const intent={unitId:actor.id,cellId,mode:'walk'};
 const abandoned=await store.getState().quoteTravel(intent);
 assert.ok(abandoned.quote);
 assert.equal(store.getState().game,before);
 assert.equal(writes,1);
 store.getState().end();
 assert.equal(store.getState().confirmTravel(abandoned.quote),false);
 const {quote}=await store.getState().quoteTravel(intent);
 assert.equal(quote.ap,1);
 assert.ok(quote.segments[0].points.length>1);
 assert.equal(store.getState().confirmTravel(quote),true);
 assert.equal(store.getState().confirmTravel(quote),false);
 assert.equal(store.getState().game.units[0].ap,quote.remaining);
 assert.equal(writes,3);
});

test('resident Q&A charges once, resumes at the current question and colors only a completed visit',()=>{
 const game=initialCampaign(17,'blue','streets-v2'),unit=game.units[0],node=nearbyNodes(game,unit)[0];
 const started=campaignCommand(game,{type:'talkStart',mode:'resident',unitId:unit.id,nodeId:node.id}).game;
 assert.equal(started.units[0].ap,unit.ap-1);
 assert.equal(started.talk.rounds.length,1);
 assert.equal(started.visitColors,undefined);
 const save={game:started,selected:unit.id,districtId:node.districtId,view:'street'};
 let resumed=decodeSave(JSON.stringify(encodeSave(save))).save.session.game;
 while(resumed.talk){
  const talk=resumed.talk;
  resumed=campaignCommand(resumed,{type:'talkAnswer',unitId:unit.id,talkId:talk.id,step:talkStep(talk),reply:autoReply(talk)}).game;
 }
 assert.deepEqual(resumed.visitColors[node.cellId],{team:'blue',depth:1});
 assert.equal(resumed.units[0].ap,unit.ap-1);
 assert.equal(resumed.talkReports[0].mode,'resident');
 const abandoned=campaignCommand(started,{type:'talkLeave',unitId:unit.id,talkId:started.talk.id}).game;
 assert.equal(abandoned.visitColors,undefined);
});

test('the visit transition is persisted and rejected actions cannot alter it',()=>{
 const base=initialCampaign(17,'blue','streets-v2'),unit=base.units[0],map=mapFor(base);
 const node=nearbyNodes(base,unit)[0];
 const visit={type:'visit',unitId:unit.id,nodeId:node.id};
 const first=campaignCommand(base,visit).game;
 assert.deepEqual(first.visitColors[node.cellId],{team:'blue',depth:1});
 const second=campaignCommand(first,visit).game;
 assert.deepEqual(second.visitColors[node.cellId],{team:'blue',depth:2});
 assert.equal(campaignCommand(second,visit).game,second);
 const session={game:second,selected:unit.id,districtId:map.cells.get(unit.cellId).districtId,view:'street'};
 assert.deepEqual(decodeSave(JSON.stringify(encodeSave(session))).save.session.game.visitColors,second.visitColors);
 const contested=nextVisitColor(second.visitColors[node.cellId],'green');
 assert.deepEqual(contested,{team:'blue',depth:2,challenger:'green'});
 assert.deepEqual(nextVisitColor(contested,'green'),{team:'green',depth:2});
 assert.deepEqual(nextVisitColor(contested,'white'),{team:'blue',depth:2,challenger:'white'});
});

import { mapFor, walkGeometry, walkSummary, approachCells, campaignMap, allCells as cells, nodes, nodeById, districts, wonders, hexDistance, connected } from './campaign-map.ts';
import type { CampaignNode, Cell, MovementProfile } from './campaign-map.ts';
import { roadMovement,roadRoute } from './road-movement.ts';
import type { RoadMovement } from './road-movement.ts';
import policy from '../data/campaign-intelligence-policy.json' with { type: 'json' };
import type { Role } from './level.ts';
import { teams,teamRecord,teamHomes,defaultCommanders,campaignOutcome } from './campaign-teams.ts';
import type { Team } from './campaign-teams.ts';
import { initialTrail,ensureTrail,recordArrival,recordWalk,recordNodeActivity } from './campaign-progress.ts';
import type { CampaignTrail } from './campaign-progress.ts';
import { planNodeVisit,visitPlans } from './campaign-plans.ts';
import { drawSurprise, adapted } from './campaign-events.ts';
import type { Surprise } from './campaign-events.ts';
import { commanders, chooseCommander, skillCost, isCommander, unitAvailable, unitGuarded, canCompete, inTalks, competitionPreview, splashTargets, behind, facingBetween } from './campaign-tactics.ts';
import type { CommanderId } from './campaign-tactics.ts';
export { chooseCommander, skillCost, isCommander, unitAvailable, unitGuarded, canCompete, inTalks, competitionPreview, splashTargets, behind } from './campaign-tactics.ts';
export type { Role } from './level.ts';
export type { Team } from './campaign-teams.ts';
export { teams,campaignOutcome } from './campaign-teams.ts';
import { makeTalk,answerTalk,talkStep,reportTalk,talkReward,aiReply,replies } from './campaign-dialogue.ts';
import type { Talk,TalkReport,Reply } from './campaign-dialogue.ts';
import { ensureGrowth,career,capacity,dailyAP,grantXP,exert,recover,morning,recruitCost,recruitLocation,helperTypes,helperRole,assistError,assist } from './campaign-growth.ts';
import type { Career,Helper } from './campaign-growth.ts';
export type Support=Record<string,Record<Team,number>>;
export type CampaignUnit={career?:Career;helper?:Helper;id:string;team:Team;role:Role;cellId:string;ap:number;maxAp:number;mobilization:number;fatigue:number;withdrawUntil:number;guardedUntil:number;skillReadyDay:number;transportDay:number;facing:number;bracedUntil:number;confusedUntil:number};
export type Stage={nodeId:string;team:Team;brand:'island'|'soapbox';openDay:number;staffed:boolean;lastEventDay:number};
export type CampaignLog={key:string;values:Record<string,string|number>};
type Activity={nodes:string[];kinds:string[];rested:boolean;afterRest:boolean};
type NodeState={influence:Record<Team,number>;visits:Record<Team,number>;active:Record<Team,boolean>};
export type Snapshot={releasedDay:number;asOfDay:number;support:Support};
export type Campaign={talk?:Talk|null;talkReports?:TalkReport[];movementProfile?:MovementProfile;trail?:CampaignTrail;playerTeam:Team;day:number;phase:'day'|'night';seed:number;news:'rain'|'market'|'volunteers'|'clear';surprise:Surprise|null;commanders:Record<Team,CommanderId>;talkZones:{cellId:string;untilDay:number}[];surges:{team:Team;cellId:string;day:number}[];flash:CampaignLog|null;units:CampaignUnit[];resources:Record<Team,{materials:number;volunteers:number}>;support:Support;nodeState:Record<string,NodeState>;stages:Stage[];activity:Record<string,Record<Team,Activity>>;wonderPriority:Record<Team,string[]>;prepared:Record<Team,{topic:string;day:number}|null>;eventDone:Record<Team,number>;poll:Snapshot|null;pollHistory:Snapshot[];rumor:Snapshot|null;history:{day:number;support:Support}[];logs:CampaignLog[];actions:number;result:Team|'draw'|null};
export type Command=
 |{type:'recruit';unitId:string;helper:Helper}
 |{type:'assist';unitId:string;targetId:string}
 |{type:'talkStart';unitId:string;mode:'debate'|'stage';nodeId?:string}
 |{type:'talkAnswer';unitId:string;talkId:string;step:number;reply:Reply}
 |{type:'talkLeave';unitId:string;talkId:string}
 |{type:'move';unitId:string;cellId:string}
 |{type:'canvassRoute';unitId:string;nodeId:string}
 |{type:'transport';unitId:string;districtId:string}
 |{type:'canvass'|'visit'|'forum'|'livestream'|'culture'|'environment';unitId:string;nodeId:string}
 |{type:'build';unitId:string;nodeId:string;brand:'island'|'soapbox'}
 |{type:'staff'|'stageEvent'|'withdraw';unitId:string;nodeId:string}
 |{type:'rest'|'brace';unitId:string}
 |{type:'skill';unitId:string;targetId?:string}
 |{type:'rally'|'broadcast'|'backstab';unitId:string;targetId:string}
 |{type:'respond';unitId:string;choice:'adapt'|'mobilize'}
 |{type:'prepare'|'event';unitId:string;topic:string};
const emptyActivity=():Activity=>({nodes:[],kinds:[],rested:false,afterRest:false});
function dailyActivity(){return Object.fromEntries(districts.map(d=>[d.id,teamRecord(()=>emptyActivity())]));}
function news(seed:number){const next=(Math.imul(seed,1664525)+1013904223)>>>0;return {seed:next,news:(['rain','market','volunteers','clear'] as const)[next%4]};}
function log(g:Campaign,key:string,values:CampaignLog['values']={}){g.logs.unshift({key,values});g.logs=g.logs.slice(0,100);}
export function initialCampaign(seed=0x5eed,playerTeam:Team='blue',movementProfile:MovementProfile='legacy-hex'):Campaign{
 const {districts}=mapFor({movementProfile});
 const support=Object.fromEntries(districts.map(d=>[d.id,teamRecord(()=>100)]));
 const starts={blue:['6300500','6300300','6300700'],green:['6301000','6301200','6300900'],white:['6300400','6300600','6300100']};
 const units=teams.flatMap(team=>(['heavy','ranged','scout'] as Role[]).map((role,i)=>({id:`${team}${i+1}`,team,role,cellId:districts.find(d=>d.id===starts[team][i])!.anchor,ap:role==='scout'?18:14,maxAp:role==='scout'?18:14,mobilization:10,fatigue:0,withdrawUntil:0,guardedUntil:0,skillReadyDay:1,transportDay:0,facing:team==='blue'?0:3,bracedUntil:0,confusedUntil:0})));
 const n=news(seed);if(n.news==='volunteers')for(const u of units)u.ap++;
 const surprise=drawSurprise(n.seed,1,districts.map(d=>d.id));
 const g:Campaign={talk:null,talkReports:[],...(movementProfile==='streets-v2'?{movementProfile}:{}),trail:initialTrail(units),playerTeam,day:1,phase:'day',...n,...surprise,commanders:teamRecord(()=>'jiang' as CommanderId),talkZones:[],surges:[],flash:null,units,resources:teamRecord(()=>({materials:36,volunteers:6})),support,nodeState:Object.fromEntries(nodes.map(n=>[n.id,{influence:teamRecord(()=>0),visits:teamRecord(()=>0),active:teamRecord(()=>false)}])),stages:[],activity:dailyActivity(),wonderPriority:teamRecord(()=>wonders.map(w=>w.id)),prepared:teamRecord(()=>null),eventDone:teamRecord(()=>0),poll:null,pollHistory:[],rumor:null,history:[],logs:[{key:'c_logStart',values:{}}],actions:0,result:null};
 const initial=teams.reduce((state,team)=>chooseCommander(state,defaultCommanders[team],team),g);ensureGrowth(initial);return initial;
}
export function cellCost(g:Campaign,c:Pick<Cell,'terrain'|'districtId'>&Partial<Pick<Cell,'id'>>,team:Team=g.playerTeam,from?:string){
 return (c.terrain==='slope'?2:1)+(g.news==='rain'?1:0)+(g.surprise?.id==='streetworks'&&g.surprise.districtId===c.districtId&&!adapted(g.surprise,team)?1:0);
}
export function interactionCells(g:Campaign,node:CampaignNode){return g.movementProfile==='streets-v2'?[node.cellId,...approachCells(node.cellId)]:[node.cellId,...cells.get(node.cellId)!.neighbors];}

export function movement(g:Campaign,u:CampaignUnit,budget=u.ap){
 const costs=new Map<string,number>([[u.cellId,0]]),previous=new Map<string,string>();
 if(!unitAvailable(g,u)||unitGuarded(g,u)||u.bracedUntil>=g.day)return {costs:new Map<string,number>(),previous};
 if(g.movementProfile==='streets-v2')return roadMovement(g,u,budget);
 const occupied=new Set(g.units.filter(v=>v.id!==u.id&&unitAvailable(g,v)).map(v=>v.cellId));
 const queue=[{id:u.cellId,cost:0}];
 while(queue.length){queue.sort((a,b)=>b.cost-a.cost);const current=queue.pop()!;if(current.cost!==costs.get(current.id))continue;
  for(const id of cells.get(current.id)!.neighbors){if(occupied.has(id))continue;const c=cells.get(id)!;const cost=current.cost+cellCost(g,c,u.team,current.id);if(cost>budget||cost>=(costs.get(id)??Infinity))continue;costs.set(id,cost);previous.set(id,current.id);queue.push({id,cost});}
 }
 return {costs,previous};
}
export function routeFromMovement(u:CampaignUnit,to:string,walk:ReturnType<typeof movement>){
 if('road' in walk)return roadRoute(walk as RoadMovement,to);
 const {costs,previous}=walk;if(!costs.has(to))return null;const path=[to];while(path[0]!==u.cellId){const prev=previous.get(path[0]);if(!prev)return null;path.unshift(prev);}return {cost:costs.get(to)!,path,edgeIds:undefined,geometry:walkGeometry(path),...walkSummary()};
}
export function route(g:Campaign,u:CampaignUnit,to:string){return routeFromMovement(u,to,movement(g,u));}
export function scheduledEvent(day:number){return day===7||day===21?'presentation':day===14||day===27?'debate':null;}
export function eventTopic(day:number){return day===7?'transport':day===14?'housing':day===21?'environment':'housing';}
export function nextEvent(day:number){return [7,14,21,27].find(d=>d>=day)??null;}
export function stageStatus(g:Campaign,s:Stage){return g.day<s.openDay?'building':s.staffed?'staffed':'open';}
export function nodeOwner(g:Campaign,id:string):Team|'contested'|null{const n=g.nodeState[id];if(teams.filter(t=>n.active[t]).length>1)return 'contested';const owner=campaignOutcome(n.influence);return owner==='draw'?null:owner;}
function activity(g:Campaign,u:CampaignUnit,n:CampaignNode,kind:string,points:number){recordNodeActivity(g,u.team,n.id);const a=g.activity[n.districtId][u.team];const state=g.nodeState[n.id];if(kind!=='stage')state.visits[u.team]++;state.active[u.team]=true;state.influence[u.team]+=2;a.nodes=[...new Set([...a.nodes,n.id])];a.kinds=[...new Set([...a.kinds,kind,n.kind,`${kind}:${g.phase}`])];if(a.rested&&kind==='canvass')a.afterRest=true;g.support[n.districtId][u.team]+=points;}
function near(g:Campaign,u:CampaignUnit,node:CampaignNode){return interactionCells(g,node).includes(u.cellId);}
function impact(g:Campaign,a:CampaignUnit,b:CampaignUnit,kind:'rally'|'broadcast'|'backstab'){
 const power=competitionPreview(g,a,b,kind).power;b.mobilization=Math.max(0,b.mobilization-power);
 if(b.mobilization===0){b.withdrawUntil=g.day+1;b.ap=0;}
 if(power>0){const condition=career(b);condition.morale=Math.max(0,condition.morale-2);b.career=condition;b.facing=facingBetween(cells.get(b.cellId)!,cells.get(a.cellId)!);g.support[cells.get(a.cellId)!.districtId][a.team]+=3;}
 return power;
}
export function responseCost(choice:string){return {ap:2,materials:choice==='adapt'?2:0};}
export function transportDestination(g:Campaign,u:CampaignUnit,districtId:string){
 const {districts}=mapFor(g);
 const district=districts.find(d=>d.id===districtId);if(!district)return null;
 const anchor=cells.get(district.anchor)!;const occupied=new Set(g.units.filter(v=>v.id!==u.id&&unitAvailable(g,v)).map(v=>v.cellId));
 const candidates=[anchor,...anchor.neighbors.map(id=>cells.get(id)!)];
 return candidates.find(c=>c.districtId===districtId&&!occupied.has(c.id)&&connected(u.cellId,c.id))??null;
}
export function actionCost(g:Campaign,cmd:{type:Command['type'];brand?:string;choice?:string;nodeId?:string;unitId?:string},team:Team=g.playerTeam){
 const {nodeById}=mapFor(g);
 if(cmd.type==='recruit')return recruitCost(g,team);
 if(cmd.type==='assist')return {ap:2,materials:2};
 if(cmd.type==='talkAnswer'||cmd.type==='talkLeave')return {ap:0,materials:0};
 if(cmd.type==='talkStart')return actionCost(g,{...cmd,type:cmd.nodeId?'stageEvent':'event'},team);
 if(cmd.type==='canvassRoute'){const u=g.units.find(u=>u.id===cmd.unitId&&u.team===team);if(u&&cmd.nodeId){const plan=planNodeVisit(g,u,cmd.nodeId);return {ap:plan.totalAp??interactionCost('canvass').ap,materials:plan.materials};}return interactionCost('canvass');}
 const cost=cmd.type==='skill'?skillCost(g,team):cmd.type==='respond'?responseCost(cmd.choice??'adapt'):interactionCost(cmd.type,cmd.brand);
 if(cmd.type==='stageEvent'&&g.surprise?.id==='powercut'&&g.surprise.districtId===nodeById.get(cmd.nodeId??'')?.districtId&&!adapted(g.surprise,team))cost.materials++;
 return cost;
}
export function campaignCommand(original:Campaign,cmd:Command,team:Team=original.playerTeam):{game:Campaign;error?:string}{
 const {nodeById,districts}=mapFor(original);
 if(original.result)return {game:original,error:'c_errorEnded'};
 if(original.talk&&!['talkAnswer','talkLeave'].includes(cmd.type))return {game:original,error:'d_finishFirst'};
 if(cmd.type==='canvassRoute'){
  const actor=original.units.find(u=>u.id===cmd.unitId&&u.team===team);if(!actor)return {game:original,error:'c_errorUnit'};
  const plan=planNodeVisit(original,actor,cmd.nodeId);if(!plan.canAct)return {game:original,error:plan.error??'c_errorRoute'};
  const moved=plan.moveAp?campaignCommand(original,{type:'move',unitId:actor.id,cellId:plan.destination!},team):{game:original};
  if(moved.error)return {game:original,error:moved.error};
  const result=campaignCommand(moved.game,{type:'canvass',unitId:actor.id,nodeId:cmd.nodeId},team);
  return result.error?{game:original,error:result.error}:result;
 }

 const g=structuredClone(original);ensureTrail(g);ensureGrowth(g);const u=g.units.find(u=>u.id===cmd.unitId&&u.team===team);
 const fail=(error:string)=>({game:original,error});
 if(!u||!unitAvailable(g,u)&&!['talkAnswer','talkLeave'].includes(cmd.type))return fail('c_errorUnit');
 const resource=g.resources[team];const fees=actionCost(g,cmd,team);let cost=fees.ap;const materials=fees.materials;let target:CampaignNode|undefined;let movePath:string[]=[];let moveEdges:number[]|undefined;
 if('nodeId' in cmd&&cmd.nodeId){target=nodeById.get(cmd.nodeId);if(!target||!near(g,u,target))return fail('c_errorNear');}
 if(cmd.type==='recruit'){if(!isCommander(u)||!helperTypes.includes(cmd.helper))return fail('g_recruitLeader');if(g.units.filter(v=>v.team===team).length>=7)return fail('g_rosterFull');if(!recruitLocation(g,u))return fail('c_errorOccupied');}
 else if(cmd.type==='assist'){const error=assistError(g,u,cmd.targetId);if(error)return fail(error);}
 else if(cmd.type==='talkAnswer'||cmd.type==='talkLeave'){
  const talk=g.talk;if(!talk||talk.id!==cmd.talkId||talk.unitId!==u.id||talk.team!==team)return fail('d_stale');
  if(cmd.type==='talkAnswer'&&(cmd.step!==talkStep(talk)||!replies.includes(cmd.reply)))return fail('d_stale');
 }else if(cmd.type==='talkStart'){
  if(!['debate','stage'].includes(cmd.mode))return fail('c_errorEvent');
  if(cmd.mode==='debate'&&(cmd.nodeId||!scheduledEvent(g.day)||g.eventDone[team]===g.day))return fail('c_errorEvent');
  if(cmd.mode==='stage'){const s=g.stages.find(s=>s.nodeId===cmd.nodeId&&s.team===team);if(!target||!s||!s.staffed||g.day<s.openDay||s.lastEventDay===g.day)return fail('c_errorStage');}
 }else if(cmd.type==='move'){
  if(unitGuarded(g,u)||u.bracedUntil>=g.day)return fail('c_errorGuardMove');
  if(!cells.has(cmd.cellId)||cmd.cellId===u.cellId)return fail('c_errorRoute');
  const p=route(g,u,cmd.cellId);if(!p)return fail('c_errorRoute');cost=p.cost;movePath=p.path;moveEdges=p.edgeIds;
 }else if(cmd.type==='transport'){
  const d=districts.find(d=>d.id===cmd.districtId);if(!d||u.transportDay===g.day||unitGuarded(g,u)||u.bracedUntil>=g.day)return fail('c_errorTransport');
  if(cells.get(u.cellId)!.districtId===d.id||!connected(u.cellId,d.anchor))return fail('c_errorRoute');
  if(!transportDestination(g,u,d.id))return fail('c_errorOccupied');
 }else if(['canvass','visit','forum','livestream','culture','environment'].includes(cmd.type)){
  if(g.nodeState[target!.id].visits[team]>=2)return fail('c_errorCrowd');
 }else if(cmd.type==='build'){
  if(target!.kind!=='venue'||g.stages.some(s=>s.nodeId===target!.id))return fail('c_errorVenue');
 }else if(cmd.type==='staff'||cmd.type==='stageEvent'||cmd.type==='withdraw'){
  const s=g.stages.find(s=>s.nodeId===target!.id&&s.team===team);if(!s)return fail('c_errorStage');
  if(cmd.type==='staff'){if(s.staffed)return fail('c_errorStaff');if(g.day<s.openDay)return fail('c_errorBuilding');if(resource.volunteers<1)return fail('c_errorVolunteers');}
  if(cmd.type==='stageEvent'){if(g.day<s.openDay||!s.staffed)return fail('c_errorStaff');if(s.lastEventDay===g.day)return fail('c_errorOnce');}
 }else if(cmd.type==='brace'){if(u.role!=='heavy'||u.bracedUntil>=g.day)return fail('c_errorRole');}
 else if(cmd.type==='respond'){if(!g.surprise||g.surprise.responses[team]||!['adapt','mobilize'].includes(cmd.choice))return fail('c_errorResponse');if(cmd.choice==='mobilize'&&resource.volunteers<1)return fail('c_errorVolunteers');}
 else if(cmd.type==='skill'){
  if(!isCommander(u)||u.skillReadyDay>g.day)return fail('c_errorCooldown');
  if(g.commanders[team]==='huang'){const enemy=g.units.find(v=>v.id===cmd.targetId&&v.team!==team&&unitAvailable(g,v));if(!enemy||hexDistance(cells.get(u.cellId)!,cells.get(enemy.cellId)!)>3)return fail('c_errorRange');}
 }else if(cmd.type==='rally'||cmd.type==='broadcast'||cmd.type==='backstab'){
  if(!canCompete(g,u))return fail('c_errorCeasefire');
  const enemy=g.units.find(v=>v.id===cmd.targetId&&v.team!==team&&unitAvailable(g,v));
  if(!enemy||hexDistance(cells.get(u.cellId)!,cells.get(enemy.cellId)!)>(u.role==='ranged'?3:1))return fail('c_errorRange');
  if(inTalks(g,enemy))return fail('c_errorCeasefire');
  if(cmd.type==='broadcast'&&u.role!=='ranged')return fail('c_errorRole');
  if(cmd.type==='backstab'&&(u.role!=='scout'||!behind(u,enemy)))return fail('c_errorRear');
 }else if(cmd.type==='prepare'||cmd.type==='event'){
  if(!['housing','transport','environment'].includes(cmd.topic))return fail('c_errorTopic');
  if(cmd.type==='event'&&(!scheduledEvent(g.day)||g.eventDone[team]===g.day))return fail('c_errorEvent');
  if(cmd.type==='prepare'&&g.prepared[team]?.day===g.day)return fail('c_errorOnce');
 }
 if(u.ap<cost)return fail('c_errorAP');if(resource.materials<materials)return fail('c_errorMaterials');
 u.ap-=cost;resource.materials-=materials;g.actions++;g.flash=null;
 const previousLevel=career(u).level;
 const values:CampaignLog['values']={team,unit:u.id,action:cmd.type,...(target?{node:target.id}:{})};
 switch(cmd.type){
  case 'recruit':{const id=`${team}${g.units.filter(v=>v.team===team).length+1}`;const role=helperRole[cmd.helper];const recruit:CampaignUnit={id,team,role,helper:cmd.helper,cellId:recruitLocation(g,u)!,ap:0,maxAp:role==='scout'?18:14,mobilization:10,fatigue:0,withdrawUntil:0,guardedUntil:0,skillReadyDay:1,transportDay:g.day,facing:u.facing,bracedUntil:0,confusedUntil:0};recruit.career=career(recruit);g.units.push(recruit);recordArrival(g,team,[recruit.cellId]);values.helper=cmd.helper;break;}
  case 'assist':assist(g,u,g.units.find(v=>v.id===cmd.targetId)!);values.helper=u.helper!;break;
  case 'talkStart':g.talk=makeTalk(g,u.id,cmd.mode,cmd.nodeId);if(cmd.mode==='debate')g.eventDone[team]=g.day;else g.stages.find(s=>s.nodeId===cmd.nodeId)!.lastEventDay=g.day;break;
  case 'talkAnswer':case 'talkLeave':{const out=cmd.type==='talkAnswer'?answerTalk(g.talk!,cmd.reply):{talk:g.talk!,done:true};g.talk=out.talk;if(out.done){const report=reportTalk(out.talk,cmd.type==='talkLeave');const reward=talkReward(report);if(report.mode==='debate'){for(const d of districts)g.support[d.id][team]+=reward;g.prepared[team]=null;g.activity[cells.get(u.cellId)!.districtId][team].kinds.push(scheduledEvent(g.day)!);}else{const s=g.stages.find(s=>s.nodeId===report.nodeId)!;const penalty=g.surprise?.id==='powercut'&&g.surprise.districtId===nodeById.get(report.nodeId!)!.districtId&&!adapted(g.surprise,team)?3:0;activity(g,u,nodeById.get(s.nodeId)!,'stage',Math.max(1,reward-penalty));}g.talkReports=[report,...(g.talkReports??[])].slice(0,12);g.talk=null;values.action='talkComplete';values.quality=report.quality;}break;}
  case 'move':u.facing=facingBetween(cells.get(movePath[movePath.length-2])!,cells.get(cmd.cellId)!);u.cellId=cmd.cellId;recordWalk(g,u,movePath,moveEdges);break;
  case 'transport':u.cellId=transportDestination(g,u,cmd.districtId)!.id;recordArrival(g,team,[u.cellId]);u.transportDay=g.day;u.fatigue=Math.min(10,u.fatigue+2);break;
  case 'rest':recover(u);u.fatigue=Math.max(0,u.fatigue-4);u.mobilization=Math.min(10,u.mobilization+4);g.activity[cells.get(u.cellId)!.districtId][team].rested=true;break;
  case 'brace':u.bracedUntil=g.day;break;
  case 'respond':{const event=g.surprise!;event.responses[team]=cmd.choice;if(cmd.choice==='mobilize'){resource.volunteers--;g.support[event.districtId][team]+=4;}else if(event.id==='donation')resource.materials+=6;else if(event.id==='nightfair')g.support[event.districtId][team]+=6;break;}
  case 'skill':{
   const id=g.commanders[team];u.skillReadyDay=g.day+commanders[id].cooldown;
   if(id==='jiang')u.guardedUntil=g.day+2;
   if(id==='shen'){for(const enemy of g.units.filter(v=>v.team!==team&&unitAvailable(g,v)))enemy.confusedUntil=g.day+1;g.surges.push({team,cellId:u.cellId,day:g.day});}
   if(id==='huang'){const enemy=g.units.find(v=>v.id===cmd.targetId)!;const shifted=Math.min(3,enemy.ap);enemy.ap-=shifted;u.ap=Math.min(u.maxAp+(g.news==='volunteers'?1:0),u.ap+shifted);g.talkZones.push({cellId:enemy.cellId,untilDay:g.day+1});}
   values.skill=id;break;
  }
  case 'build':g.stages.push({nodeId:target!.id,team,brand:cmd.brand,openDay:g.day+(cmd.brand==='island'?2:1),staffed:false,lastEventDay:0});break;
  case 'staff':g.stages.find(s=>s.nodeId===target!.id)!.staffed=true;resource.volunteers--;break;
  case 'withdraw':{const s=g.stages.find(s=>s.nodeId===target!.id)!;if(s.staffed)resource.volunteers++;g.stages=g.stages.filter(candidate=>candidate!==s);resource.materials+=2;break;}
  case 'stageEvent':{const s=g.stages.find(s=>s.nodeId===target!.id)!;s.lastEventDay=g.day;const penalty=g.surprise?.id==='powercut'&&g.surprise.districtId===target!.districtId&&!adapted(g.surprise,team)?3:0;activity(g,u,target!,'stage',(s.brand==='island'?12:10)-penalty);break;}
  case 'broadcast':{for(const entry of splashTargets(g,u,cmd.targetId))impact(g,u,entry.unit,'broadcast');u.facing=facingBetween(cells.get(u.cellId)!,cells.get(g.units.find(v=>v.id===cmd.targetId)!.cellId)!);break;}
  case 'backstab':case 'rally':{const enemy=g.units.find(v=>v.id===cmd.targetId)!;impact(g,u,enemy,cmd.type);u.facing=facingBetween(cells.get(u.cellId)!,cells.get(enemy.cellId)!);break;}
  case 'prepare':g.prepared[team]={topic:cmd.topic,day:g.day};break;
  case 'event':{const prepared=g.prepared[team];const bonus=prepared?.topic===eventTopic(g.day)&&cmd.topic===eventTopic(g.day)?5:2;for(const d of districts)g.support[d.id][team]+=bonus;g.eventDone[team]=g.day;g.prepared[team]=null;const a=g.activity[cells.get(u.cellId)!.districtId][team];a.kinds.push(scheduledEvent(g.day)!);break;}
  default:{const n=target!;const visits=g.nodeState[n.id].visits[team];const timeBonus=(n.kind==='market'&&g.phase==='day')||(n.kind==='community'&&g.phase==='night')?2:0;const localEvent=g.surprise?.districtId===n.districtId?g.surprise:null;const penalty=localEvent?.id==='rumorstorm'&&!adapted(localEvent,team)?2:0;const fair=localEvent?.id==='nightfair'&&g.phase==='night'&&!visits?3:0;const points=Math.max(1,(visits?4:8+timeBonus+(g.news==='market'?2:0))+fair-penalty);activity(g,u,n,cmd.type,points);u.fatigue=Math.min(10,u.fatigue+1+(localEvent?.id==='heatwave'&&!adapted(localEvent,team)?1:0));break;}
 }
 if(cmd.type!=='talkAnswer'&&cmd.type!=='talkLeave'||values.action==='talkComplete')exert(g,u,String(values.action),cost);
 if(career(u).level>previousLevel)values.level=career(u).level;
 if(career(u).health===0){u.withdrawUntil=g.day+1;u.ap=0;}
 if(['skill','broadcast','backstab','respond'].includes(cmd.type))g.flash={key:cmd.type==='backstab'?'c_exclusive':'c_breaking',values};
 log(g,'c_logAction',values);return {game:g};
}
export function prioritizeWonder(g:Campaign,id:string,team:Team=g.playerTeam){
 if(g.result||!wonders.some(w=>w.id===id))return g;
 return {...g,wonderPriority:{...g.wonderPriority,[team]:[id,...g.wonderPriority[team].filter(v=>v!==id)]}};
}
export function wonderCondition(g:Campaign,id:string,team:Team){
 const w=wonders.find(w=>w.id===id)!;const a=g.activity[w.districtId][team];
 switch(w.gameplay.conditionId){
  case 'rest_then_outreach':return a.afterRest;
  case 'policy_forum':return a.kinds.includes('forum');
  case 'connected_route':return a.nodes.length>=2;
  case 'community_stage_event':return a.kinds.includes('stage');
  case 'night_canvassing':return a.kinds.includes('canvass:night');
  case 'livestream':return a.kinds.includes('livestream');
  case 'day_canvassing':return a.kinds.includes('canvass:day');
  case 'culture_exchange':return a.kinds.includes('culture');
  case 'market_to_wharf_route':return a.kinds.includes('market')&&a.kinds.includes('waterfront');
  case 'neighborhood_visit':return a.kinds.includes('visit');
  case 'scheduled_policy_presentation':return a.kinds.includes('presentation');
  case 'environment_activity':return a.kinds.includes('environment');
  default:return false;
 }
}
function settle(g:Campaign){
 const {nodeById}=mapFor(g);
 for(const surge of g.surges.filter(s=>s.day===g.day)){g.support[cells.get(surge.cellId)!.districtId][surge.team]+=4;log(g,'c_logSurge',{team:surge.team});}
 for(const team of teams){let count=0;for(const id of g.wonderPriority[team]){if(count>=3)break;const n=nodeById.get(id)!;
  const staffed=g.units.some(u=>u.team===team&&unitAvailable(g,u)&&near(g,u,n));
  if(staffed&&nodeOwner(g,id)===team&&g.activity[n.districtId][team].nodes.length){g.support[n.districtId][team]+=2+(wonderCondition(g,id,team)?2:0);count++;log(g,'c_logWonder',{team,node:id});}
 }}
 g.history.push({day:g.day,support:structuredClone(g.support)});
 log(g,'c_logSettlement',{day:g.day});
}
function ai(original:Campaign,team:Team){
 const {nodes,districts}=mapFor(original);
 let g=original;
 for(const id of g.units.filter(u=>u.team===team).map(u=>u.id)){
  let u=g.units.find(u=>u.id===id)!;if(!unitAvailable(g,u))continue;
  const exec=(cmd:Command)=>{const out=campaignCommand(g,cmd,team);g=out.game;u=g.units.find(u=>u.id===id)!;return !out.error;};
  if(career(u).health<45||career(u).morale<35||u.fatigue>=6)exec({type:'rest',unitId:id});
  if(isCommander(u)&&[5,10,15,20].includes(g.day)&&g.resources[team].materials>=recruitCost(g,team).materials+8)exec({type:'recruit',unitId:id,helper:helperTypes[(g.units.filter(v=>v.team===team).length-3)%3]});
  if(u.helper){const target=g.units.filter(v=>v.team===team&&v.id!==u.id&&!assistError(g,u,v.id)).sort((a,b)=>career(a).health-career(b).health)[0];if(target)exec({type:'assist',unitId:id,targetId:target.id});}
  if(g.surprise&&!g.surprise.responses[team]&&id===`${team}1`)exec({type:'respond',unitId:id,choice:g.surprise.id==='donation'?'adapt':'mobilize'});
  if(isCommander(u)&&u.skillReadyDay<=g.day&&g.day%2===1)exec({type:'skill',unitId:id,...(g.commanders[team]==='huang'?{targetId:g.units.find(v=>v.team!==team&&unitAvailable(g,v)&&hexDistance(cells.get(v.cellId)!,cells.get(u.cellId)!)<=3)?.id}:{})});
  if(scheduledEvent(g.day)&&g.eventDone[team]!==g.day&&exec({type:'talkStart',unitId:id,mode:'debate'})){while(g.talk)if(!exec({type:'talkAnswer',unitId:id,talkId:g.talk.id,step:talkStep(g.talk),reply:aiReply(g.talk)}))break;}
  if([6,13,20,26].includes(g.day)&&id===`${team}1`)exec({type:'prepare',unitId:id,topic:eventTopic(g.day+1)});
  if(g.day%4===0&&u.ap>=8){const target=districts[(g.day/4+Number(id.slice(-1))*3)%12];exec({type:'transport',unitId:id,districtId:target.id});}
  for(let turn=0;turn<6&&u.ap>=2;turn++){
   const enemy=g.units.find(v=>v.team!==team&&unitAvailable(g,v)&&hexDistance(cells.get(v.cellId)!,cells.get(u.cellId)!)<=(u.role==='ranged'?3:1));
   if(enemy&&turn===0){if(u.role==='ranged'&&splashTargets(g,u,enemy.id).length>1&&exec({type:'broadcast',unitId:id,targetId:enemy.id}))continue;if(u.role==='scout'&&behind(u,enemy)&&exec({type:'backstab',unitId:id,targetId:enemy.id}))continue;if(exec({type:'rally',unitId:id,targetId:enemy.id}))continue;}
   const local=nodes.filter(n=>near(g,u,n));const stage=local.find(n=>g.stages.some(s=>s.nodeId===n.id&&s.team===team));
   if(stage){const s=g.stages.find(s=>s.nodeId===stage.id)!;if(g.day>=s.openDay&&!s.staffed&&exec({type:'staff',unitId:id,nodeId:stage.id}))continue;if(s.staffed&&s.lastEventDay!==g.day&&exec({type:'talkStart',unitId:id,mode:'stage',nodeId:stage.id})){while(g.talk)if(!exec({type:'talkAnswer',unitId:id,talkId:g.talk.id,step:talkStep(g.talk),reply:aiReply(g.talk)}))break;continue;}}
   const venue=local.find(n=>n.kind==='venue'&&!g.stages.some(s=>s.nodeId===n.id));
   if(venue&&g.day%3===0&&exec({type:'build',unitId:id,nodeId:venue.id,brand:Number(id.slice(-1))%2?'island':'soapbox'}))continue;
   const candidate=local.find(n=>g.nodeState[n.id].visits[team]<2);
   if(candidate&&exec({type:'canvass',unitId:id,nodeId:candidate.id}))continue;
   if(g.movementProfile==='streets-v2'){const target=visitPlans(g,u).filter(p=>p.canAct&&p.moveAp).sort((a,b)=>a.totalAp!-b.totalAp!||a.nodeId.localeCompare(b.nodeId))[0];if(target&&exec({type:'canvassRoute',unitId:id,nodeId:target.nodeId}))continue;break;}
   const reachable=movement(g,u);const destinations=nodes.filter(n=>g.nodeState[n.id].visits[team]<2&&reachable.costs.has(n.cellId)&&n.cellId!==u.cellId).sort((a,b)=>(reachable.costs.get(a.cellId)!-reachable.costs.get(b.cellId)!)||(a.id.localeCompare(b.id)));
   if(destinations[0]&&exec({type:'move',unitId:id,cellId:destinations[0].cellId}))continue;
   break;
  }
  if(u.fatigue>=5)exec({type:'rest',unitId:id});
  if(u.role==='heavy'&&g.units.some(v=>v.team!==team&&unitAvailable(g,v)&&hexDistance(cells.get(v.cellId)!,cells.get(u.cellId)!)<=3))exec({type:'brace',unitId:id});
 }
 return g;
}
export function endCampaignPhase(original:Campaign){
 const {districts}=mapFor(original);
 if(original.result||original.talk)return original;
 if(original.phase==='day'){const g=structuredClone(original);g.phase='night';log(g,'c_logNight');return g;}
 let g=structuredClone(original);ensureGrowth(g);const opponents=teams.filter(t=>t!==g.playerTeam);if(g.day%2===0)opponents.reverse();for(const team of opponents)g=ai(g,team);settle(g);
 if(g.day===28){const total=totals(g.support);g.result=campaignOutcome(total);log(g,'c_logFinal');return g;}
 if(g.surprise)for(const team of teams)if(g.surprise.responses[team]==='mobilize')g.resources[team].volunteers++;
 g.day++;g.phase='day';Object.assign(g,news(g.seed));Object.assign(g,drawSurprise(g.seed,g.day,districts.map(d=>d.id)));g.activity=dailyActivity();g.flash=null;g.surges=[];g.talkZones=g.talkZones.filter(z=>z.untilDay>=g.day);
 for(const n of Object.values(g.nodeState)){n.visits=teamRecord(()=>0);n.active=teamRecord(()=>false);}
 for(const team of teams)g.resources[team].materials+=Math.max(4,8-Math.max(0,g.units.filter(u=>u.team===team).length-3));
 for(const u of g.units){morning(u);u.fatigue=Math.max(0,u.fatigue-1);if(u.withdrawUntil===g.day||u.withdrawUntil<g.day&&u.mobilization===0){u.mobilization=10;const home=districts.find(d=>d.id===teamHomes[u.team])!;const location=[home.anchor,...cells.get(home.anchor)!.neighbors,...cells.get(home.anchor)!.neighbors.flatMap(id=>cells.get(id)!.neighbors)].find(id=>!g.units.some(v=>v.id!==u.id&&unitAvailable(g,v)&&v.cellId===id));if(location){u.cellId=location;recordArrival(g,u.team,[location]);}}u.ap=unitAvailable(g,u)?dailyAP(g,u):0;}
 if(policy.polling.releaseDays.includes(g.day)){const snapshot={releasedDay:g.day,asOfDay:g.day-1,support:structuredClone(g.support)};g.poll=snapshot;g.pollHistory.push(snapshot);log(g,'c_logPoll',{day:g.day});}
 if(g.day>=15)g.rumor={releasedDay:g.day,asOfDay:g.day-1,support:structuredClone(g.support)};
 return g;
}
export function totals(support:Support){return Object.values(support).reduce((a,s)=>{for(const team of teams)a[team]+=s[team]??0;return a;},teamRecord(()=>0));}
export function rumorBand(s:Record<Team,number>){const ordered=[...teams].sort((a,b)=>(s[b]??0)-(s[a]??0));const first=s[ordered[0]]??0,second=s[ordered[1]]??0;const sum=first+second;if(!sum)return {band:'insufficient_reports',leader:null};const margin=(first-second)/sum;return {band:margin>=policy.rumors.thresholds.clearLeadAtLeast?'clear_lead':margin>=policy.rumors.thresholds.slightLeadAtLeast?'slight_lead':'neck_and_neck',leader:margin>=policy.rumors.thresholds.slightLeadAtLeast?ordered[0]:null};}
export function intelligence(g:Campaign,scope='city'){
 if(g.result)return {kind:'result' as const,asOfDay:28,support:scope==='city'?totals(g.support):g.support[scope]};
 if(g.day>=15){const s=g.rumor!;return {kind:'rumor' as const,asOfDay:s.asOfDay,...rumorBand(scope==='city'?totals(s.support):s.support[scope])};}
 if(!g.poll)return {kind:'pending' as const};
 return {kind:'poll' as const,asOfDay:g.poll.asOfDay,releasedDay:g.poll.releasedDay,support:scope==='city'?totals(g.poll.support):g.poll.support[scope]};
}
export function nearbyNodes(g:Campaign,u:CampaignUnit){return mapFor(g).nodes.filter(n=>near(g,u,n)&&unitAvailable(g,u));}
export function interactionCost(type:Command['type'],brand?:string){return {ap:type==='transport'?6:type==='event'||type==='broadcast'?4:type==='build'||type==='backstab'?3:type==='staff'||type==='withdraw'?1:2,materials:type==='transport'?4:type==='event'?3:type==='build'?(brand==='island'?8:6):type==='stageEvent'?2:['canvass','visit','forum','livestream','culture','environment','prepare','broadcast'].includes(type)?1:0};}

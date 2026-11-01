import type { Campaign } from './campaign.ts';
import type { Team } from './campaign-teams.ts';
export const replies=['listen','plan','verify','pivot'] as const;
export type Reply=typeof replies[number];
export type Topic='housing'|'transport'|'environment';
export type TalkRound={kind:'opening'|'resident'|'clash'|'connection';topic:Topic;need:Reply;counter:Reply;answer?:Reply;follow?:Reply;score?:number};
export type Talk={id:string;team:Team;unitId:string;day:number;mode:'debate'|'stage';nodeId?:string;brand?:'island'|'soapbox';prepared:Topic|null;index:number;beat:'answer'|'follow';rounds:TalkRound[]};
export type TalkReport=Omit<Talk,'beat'>&{quality:'strong'|'steady'|'weak';abandoned:boolean};
const topics:Topic[]=['housing','transport','environment'];
export function makeTalk(g:Campaign,unitId:string,mode:Talk['mode'],nodeId?:string):Talk{
 const unit=g.units.find(u=>u.id===unitId)!;const seed=(g.seed^(g.day*2654435761)^g.actions)>>>0;
 const kinds:TalkRound['kind'][]=mode==='debate'?['opening','resident','clash','connection']:['resident','clash','connection'];
 const stage=g.stages.find(s=>s.nodeId===nodeId);const prepared=g.prepared[unit.team]?.topic as Topic|undefined;
 return {id:`talk-${unit.team}-${g.day}-${g.actions}`,team:unit.team,unitId,day:g.day,mode,...(nodeId?{nodeId,brand:stage?.brand}:{}),prepared:prepared??null,index:0,beat:'answer',rounds:kinds.map((kind,i)=>({kind,topic:topics[((mode==='stage'?g.day+1:g.day===7?1:g.day===21?2:0)+i)%3],need:replies[(seed+i*3)%4],counter:replies[((seed>>>6)+i)%4]}))};
}
export function talkStep(talk:Talk){return talk.index*2+(talk.beat==='follow'?1:0);}
export function answerTalk(talk:Talk,choice:Reply):{talk:Talk;done:boolean}{
 const next=structuredClone(talk),round=next.rounds[next.index];
 if(next.beat==='answer'){round.answer=choice;next.beat='follow';return {talk:next,done:false};}
 round.follow=choice;
 // The counter reveals a different challenge. Matching it or showing evidence can recover an answer.
 const followNeed=replies[(replies.indexOf(round.counter)+1)%4];
 round.score=(round.answer===round.need?2:round.answer==='pivot'?0:1)+(choice===followNeed?2:choice==='verify'?1:0)+(next.prepared===round.topic?1:0);
 next.index++;next.beat='answer';return {talk:next,done:next.index===next.rounds.length};
}
export function reportTalk(talk:Talk,abandoned=false):TalkReport{
 const score=talk.rounds.reduce((s,r)=>s+(r.score??0),0);const ratio=score/(talk.rounds.length*5);
 const quality=ratio>=.65?'strong':ratio>=.35?'steady':'weak';
 const {beat:_,...rest}=talk;return {...rest,quality,abandoned};
}
export function talkReward(report:TalkReport){const score=report.rounds.reduce((s,r)=>s+(r.score??0),0);return report.mode==='debate'?Math.min(6,1+Math.floor(score/3)):Math.min(14,4+Math.floor(score*.7));}
export function autoReply(talk:Talk):Reply{const round=talk.rounds[talk.index];return talk.beat==='answer'?round.need:replies[(replies.indexOf(round.counter)+1)%4];}
export function aiReply(talk:Talk):Reply{const best=autoReply(talk);const signal=(talk.day*7+talk.index*3+(talk.team==='blue'?0:talk.team==='green'?1:2)+(talk.beat==='follow'?2:0))%5;return signal<3?best:replies[(replies.indexOf(best)+1+signal%2)%4];}
export function validTalk(value:any,g:Campaign,report=false):boolean{
 if(!value||typeof value!=='object'||!['blue','green','white'].includes(value.team)||!g.units.some(u=>u.id===value.unitId&&u.team===value.team)||!Number.isInteger(value.day)||value.day<1||value.day>g.day||!['debate','stage'].includes(value.mode)||typeof value.id!=='string'||value.id.length>80||![null,...topics].includes(value.prepared))return false;
 if(value.mode==='stage'&&(!g.nodeState[value.nodeId]||!['island','soapbox'].includes(value.brand)))return false;
 if(!Array.isArray(value.rounds)||value.rounds.length!==(value.mode==='debate'?4:3)||!Number.isInteger(value.index)||value.index<0||value.index>value.rounds.length)return false;
 if(!value.rounds.every((r:any,i:number)=>r&&['opening','resident','clash','connection'].includes(r.kind)&&topics.includes(r.topic)&&replies.includes(r.need)&&replies.includes(r.counter)&&(r.answer===undefined||replies.includes(r.answer))&&(r.follow===undefined||replies.includes(r.follow))&&(r.score===undefined||Number.isInteger(r.score)&&r.score>=0&&r.score<=5)&& (i<value.index?replies.includes(r.answer)&&replies.includes(r.follow)&&r.score!==undefined:true)))return false;
 for(let i=0;i<value.rounds.length;i++){const r=value.rounds[i];if(i>value.index&&(r.answer!==undefined||r.follow!==undefined||r.score!==undefined))return false;if(r.score!==undefined){const expected=(r.answer===r.need?2:r.answer==='pivot'?0:1)+(r.follow===replies[(replies.indexOf(r.counter)+1)%4]?2:r.follow==='verify'?1:0)+(value.prepared===r.topic?1:0);if(r.score!==expected)return false;}}
 if(report)return ['strong','steady','weak'].includes(value.quality)&&typeof value.abandoned==='boolean'&&(value.abandoned||value.index===value.rounds.length)&&reportTalk(value).quality===value.quality;
 return value.day===g.day&&value.index<value.rounds.length&&['answer','follow'].includes(value.beat)&&(value.beat==='follow'?!!value.rounds[value.index].answer:!value.rounds[value.index].answer);
}

import type { Campaign,CampaignUnit } from './campaign.ts';
import type { Role } from './level.ts';
import type { Team } from './campaign-teams.ts';
import { cells,hexDistance } from './campaign-map.ts';
export const commanders={
 jiang:{role:'heavy' as Role,ap:2,cooldown:6},
 shen:{role:'ranged' as Role,ap:4,cooldown:6},
 huang:{role:'heavy' as Role,ap:3,cooldown:6},
};
export type CommanderId=keyof typeof commanders;
export const unitAvailable=(g:Campaign,u:CampaignUnit)=>u.withdrawUntil<=g.day&&u.mobilization>0;
export const unitGuarded=(g:Campaign,u:CampaignUnit)=>u.guardedUntil>=g.day;
export const isCommander=(u:CampaignUnit)=>u.id===`${u.team}1`;
export const confused=(g:Campaign,u:CampaignUnit)=>u.confusedUntil>=g.day;
export function inTalks(g:Campaign,u:CampaignUnit){return g.talkZones.some(z=>z.untilDay>=g.day&&hexDistance(cells.get(z.cellId)!,cells.get(u.cellId)!)<=1);}
export function canCompete(g:Campaign,u:CampaignUnit){return unitAvailable(g,u)&&!confused(g,u)&&!inTalks(g,u);}
export function facingBetween(a:{q:number;r:number},b:{q:number;r:number}){
 const dx=(b.q-a.q)+(b.r-a.r)/2,dy=(b.r-a.r)*Math.sqrt(3)/2;
 return ((Math.round(-Math.atan2(dy,dx)/(Math.PI/3))%6)+6)%6;
}
export function behind(a:CampaignUnit,b:CampaignUnit){const ac=cells.get(a.cellId)!,bc=cells.get(b.cellId)!;if(hexDistance(ac,bc)!==1)return false;const difference=(facingBetween(bc,ac)-b.facing+6)%6;return difference>=2&&difference<=4;}
export function competitionPreview(g:Campaign,a:CampaignUnit,b:CampaignUnit,kind:'rally'|'broadcast'|'backstab'='rally'){
 const advantage=({heavy:'ranged',ranged:'scout',scout:'heavy'} as const)[a.role]===b.role;
 let power=Math.floor((kind==='broadcast'?2:a.role==='heavy'?4:3)*(advantage?1.5:1));
 const rear=kind==='backstab'&&a.role==='scout'&&behind(a,b);
 if(rear)power=Math.floor(power*1.5);
 const armor=b.role==='heavy'?1:0;
 const braced=b.bracedUntil>=g.day?2:0;
 power=Math.max(1,power-armor-braced);
 if(unitGuarded(g,b)||inTalks(g,b))power=0;
 return {power,advantage,rear,armor,braced};
}
export function splashTargets(g:Campaign,a:CampaignUnit,centerId:string){const center=g.units.find(u=>u.id===centerId&&u.team!==a.team&&unitAvailable(g,u));if(!center||hexDistance(cells.get(a.cellId)!,cells.get(center.cellId)!)>3)return [];return g.units.filter(b=>b.team!==a.team&&unitAvailable(g,b)&&hexDistance(cells.get(center.cellId)!,cells.get(b.cellId)!)<=1).map(b=>({unit:b,...competitionPreview(g,a,b,'broadcast')}));}
export function skillCost(g:Campaign,team:Team){return {ap:commanders[g.commanders[team]].ap,materials:0};}
export function chooseCommander(original:Campaign,id:CommanderId,team:Team=original.playerTeam){
 if(!(id in commanders)||original.day!==1||original.phase!=='day'||original.actions||original.result)return original;
 const g=structuredClone(original);g.commanders[team]=id;const leader=g.units.find(u=>isCommander(u)&&u.team===team)!;const role=commanders[id].role;
 const swap=g.units.find(u=>u.team===team&&u.id!==leader.id&&u.role===role);if(swap)swap.role=leader.role;leader.role=role;
 for(const u of g.units.filter(u=>u.team===team)){u.maxAp=u.role==='scout'?18:14;u.ap=u.maxAp+(g.news==='volunteers'?1:0);}
 return g;
}

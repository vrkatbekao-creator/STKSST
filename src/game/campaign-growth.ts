import type {Campaign,CampaignUnit} from './campaign.ts';
import type {Role} from './level.ts';
import {mapFor,allCells as cells,hexDistance,connected} from './campaign-map.ts';
import type {Team} from './campaign-teams.ts';
export const helperTypes=['medic','organizer','logistic'] as const;
export type Helper=typeof helperTypes[number];
export type Career={xp:number;level:number;morale:number;health:number;xpDay:number;dailyXp:number;assistedDay:number};
export const thresholds=[0,12,30,54,84] as const;
export const helperRole:Record<Helper,Role>={medic:'heavy',organizer:'ranged',logistic:'scout'};
export const levelFor=(xp:number)=>Math.min(5,thresholds.filter(n=>xp>=n).length);
export const career=(u:CampaignUnit):Career=>({xp:0,level:1,morale:60,health:100,xpDay:0,dailyXp:0,assistedDay:0,...u.career});
export const capacity=(u:CampaignUnit)=>(u.role==='scout'?18:14)+Math.floor((career(u).level-1)/2);
export function growthSummary(u:CampaignUnit){const c=career(u),base=thresholds[c.level-1],next=thresholds[c.level]??null;return {...c,next,progress:next?Math.round((c.xp-base)/(next-base)*100):100};}
export const dailyAP=(g:Campaign,u:CampaignUnit)=>{const c=career(u);return Math.max(6,capacity(u)-Math.floor(u.fatigue/3)+(c.morale>=80?1:c.morale<=25?-2:0)+(c.health<40?-2:0))+(g.news==='volunteers'?1:0);};
export function ensureGrowth(g:Campaign){for(const u of g.units){u.career=career(u);u.maxAp=capacity(u);}}
export function grantXP(g:Campaign,u:CampaignUnit,amount:number){const c=career(u);if(c.xpDay!==g.day){c.xpDay=g.day;c.dailyXp=0;}const earned=Math.max(0,Math.min(amount,8-c.dailyXp));c.xp=Math.min(999,c.xp+earned);c.dailyXp+=earned;c.level=levelFor(c.xp);u.career=c;u.maxAp=capacity(u);return earned;}
export function exert(g:Campaign,u:CampaignUnit,action:string,ap:number){const c=career(u);const healthCost=action==='move'?Math.ceil(ap/4):action==='transport'?2:['canvass','visit','forum','culture','environment','livestream'].includes(action)?3:action==='talkComplete'?4:['skill','rally','broadcast','backstab'].includes(action)?2:0;c.health=Math.max(0,c.health-healthCost);if(['canvass','visit','forum','culture','environment','livestream'].includes(action))c.morale=Math.min(100,c.morale+2);if(action==='talkComplete'){const quality=g.talkReports?.[0]?.quality;c.morale=Math.max(0,Math.min(100,c.morale+(quality==='strong'?4:quality==='steady'?1:-2)));}u.career=c;
 const xp=action==='talkComplete'?Math.min(6,(g.talkReports?.[0]?.index??0)*2):['canvass','visit','forum','culture','environment','livestream'].includes(action)?2:['skill','rally','broadcast','backstab','assist'].includes(action)?2:0;if(xp)grantXP(g,u,xp);
}
export function recover(u:CampaignUnit){const c=career(u);c.health=Math.min(100,c.health+18);c.morale=Math.min(100,c.morale+8);u.career=c;}
export function morning(u:CampaignUnit){const c=career(u);c.health=Math.min(100,c.health+10);c.morale=Math.max(0,Math.min(100,c.morale+(c.morale<60?2:c.morale>60?-2:0)));c.dailyXp=0;u.career=c;u.maxAp=capacity(u);}
export const recruitCost=(g:Campaign,team:Team)=>({ap:3,materials:10+Math.max(0,g.units.filter(u=>u.team===team).length-3)*3});
export function recruitLocation(g:Campaign,u:CampaignUnit){const {cells:mapCells,districts}=mapFor(g);const district=mapCells.get(u.cellId)!.districtId,home=districts.find(d=>d.id===district)!;const occupied=new Set(g.units.filter(v=>v.withdrawUntil<=g.day&&v.mobilization>0&&career(v).health>0).map(v=>v.cellId));const origin=mapCells.get(home.anchor)!;
 const candidates=[origin,...origin.neighbors.map(id=>mapCells.get(id)!),...origin.neighbors.flatMap(id=>mapCells.get(id)!.neighbors.map(x=>mapCells.get(x)!))];
 return candidates.find(c=>c.districtId===district&&c.walkable!==false&&c.terrain!=='water'&&!occupied.has(c.id)&&connected(u.cellId,c.id))?.id??null;
}
export function assistError(g:Campaign,u:CampaignUnit,targetId:string){const target=g.units.find(v=>v.id===targetId&&v.team===u.team&&v.id!==u.id&&v.withdrawUntil<=g.day&&v.mobilization>0);if(!u.helper||!target||hexDistance(cells.get(u.cellId)!,cells.get(target.cellId)!)>2)return 'g_assistRange';if(career(target).assistedDay===g.day)return 'g_assisted';const c=career(target);if(u.helper==='medic'&&c.health===100&&target.fatigue===0||u.helper==='organizer'&&c.morale===100||u.helper==='logistic'&&target.ap>=dailyAP(g,target))return 'g_noNeed';return null;}
export function assist(g:Campaign,u:CampaignUnit,target:CampaignUnit){const c=career(target);if(u.helper==='medic'){c.health=Math.min(100,c.health+22);target.fatigue=Math.max(0,target.fatigue-1);}if(u.helper==='organizer')c.morale=Math.min(100,c.morale+15);target.career=c;if(u.helper==='logistic')target.ap=Math.min(dailyAP(g,target),target.ap+2);c.assistedDay=g.day;}

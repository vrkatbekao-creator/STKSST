import type {Campaign,CampaignUnit} from './campaign.ts';
import {teams,teamRecord} from './campaign-teams.ts';
import type {Team} from './campaign-teams.ts';
import {career,grantXP} from './campaign-growth.ts';
export const contactIds=['red','merchant','observer'] as const;
export type ContactId=typeof contactIds[number];
export type ContactChoice='engage'|'decline';
export type ContactResponse={choice:ContactChoice;day:number;unitId:string};
export type Contacts=Record<ContactId,Record<Team,ContactResponse|null>>;
// Fictional, faction-symmetric invitations. No real political preferences enter rules.
export const contacts={
 red:{day:6,ap:2,materials:2,health:2,morale:8,xp:2,supplies:0},
 merchant:{day:10,ap:3,materials:0,health:3,morale:0,xp:1,supplies:6},
 observer:{day:15,ap:2,materials:1,health:1,morale:5,xp:3,supplies:0},
} as const;
export const initialContacts=():Contacts=>Object.fromEntries(contactIds.map(id=>[id,teamRecord(()=>null)])) as Contacts;
export const isContact=(id:unknown):id is ContactId=>contactIds.includes(id as ContactId);
export function contactCost(id:unknown,choice:unknown){const c=isContact(id)?contacts[id]:null;return c&&choice==='engage'?{ap:c.ap,materials:c.materials}:{ap:0,materials:0};}
export function contactError(g:Campaign,team:Team,id:unknown,choice:unknown){
 if(!isContact(id)||!['engage','decline'].includes(String(choice)))return 'n_invalid';
 if(g.day<contacts[id].day)return 'n_locked';
 if(g.contacts?.[id][team])return 'n_answered';
 return null;
}
export function applyContact(g:Campaign,u:CampaignUnit,id:ContactId,choice:ContactChoice){
 const old=g.contacts??initialContacts();
 // Never mutate shared records from a previous campaign snapshot.
 g.contacts={...old,[id]:{...old[id],[u.team]:{choice,day:g.day,unitId:u.id}}};
 if(choice==='decline')return;
 const effect=contacts[id],c=career(u);c.health=Math.max(0,c.health-effect.health);c.morale=Math.min(100,c.morale+effect.morale);u.career=c;
 g.resources[u.team].materials+=effect.supplies;grantXP(g,u,effect.xp);
}
export function validContacts(value:unknown,g:Campaign){
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const state=value as Record<string,unknown>;
 if(Object.keys(state).length!==3||!contactIds.every(id=>Object.hasOwn(state,id)))return false;
 return contactIds.every(id=>{const responses=state[id] as Record<string,unknown>;
  if(!responses||typeof responses!=='object'||Array.isArray(responses)||Object.keys(responses).length!==3)return false;
  return teams.every(team=>{if(!Object.hasOwn(responses,team))return false;const r=responses[team];if(r===null)return true;
   if(!r||typeof r!=='object'||Array.isArray(r))return false;const x=r as ContactResponse;
   return Object.keys(x).length===3&&['engage','decline'].includes(x.choice)&&Number.isInteger(x.day)&&x.day>=contacts[id].day&&x.day<=g.day&&g.units.some(u=>u.id===x.unitId&&u.team===team);
  });
 });
}

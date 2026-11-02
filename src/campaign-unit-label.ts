import {roleLabel,helperLabel} from './campaign-character.ts';
import type {Campaign,CampaignUnit} from './game/campaign.ts';
export function unitLabel(g:Campaign,u:CampaignUnit,t:(key:string)=>string){
 if(u.id===`${u.team}1`)return t(`c_commander_${g.commanders[u.team]}`);
 return u.helper?`${helperLabel(u.team,u.helper,t)} #${u.id.slice(-1)}`:roleLabel(u.team,u.role,t);
}

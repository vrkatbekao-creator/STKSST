import type {Campaign,CampaignUnit} from './game/campaign.ts';
export function unitLabel(g:Campaign,u:CampaignUnit,t:(key:string)=>string){
 if(u.id===`${u.team}1`)return t(`c_commander_${g.commanders[u.team]}`);
 return u.helper?`${t(`g_helper_${u.helper}`)} #${u.id.slice(-1)}`:t(`c_role_${u.role}`);
}

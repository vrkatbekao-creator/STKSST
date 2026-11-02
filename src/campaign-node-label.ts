import {wonders} from './game/campaign-map.ts';
import type {CampaignNode} from './game/campaign-map.ts';
export function nodeLabel(n:CampaignNode,lang:'zh-TW'|'en',t:(key:string)=>string){
 const wonder=wonders.find(w=>w.id===n.wonderId);if(wonder)return wonder.name[lang];
 return n.sourcePlace&&n.name?`${t(`o_place_${n.placeType}`)} · ${n.name[lang]}`:t(`c_node_${n.kind}`);
}

import {useTranslation} from 'react-i18next';
import {useCampaign} from './game/campaign-store.ts';
import {actionCost,streetCanvassError} from './game/campaign.ts';
import {outreachQuote} from './game/campaign-outreach.ts';
import {allCells,districts} from './game/campaign-map.ts';

export function StreetOutreachPanel(){
 const {t,i18n}=useTranslation(),{game,selected,dispatch}=useCampaign();if(game.movementProfile!=='streets-v2')return null;
 const unit=game.units.find(u=>u.id===selected)!,quote=outreachQuote(game,unit.team,unit.cellId),error=streetCanvassError(game,unit),cost=actionCost(game,{type:'streetCanvass'}),ledger=game.outreach?.[unit.team],lang=i18n.language==='en'?'en':'zh-TW';
 return <section className="street-outreach card" aria-label={t('o_streetTitle')}><div><h2>{t('o_streetTitle')}</h2><p>{t('o_streetHere',{district:districts.find(d=>d.id===allCells.get(unit.cellId)!.districtId)!.name[lang]})}</p><strong>{t(`o_band_${quote.band}`)}{quote.freshDistrict?` · ${t('o_newDistrict')}`:''}</strong><p>{t('o_streetCount',{count:quote.count})}</p></div><div><button className="campaign-primary" disabled={!!error} title={error?t(error):undefined} onClick={()=>dispatch({type:'streetCanvass',unitId:unit.id})}>{t('c_action_streetCanvass')}<small>{t('c_cost',cost)}</small></button><p>{t('o_coverage',{sectors:ledger?.seenSectors.length??0,districts:ledger?.districts.length??0})}</p></div></section>;
}

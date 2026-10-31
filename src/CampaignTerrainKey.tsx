import { useTranslation } from 'react-i18next';
import { useCampaign } from './game/campaign-store.ts';
import { cellCost } from './game/campaign.ts';
import { campaignPalette } from './campaign-palette.ts';
export function TerrainKey(){const {t}=useTranslation();const {game,districtId}=useCampaign();const street=game.movementProfile==='streets-v2';return <details className="terrain-key"><summary>{t('c_terrainKey')}</summary><div>{(['urban','lane','park','slope','plaza','water'] as const).map(terrain=><span key={terrain}><i style={{background:`#${campaignPalette.terrain[terrain].toString(16).padStart(6,'0')}`}}/><strong>{t(`c_terrain_${terrain}`)}</strong><small>{street?t('c_roadCostTerrain'):terrain==='water'?t('c_waterBlocked'):t('c_terrainAP',{cost:cellCost(game,{terrain,districtId})})}</small></span>)}</div><p>{t(street?'c_roadAPHelp':'c_terrainCostHelp')}</p></details>;}

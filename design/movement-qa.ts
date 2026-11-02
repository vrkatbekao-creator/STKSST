export {};
if(location.hostname!=='127.0.0.1'||location.port!=='5191')throw Error('Movement fixtures require isolated origin 127.0.0.1:5191');
await import('../src/main.tsx');
const {useCampaign}=await import('../src/game/campaign-store.ts');
const {initialCampaign}=await import('../src/game/campaign.ts');
const {mapFor}=await import('../src/game/campaign-map.ts');
const {encodeSave,SAVE_KEY}=await import('../src/game/campaign-save.ts');
for(const weather of ['clear','rain'] as const)document.getElementById(weather)!.onclick=()=>{
 const game=initialCampaign(0,'blue','streets-v2');game.news=weather;game.surprise=null;
 const actor=game.units[0],districtId=mapFor(game).cells.get(actor.cellId)!.districtId;
 localStorage.setItem(SAVE_KEY,JSON.stringify(encodeSave({game,selected:actor.id,districtId,view:'street'})));
 useCampaign.getState().reset();useCampaign.getState().chooseSlot(1);useCampaign.getState().resume();
 document.getElementById('fixture-status')!.textContent=`${weather} · 14 AP · 市場移動 ${weather==='rain'?3:2} AP`;
};

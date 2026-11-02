export {};
if(location.hostname!=='127.0.0.1'||location.port!=='5190')throw Error('Character fixtures require isolated origin 127.0.0.1:5190');
await import('../src/main.tsx');
const {useCampaign}=await import('../src/game/campaign-store.ts');
const {initialCampaign,campaignCommand,endCampaignPhase}=await import('../src/game/campaign.ts');
const {mapFor}=await import('../src/game/campaign-map.ts');
const {encodeSave,SAVE_KEY}=await import('../src/game/campaign-save.ts');
const holder=document.getElementById('fixture-buttons')!,fixtureStatus=document.getElementById('fixture-status')!;
for(const team of ['blue','green','white'] as const){const button=document.createElement('button');button.textContent=`載入 ${team} 第 15 天驗證局`;button.style.cssText='padding:12px;margin:6px;border:2px solid #101d32';holder.append(button);button.onclick=async()=>{
 for(const b of holder.querySelectorAll('button'))b.disabled=true;fixtureStatus.textContent='正在準備驗證局…';await new Promise(r=>setTimeout(r,20));
 try{let game=initialCampaign(323,team,'streets-v2');game.resources[team].materials=500;for(const helper of ['medic','organizer','logistic','medic'] as const){const result=campaignCommand(game,{type:'recruit',unitId:`${team}1`,helper});if(result.error)throw Error(result.error);game=result.game;}
 while(game.day<15){game=endCampaignPhase(game);await new Promise(r=>setTimeout(r,0));}
 game.units.find(u=>u.id===`${team}1`)!.career!.health=70;
 const selected=`${team}1`,districtId=mapFor(game).cells.get(game.units.find(u=>u.id===selected)!.cellId)!.districtId;
 localStorage.setItem(SAVE_KEY,JSON.stringify(encodeSave({game,selected,districtId,view:'street'})));useCampaign.getState().reset();useCampaign.getState().chooseSlot(1);useCampaign.getState().resume();fixtureStatus.textContent=`${team} 第 15 天：已載入七人編制與三項中立邀請。`;
 }catch(error){fixtureStatus.textContent=`驗證局失敗：${String(error)}`;}finally{for(const b of holder.querySelectorAll('button'))b.disabled=false;}
 };}

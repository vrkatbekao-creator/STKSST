import {readFileSync,writeFileSync} from 'node:fs';
const files=['src/CampaignDialogue.tsx','src/CampaignGrowth.tsx','src/CampaignMedia.tsx','src/CampaignArt.tsx','src/HexMap.tsx','src/CampaignMaps.tsx'];
const issues=[],checked=[];
for(const path of files){const source=readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
 const buttons=[...source.matchAll(/<button\b/g)].length,custom=[...source.matchAll(/role="button"/g)].length,handlers=[...source.matchAll(/onKeyDown=\{e=>\{([\s\S]*?)\}\}/g)].map(m=>m[1]);
 for(const img of source.matchAll(/<img\b[\s\S]*?\/>/g))if(!/\balt=/.test(img[0]))issues.push({path,issue:'image missing alt'});
 if(/tabIndex=\{[1-9]\d*\}/.test(source))issues.push({path,issue:'positive tabindex'});
 if(custom&&(handlers.length<custom||handlers.some(h=>!h.includes('Enter')||!h.includes("' '"))))issues.push({path,issue:'custom buttons need Enter/Space review'});
 if(custom&&[...source.matchAll(/aria-label=/g)].length<custom)issues.push({path,issue:'custom button labels need review'});
 checked.push({path,htmlButtons:buttons,customButtons:custom,keyboardHandlers:handlers.length});
}
const luminance=hex=>{const rgb=hex.replace('#','').match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
const pairs=[['dialogue text','#f7faff','#101d32'],['dialogue choice detail','#cbd9ee','#223957'],['dialogue follow-up','#bcd0eb','#101d32'],['broadcast ticker','#101d32','#ffd34e'],['growth day note','#425d80','#ffffff'],['growth night note','#bfd1ea','#172943'],['growth stat day','#193d70','#e0eafb'],['growth stat night','#e8f1ff','#203753'],['growth level badge','#ffd34e','#101d32']].map(([label,text,background])=>{const a=luminance(text),b=luminance(background),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);return {label,text,background,ratio:Number(ratio.toFixed(2)),atLeast4_5:ratio>=4.5};});
for(const p of pairs)if(!p.atLeast4_5)issues.push({issue:'contrast pair under 4.5',...p});
const result={date:'2026-11-01',scope:'Heuristic source checks (not a JSX parser or computed accessible-name audit) and declared opaque colour pairs only. Not an end-to-end WCAG certification, real screen-reader audit, computed browser cascade audit or Firefox test.',checked,contrast:pairs,issues};writeFileSync(new URL('../artifacts/a11y-audit.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));if(issues.length)process.exitCode=1;

import type { Cell } from './game/campaign-map.ts';

// Art direction only. These palettes and street layouts never enter game rules.
export const districtScenes:Record<string,{motif:string;wall:string;roof:string;accent:string;plant:string}>={
 '6300100':{motif:'lantern',wall:'#cfa996',roof:'#a25957',accent:'#e6b96b',plant:'#729485'},
 '6300200':{motif:'tower',wall:'#8cb0c3',roof:'#4e7d95',accent:'#b7c9d9',plant:'#6b9389'},
 '6300300':{motif:'garden',wall:'#b6ac98',roof:'#867568',accent:'#c8d9a2',plant:'#7eaa89'},
 '6300400':{motif:'gallery',wall:'#c6ced9',roof:'#7e91ad',accent:'#d9a0a5',plant:'#739d95'},
 '6300500':{motif:'civic',wall:'#ccd0d2',roof:'#7f93aa',accent:'#c5bd9d',plant:'#7e9c8d'},
 '6300600':{motif:'arcade',wall:'#bd9784',roof:'#8c6359',accent:'#d3bf9e',plant:'#779c92'},
 '6300700':{motif:'temple',wall:'#c0917e',roof:'#76948b',accent:'#d7b78d',plant:'#7da48b'},
 '6300800':{motif:'tea',wall:'#b0ac90',roof:'#688b79',accent:'#c1d4a1',plant:'#8bab78'},
 '6300900':{motif:'music',wall:'#a8bbcd',roof:'#637994',accent:'#c0aecf',plant:'#719c91'},
 '6301000':{motif:'office',wall:'#93b9bf',roof:'#5f8a95',accent:'#b1cbd2',plant:'#82a487'},
 '6301100':{motif:'palace',wall:'#c5bba3',roof:'#71958a',accent:'#cbd4ac',plant:'#849e78'},
 '6301200':{motif:'spring',wall:'#c09c88',roof:'#6b8b82',accent:'#b8d4cc',plant:'#84a994'},
};
export function streetVariant(c:Pick<Cell,'q'|'r'>){return Math.abs(Math.imul(c.q,73856093)^Math.imul(c.r,19349663))%3;}

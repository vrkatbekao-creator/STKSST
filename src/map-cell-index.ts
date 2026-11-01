import type {Cell} from './game/campaign-map.ts';
import type {MapBounds} from './road-map.ts';
const cache=new WeakMap<Cell[],Map<string,number[]>>();
/** Stable source order, using a kilometre grid to avoid scanning all 41k cells on every pan. */
export function cellsInBounds(cells:Cell[],bounds:MapBounds,padding=220){
 let grid=cache.get(cells);if(!grid){grid=new Map();cells.forEach((c,i)=>{const key=`${Math.floor(c.x/1000)},${Math.floor(c.y/1000)}`;const items=grid!.get(key);if(items)items.push(i);else grid!.set(key,[i]);});cache.set(cells,grid);}
 const left=bounds.x-padding,right=bounds.x+bounds.width+padding,top=bounds.y-padding,bottom=bounds.y+bounds.height+padding,indices:number[]=[];
 for(let x=Math.floor(left/1000);x<=Math.floor(right/1000);x++)for(let y=Math.floor(top/1000);y<=Math.floor(bottom/1000);y++)for(const i of grid.get(`${x},${y}`)??[])if(cells[i].x>left&&cells[i].x<right&&cells[i].y>top&&cells[i].y<bottom)indices.push(i);
 return indices.sort((a,b)=>a-b).map(i=>cells[i]);
}

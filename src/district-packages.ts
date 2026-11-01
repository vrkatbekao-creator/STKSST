import {manifest,readJsonPackage,packageCache} from './map-packages.ts';
import {validRoadData} from './road-map.ts';
import type {RoadData} from './road-map.ts';
import {decodeBuildings} from './building-map.ts';
import type {BuildingData} from './building-map.ts';
export const roadPackages=packageCache<RoadData>(3,async id=>{const entry=manifest.districts.find(d=>d.id===id);if(!entry)throw Error('district');const data=await readJsonPackage(entry.roads);if(!validRoadData(data))throw Error('roads');return data;});
export const buildingPackages=packageCache<BuildingData>(3,async id=>{const entry=manifest.districts.find(d=>d.id===id);if(!entry)throw Error('district');return decodeBuildings(await readJsonPackage(entry.buildings));});
/** District-border features occur in multiple files. Preserve source objects and deduplicate IDs. */
function mergeIndexed<T extends {id:string}>(chunks:{items:T[];index:Record<string,number[]>}[]){
 const items:T[]=[],byId=new Map<string,number>(),index:Record<string,number[]>={};
 for(const chunk of chunks){const mapped=chunk.items.map(item=>{let id=byId.get(item.id);if(id===undefined){id=items.length;items.push(item);byId.set(item.id,id);}return id;});for(const [key,ids] of Object.entries(chunk.index)){const target=new Set(index[key]);for(const id of ids)target.add(mapped[id]);index[key]=[...target];}}
 return {items,index};
}
export function mergeRoads(chunks:RoadData[]):RoadData{const first=chunks[0];if(!first)throw Error('roads');const {items,index}=mergeIndexed(chunks.map(c=>({items:c.roads,index:c.cellIndex})));return {...first,roads:items,cellIndex:index};}
export function mergeBuildings(chunks:BuildingData[]):BuildingData{const first=chunks[0];if(!first)throw Error('buildings');const {items,index}=mergeIndexed(chunks.map(c=>({items:c.buildings,index:c.index})));return {...first,buildings:items,index};}

import {useEffect,useState} from 'react';
import {viewDistricts} from './map-packages.ts';
import {roadPackages,buildingPackages,mergeRoads,mergeBuildings} from './district-packages.ts';
import type {RoadData,MapBounds} from './road-map.ts';
import type {BuildingData} from './building-map.ts';
function usePackages<T>(key:string,load:(ids:string[])=>Promise<T>){
 const [state,setState]=useState<{key:string;data:T|null;error:boolean}>({key:'',data:null,error:false}),[attempt,retry]=useState(0);
 useEffect(()=>{let alive=true;setState({key,data:null,error:false});load(key.split(',')).then(data=>{if(alive)setState({key,data,error:false});}).catch(()=>{if(alive)setState({key,data:null,error:true});});return()=>{alive=false;};},[key,load,attempt]);
 return {data:state.key===key?state.data:null,error:state.key===key&&state.error,retry:()=>retry(n=>n+1)};
}
const roads=(ids:string[])=>Promise.all(ids.map(id=>roadPackages.get(id))).then(mergeRoads);
const buildings=(ids:string[])=>Promise.all(ids.map(id=>buildingPackages.get(id))).then(mergeBuildings);
export function useDistrictLayers(districtId:string,bounds:MapBounds){const key=viewDistricts(districtId,bounds).join(',');return {roads:usePackages<RoadData>(key,roads),buildings:usePackages<BuildingData>(key,buildings)};}

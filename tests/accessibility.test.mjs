import test from 'node:test';import assert from 'node:assert/strict';
import {parseAccessibility,setAccessibility,accessibilitySnapshot,subscribeAccessibility,accessibilityKey} from '../src/accessibility-preferences.ts';
import {missingFeatures} from '../src/browser-capabilities.ts';
test('malformed accessibility preferences cannot enable options or modify campaign values',()=>{
 for(const raw of [null,42,'true',[],{contrast:'true',largeText:1,vectorMap:{},reduceMotion:null,ap:100}])assert.deepEqual(parseAccessibility(raw),{contrast:false,largeText:false,vectorMap:false,reduceMotion:false});assert.deepEqual(parseAccessibility({contrast:true,largeText:true,vectorMap:true,reduceMotion:true,ap:100}),{contrast:true,largeText:true,vectorMap:true,reduceMotion:true});
});
test('accessibility preferences keep working and notify subscribers when storage is unavailable',()=>{
 const old=Object.getOwnPropertyDescriptor(globalThis,'localStorage');Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw Error('blocked');}});let count=0;const unsubscribe=subscribeAccessibility(()=>count++);try{setAccessibility({vectorMap:true});assert.equal(accessibilitySnapshot().vectorMap,true);setAccessibility({contrast:true});assert.equal(accessibilitySnapshot().vectorMap,true);assert.equal(count,2);unsubscribe();setAccessibility({contrast:false});assert.equal(count,2);}finally{unsubscribe();setAccessibility({vectorMap:false,largeText:false,reduceMotion:false,contrast:false});if(old)Object.defineProperty(globalThis,'localStorage',old);else delete globalThis.localStorage;}
});
test('required feature gates identify unsupported runtimes; optional graphics and audio do not block play',()=>{
 const all={fetch:true,gzip:true,integrity:true,dialog:true,resize:true};assert.deepEqual(missingFeatures(all),[]);for(const key of Object.keys(all))assert.deepEqual(missingFeatures({...all,[key]:false}),[key]);assert.deepEqual(missingFeatures({...all,webgl:false,audio:false}),[]);
});
test('changing display preferences never rewrites or deletes the campaign save',()=>{
 const old=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),saved='{"fixture":"unchanged campaign bytes"}',data=new Map([['capital-tactics-campaign-save',saved]]),writes=[];
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>data.get(key)??null,setItem:(key,value)=>{writes.push(key);data.set(key,value);}}});
 try{setAccessibility({contrast:true,largeText:true,vectorMap:true,reduceMotion:true});assert.equal(data.get('capital-tactics-campaign-save'),saved);assert.deepEqual(writes,[accessibilityKey]);assert.deepEqual(JSON.parse(data.get(accessibilityKey)),{contrast:true,largeText:true,vectorMap:true,reduceMotion:true});}finally{setAccessibility({contrast:false,largeText:false,vectorMap:false,reduceMotion:false});if(old)Object.defineProperty(globalThis,'localStorage',old);else delete globalThis.localStorage;}
});

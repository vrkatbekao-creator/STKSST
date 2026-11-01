export type AccessibilityPreferences={contrast:boolean;largeText:boolean;vectorMap:boolean;reduceMotion:boolean};
export const accessibilityKey='capital-accessibility-v1';
export function parseAccessibility(raw:unknown):AccessibilityPreferences{const value=raw&&typeof raw==='object'?raw as Record<string,unknown>:{};return {contrast:value.contrast===true,largeText:value.largeText===true,vectorMap:value.vectorMap===true,reduceMotion:value.reduceMotion===true};}
let snapshot:AccessibilityPreferences|undefined;const listeners=new Set<()=>void>();
export function accessibilitySnapshot(){if(!snapshot){try{snapshot=parseAccessibility(JSON.parse(localStorage.getItem(accessibilityKey)||'null'));}catch{snapshot=parseAccessibility(null);}}return snapshot;}
export function subscribeAccessibility(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener);};}
export function setAccessibility(patch:Partial<AccessibilityPreferences>){snapshot=parseAccessibility({...accessibilitySnapshot(),...patch});try{localStorage.setItem(accessibilityKey,JSON.stringify(snapshot));}catch{/* Preferences still work for this session. */}for(const listener of listeners)listener();}

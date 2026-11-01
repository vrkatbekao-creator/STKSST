import {useEffect,useState} from 'react';
import type {ComponentType} from 'react';
import {useTranslation} from 'react-i18next';
import {loadStreetRuntime} from './game/street-runtime.ts';
import './map-boot.css';
export default function MapBoot(){
 const {t,i18n}=useTranslation();const [App,setApp]=useState<ComponentType|null>(null),[error,setError]=useState(false),[attempt,retry]=useState(0);
 useEffect(()=>{let alive=true;loadStreetRuntime().then(()=>import('./App.tsx')).then(module=>{if(alive)setApp(()=>module.default);}).catch(()=>{if(alive)setError(true);});return()=>{alive=false;};},[attempt]);
 if(App)return <App/>;
 return <main className="map-boot"><div><span className="campaign-kicker">{t('edition')}</span><h1>{t('title')}</h1><p role="status" aria-live="polite">{t(error?'p_bootFailed':'p_bootLoading')}</p>{error&&<button onClick={()=>{setError(false);retry(n=>n+1);}}>{t('p_retry')}</button>}<button onClick={()=>void i18n.changeLanguage(i18n.language==='en'?'zh-TW':'en')}>{i18n.language==='en'?'繁體中文':'English'}</button></div></main>;
}

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zh from './locales/zh-TW.json';
import en from './locales/en.json';
export function detectLanguage() {try {const saved=localStorage.getItem('capital-language');if(saved==='en'||saved==='zh-TW')return saved;}catch{/* Storage is optional. */}return navigator.language.toLowerCase().startsWith('en')?'en':'zh-TW';}
void i18n.use(initReactI18next).init({resources:{'zh-TW':{translation:zh},en:{translation:en}},lng:detectLanguage(),fallbackLng:'zh-TW',interpolation:{escapeValue:false},saveMissing:import.meta.env.DEV,missingKeyHandler:(_lng,_ns,key)=>{if(import.meta.env.DEV)console.warn('Missing translation:',key);}});
i18n.on('languageChanged',lng=>{try{localStorage.setItem('capital-language',lng);}catch{/* Continue without persistence. */}document.documentElement.lang=lng==='en'?'en':'zh-Hant';document.title=i18n.t('title');});
document.documentElement.lang=i18n.language==='en'?'en':'zh-Hant'; document.title=i18n.t('title');
export default i18n;

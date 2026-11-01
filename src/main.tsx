import { createRoot } from 'react-dom/client';
import './i18n.ts';
import MapBoot from './MapBoot.tsx';
import './style.css';
createRoot(document.getElementById('root')!).render(<MapBoot/>);

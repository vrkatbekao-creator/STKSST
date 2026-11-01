import {useSyncExternalStore} from 'react';
import {accessibilitySnapshot,subscribeAccessibility} from './accessibility-preferences.ts';
export function useAccessibility(){return useSyncExternalStore(subscribeAccessibility,accessibilitySnapshot,accessibilitySnapshot);}

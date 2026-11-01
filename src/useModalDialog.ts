import {useEffect} from 'react';import type {RefObject} from 'react';
/** Native modal trap/Escape semantics, explicit initial and return focus. */
export function useModalDialog(ref:RefObject<HTMLDialogElement|null>,open=true){
 useEffect(()=>{if(!open)return;const dialog=ref.current;if(!dialog)return;const previous=document.activeElement;dialog.showModal();dialog.querySelector<HTMLElement>('[data-dialog-title]')?.focus();return()=>{if(dialog.open)dialog.close();if(previous instanceof HTMLElement&&previous.isConnected)previous.focus();else document.getElementById('campaign-main')?.focus();};},[ref,open]);
}

import type {AppState} from '../domain/models';
const KEY='nexo.pedidos.v1';
export function loadState():AppState|null{const raw=localStorage.getItem(KEY);if(!raw)return null;const data=JSON.parse(raw) as AppState;if(data.version!==1||!Array.isArray(data.cases)||!Number.isInteger(data.revision))throw new Error('Datos locales incompatibles. Conservamos el contenido sin sobrescribirlo.');return data;}
export function saveState(next:AppState,expectedRevision:number){const old=loadState();if(old&&old.revision!==expectedRevision)throw new Error('El caso cambió en otra pestaña. Recargá la página antes de continuar.');localStorage.setItem(KEY,JSON.stringify(next));}
export function exportState(state:AppState){const b=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const url=URL.createObjectURL(b);const a=document.createElement('a');a.href=url;a.download='nexo-casos-auditoria.json';a.click();URL.revokeObjectURL(url);}

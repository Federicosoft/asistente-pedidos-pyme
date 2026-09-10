import * as XLSX from 'xlsx';
import {catalog} from '../../data/catalog';
import type {SystemsData,Price,Stock} from '../domain/models';
type Row=Record<string,unknown>;
function rows(buffer:ArrayBuffer){const w=XLSX.read(buffer,{type:'array',cellDates:true});return XLSX.utils.sheet_to_json<Row>(w.Sheets[w.SheetNames[0]],{defval:null});}
function date(value:unknown){if(value instanceof Date)return value.toISOString().slice(0,10);if(typeof value==='number'){const d=XLSX.SSF.parse_date_code(value);return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;}return String(value||'').slice(0,10);}
function number(value:unknown,label:string){if(value===null||value===''||!Number.isFinite(Number(value)))throw new Error(`Excel inválido: ${label}.`);return Number(value);}
export function parseSystems(stockBuffer:ArrayBuffer,priceBuffer:ArrayBuffer):SystemsData{
 const stock:Stock[]=rows(stockBuffer).map(r=>({sku:String(r.SKU||''),available:number(r['Stock disponible'],'stock disponible'),reserved:number(r['Stock reservado'],'stock reservado'),usable:number(r['Stock utilizable'],'stock utilizable'),updatedAt:date(r['Fecha actualización'])}));
 const prices:Price[]=rows(priceBuffer).map(r=>({sku:String(r.SKU||''),amount:r.Precio===null||r.Precio===''?null:number(r.Precio,'precio'),currency:String(r.Moneda||''),includesVat:r['IVA incluido']===true||r['IVA incluido']==='Sí',from:date(r['Fecha desde']),until:date(r['Fecha hasta']),list:String(r.Lista||'')}));
 for(const s of stock)if(!s.sku||s.available<0||s.reserved<0||s.usable!==s.available-s.reserved||s.usable<0)throw new Error(`Stock inconsistente: ${s.sku}.`);
 for(const p of prices)if(!p.sku||p.currency!=='ARS'||p.list!=='Lista General'||(p.amount!==null&&p.amount<=0)||!p.from||!p.until)throw new Error(`Precio inconsistente: ${p.sku}.`);
 if(new Set(stock.map(s=>s.sku)).size!==stock.length||new Set(prices.map(s=>s.sku)).size!==prices.length)throw new Error('Excel con SKU duplicado.');
 for(const p of catalog)if(!stock.some(s=>s.sku===p.sku))throw new Error(`No se encontró stock para ${p.sku}.`);
 return {products:catalog,stock,prices,loadedAt:new Date().toISOString()};
}
export async function loadSystems():Promise<SystemsData>{
 const buffers=await Promise.all(['/data/stock_productos.xlsx','/data/precios_productos.xlsx'].map(async url=>{const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(`No se pudo leer ${url}.`);return r.arrayBuffer();}));
 return parseSystems(buffers[0],buffers[1]);
}

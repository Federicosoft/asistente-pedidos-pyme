import type {CommercialCase,Quotation,Stock,Price,SystemsData} from '../domain/models';
import {dateKey,round,uid} from '../domain/common';
export function getStock(sku:string,data:SystemsData):Stock|undefined{return data.stock.find(s=>s.sku===sku);}
export function getPrice(sku:string,data:SystemsData):Price|undefined{return data.prices.find(s=>s.sku===sku);}
export function isCurrentPrice(price:Price|undefined,at:string){const d=dateKey(at);return !!price&&price.amount!==null&&price.amount>0&&price.currency==='ARS'&&price.from<=d&&price.until>=d;}
export function calculateQuotation(c:CommercialCase,at:string):Quotation{
 if(!c.validation.canQuote||c.checkedRevision!==c.revision)throw new Error('Validar y consultar precio y stock antes de cotizar.');
 const items=c.orderItems.filter(i=>isCurrentPrice(i.price,at)&&i.stock).map(i=>{
  const p=i.price!;const quantity=Number(i.quantity);const gross=round(p.amount!*quantity);const net=p.includesVat?round(gross/1.21):gross;const vat=p.includesVat?round(gross-net):round(net*.21);
  return {itemId:i.id,sku:i.sku,name:i.productName,quantity,available:i.stock!.usable,missing:Math.max(0,quantity-i.stock!.usable),theoretical:Math.max(0,i.stock!.usable-quantity),unitPrice:p.amount!,includesVat:p.includesVat,net,vat,total:round(net+vat),until:p.until};
 });
 if(!items.length)throw new Error('Todos los productos están pendientes de precio. Solicitar remediación antes de cotizar.');
 const excluded=c.orderItems.filter(i=>!items.some(q=>q.itemId===i.id)).map(i=>i.sku);
 return {id:uid(),createdAt:at,revision:c.revision,items,excluded,partial:excluded.length>0,subtotal:round(items.reduce((s,i)=>s+i.net,0)),vat:round(items.reduce((s,i)=>s+i.vat,0)),total:round(items.reduce((s,i)=>s+i.total,0))};
}

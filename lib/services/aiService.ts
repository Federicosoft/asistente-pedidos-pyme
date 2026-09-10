import type {CommercialCase,OrderItem,Product} from '../domain/models';
import {normalize,uid} from '../domain/common';
export function findProduct(description:string,products:Product[]){
 const n=normalize(description); const exact=products.filter(p=>[p.sku,p.name,...p.aliases].some(a=>normalize(a)===n));
 if(exact.length) return exact;
 return products.filter(p=>normalize(p.name).includes(n)||normalize(p.category)===n);
}
function quantityBefore(text:string):string{
 const q=text.match(/(?:^|\s)(-?\d+(?:[.,]\d+)?|cero|menos\s+\d+|muchas|varias|[xX]{2,})(?:\s+(?:unidades|unidad|u\.?|de|unos|unas|rodamientos?|motores?|electricos?|correas?|industriales?|bombas?|valvulas?|sensores?|herramientas?|modelo|rigidos?|trifasicos?))*\s*$/i);
 if(!q)return ''; if(q[1]==='cero')return '0';return q[1].replace(/^menos\s+/,'-').replace(',','.');
}
export function extractProducts(message:string,products:Product[],source:string):OrderItem[]{
 const n=normalize(message); const hits:{start:number;end:number;product?:Product;original:string}[]=[];
 for(const p of products){
  const aliases=[p.sku,...p.aliases,p.name].sort((a,b)=>b.length-a.length);
  for(const alias of aliases){let pos=n.indexOf(normalize(alias));while(pos!==-1){const boundary=!/[a-z0-9-]/.test(n[pos-1]||'')&&!/[a-z0-9-]/.test(n[pos+alias.length]||'');if(boundary&&!hits.some(h=>pos<h.end && pos+alias.length>h.start)){hits.push({start:pos,end:pos+alias.length,product:p,original:message.slice(pos,pos+alias.length)});}pos=n.indexOf(normalize(alias),pos+alias.length);}}
 }
 for(const match of n.matchAll(/\b[a-z]{2,5}-\d{2,5}\b/g)){if(!hits.some(h=>match.index>=h.start&&match.index<h.end))hits.push({start:match.index,end:match.index+match[0].length,original:match[0].toUpperCase()});}
 // Keep unspecified product families as independent unresolved lines.
 for(const m of n.matchAll(/\b(rodamientos?|motores?|correas?|bombas?|valvulas?|sensores?|herramientas?)\b/g)){
  if(hits.some(h=>h.start<=m.index+65&&h.end>=m.index && !/[,.\n]|\sy\s/.test(n.slice(m.index,h.start))))continue;
  if(hits.some(h=>m.index>=h.start&&m.index<h.end))continue;
  hits.push({start:m.index,end:m.index+m[0].length,original:message.slice(m.index,m.index+m[0].length)});
 }
 hits.sort((a,b)=>a.start-b.start);
 return hits.map((hit,i)=>{
  const before=n.slice(i?hits[i-1].end:0,hit.start).split(/[,;\n]|\by\b/).pop()||'';
  let quantity=quantityBefore(before);
  if(!quantity){const after=n.slice(hit.end,i+1<hits.length?hits[i+1].start:n.length);const q=after.match(/^\s*[:=]\s*(-?\d+(?:[.,]\d+)?)/);if(q)quantity=q[1].replace(',','.');}
  const candidates=hit.product?[]:products.filter(p=>normalize(p.name).includes(normalize(hit.original).replace(/s$/,''))).map(p=>p.sku);
  return {id:uid(),original:hit.original,sku:hit.product?.sku||(/^[A-Z]{2,5}-\d+$/.test(hit.original)?hit.original:''),productName:hit.product?.name||'',quantity,source,candidates,validations:[]};
 });
}
export function extractRequestData(message:string){
 const fields:Partial<Pick<CommercialCase,'customer'|'company'|'email'|'phone'|'requiredDate'|'deliveryLocation'|'currency'|'observations'>>={};
 const email=message.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);if(email)fields.email=email[0];
 const phone=message.match(/(?:\+?54\s*)?(?:11|15|221|351)\s?[-\d\s]{6,13}\d/);if(phone)fields.phone=phone[0].trim();
 const person=message.match(/(?:soy|mi nombre es|cliente:)\s+([A-ZÁÉÍÓÚÑ][\p{L}]+(?:\s+[A-ZÁÉÍÓÚÑ][\p{L}]+)?)/u);if(person)fields.customer=person[1];
 const company=message.match(/(?:empresa:|somos|de la empresa|de)\s+((?:Metalúrgica|Industrias|Talleres|Servicios|Mecánica|Plásticos|Fábrica)\s+[\p{L}]+(?:\s+[A-ZÁÉÍÓÚÑ][\p{L}]+)?)/u);if(company)fields.company=company[1];
 const date=message.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);if(date)fields.requiredDate=`${date[3]}-${date[2].padStart(2,'0')}-${date[1].padStart(2,'0')}`;
 const location=message.match(/(?:entregar en|enviar a|entrega en|destino:|domicilio:)\s*([^.;\n]+)/i);if(location)fields.deliveryLocation=location[1].trim();
 if(/\bARS\b|pesos argentinos/i.test(message))fields.currency='ARS';
 if(/\bUSD\b|d[oó]lares/i.test(message))fields.currency='USD';
 if(/semana que viene|pr[oó]xima semana|ma[ñn]ana|unos\s+\d+/i.test(message))fields.observations='Plazo o cantidad aproximada: confirmar con el cliente.';
 return fields;
}
export function processCustomerMessage(context:CommercialCase,message:string,products:Product[],source:string){
 const fields=extractRequestData(message); const incoming=extractProducts(message,products,source); const items=structuredClone(context.orderItems);const ambiguities:string[]=[];
 for(const next of incoming){
  const existing=items.filter(x=>next.sku&&x.sku===next.sku);
  if(existing.length===1){if(next.quantity!==''){existing[0].quantity=next.quantity;existing[0].source=source;}}
  else if(existing.length>1)ambiguities.push(`Hay líneas duplicadas de ${next.sku}. Confirmar a cuál corresponde la nueva información.`);
  else items.push(next);
 }
 if(!incoming.length){
  const q=normalize(message).match(/(?:necesitamos|son|cantidad:?|quiero|pedimos)?\s*(-?\d+(?:[.,]\d+)?)\s*(?:unidades|unidad|u)?[.!]?$/);
  if(q&&!fields.phone&&!fields.requiredDate){const missing=items.filter(x=>x.quantity==='');if(missing.length===1){missing[0].quantity=q[1].replace(',','.');missing[0].source=source;}else ambiguities.push(`No se puede determinar a qué producto corresponde la cantidad ${q[1]}.`);}
  else if(!Object.keys(fields).length)ambiguities.push('Nueva información no interpretada: revisar el mensaje y completar los datos manualmente.');
 }
 return {fields,items,ambiguities};
}
export interface AIService { extractRequestData:typeof extractRequestData; extractProducts:typeof extractProducts; processCustomerMessage:typeof processCustomerMessage }
export const aiService:AIService={extractRequestData,extractProducts,processCustomerMessage};

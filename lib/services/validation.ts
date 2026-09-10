import type {CommercialCase,OrderItem,Product,ValidationIssue,ValidationResult} from '../domain/models';
import {dateKey} from '../domain/common';
export function validContact(c:CommercialCase){return c.replyChannel==='EMAIL'?/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email):/^\+?[\d\s()-]+$/.test(c.phone)&&c.phone.replace(/\D/g,'').length>=8;}
export function validateOrderItem(item:OrderItem,products:Product[]):ValidationIssue[]{
 const issues:ValidationIssue[]=[];const add=(code:string,message:string,level:ValidationIssue['level']='error',blocking=true)=>issues.push({code,message,level,blocking,itemId:item.id});
 if(item.candidates.length>1&&!item.sku)add('AMBIGUOUS_PRODUCT',`Producto ambiguo: ${item.original}. Elegir un SKU.`, 'confirm');
 else if(!item.sku)add('MISSING_PRODUCT',`Producto sin identificar: ${item.original||'línea vacía'}.`,'missing');
 else if(!products.some(p=>p.sku===item.sku))add('UNKNOWN_SKU',`SKU inexistente: ${item.sku}.`);
 if(item.quantity==='')add('MISSING_QUANTITY',`Falta cantidad de ${item.sku||item.original}.`,'missing');
 else if(!Number.isFinite(Number(item.quantity)))add('NAN_QUANTITY',`Cantidad no numérica: ${item.sku||item.original}.`);
 else if(Number(item.quantity)<=0)add('INVALID_QUANTITY',`La cantidad de ${item.sku||item.original} debe ser mayor que cero.`);
 else if(!Number.isInteger(Number(item.quantity)))add('FRACTIONAL_QUANTITY',`Confirmar unidades enteras para ${item.sku||item.original}.`,'confirm');
 if(item.priceStatus==='PENDIENTE DE PRECIO')add('PENDING_PRICE',`${item.sku}: Pendiente de precio. Solicitar remediación.`,'warning',false);
 if(item.stockStatus==='SIN STOCK')add('ZERO_STOCK',`${item.sku}: sin stock. No prometer entrega.`,'warning',false);
 if(item.stockStatus==='STOCK PARCIAL')add('PARTIAL_STOCK',`${item.sku}: stock parcial. Solo entregar lo disponible.`,'warning',false);
 return issues;
}
export function validateRequest(c:CommercialCase,products:Product[]):ValidationResult{
 const issues:ValidationIssue[]=[];const add=(code:string,message:string,level:ValidationIssue['level'],blocking=false)=>issues.push({code,message,level,blocking});
 if(!c.customer.trim())add('MISSING_CUSTOMER','Cliente faltante.','warning',!c.company.trim());
 if(!c.company.trim())add('MISSING_COMPANY','Empresa faltante.','warning',!c.customer.trim());
 if(!validContact(c))add('INVALID_REPLY_CHANNEL',c.replyChannel==='EMAIL'?'Falta un email válido para responder.':'Falta un teléfono válido para responder por WhatsApp.','missing',true);
 if(!c.orderItems.length)add('NO_PRODUCTS','Falta al menos un producto.','missing',true);
 const seen=new Set<string>();
 for(const item of c.orderItems){issues.push(...validateOrderItem(item,products));if(item.sku&&seen.has(item.sku))add('DUPLICATE_PRODUCT',`Producto duplicado: ${item.sku}. Corregir o consolidar las líneas.`,'confirm',true);seen.add(item.sku);}
 if(!c.requiredDate)add('MISSING_DATE','Fecha requerida faltante.','warning');
 else if(!/^\d{4}-\d{2}-\d{2}$/.test(c.requiredDate)||Number.isNaN(Date.parse(c.requiredDate))||new Date(c.requiredDate).toISOString().slice(0,10)!==c.requiredDate)add('INVALID_DATE','Fecha requerida inválida.','error',true);
 else if(c.requiredDate<dateKey(c.createdAt))add('PAST_DATE','Fecha requerida anterior a la solicitud. Confirmar una nueva fecha.','confirm',true);
 if(!c.deliveryLocation)add('MISSING_LOCATION','Lugar de entrega faltante.','warning');
 if(!c.email)add('MISSING_EMAIL','Email de contacto no informado.','warning');
 if(!c.phone)add('MISSING_PHONE','Teléfono de contacto no informado.','warning');
 if(c.currency!=='ARS')add('CURRENCY','Solo existe Lista General en ARS. Confirmar moneda.','confirm',true);
 if(c.orderItems.filter(i=>!i.quantity).length>1)add('INDIVIDUAL_QUANTITIES','Faltan cantidades individuales para varios productos.','missing',true);
 c.ambiguities.forEach(message=>add('AMBIGUOUS_REPLY',message,'confirm',true));
 const required=[!!(c.customer.trim()||c.company.trim()),validContact(c),c.orderItems.length>0,...c.orderItems.flatMap(i=>[products.some(p=>p.sku===i.sku),Number(i.quantity)>0&&Number.isInteger(Number(i.quantity))]),!!c.requiredDate,!!c.deliveryLocation,!!c.email,!!c.phone];
 return {issues,canQuote:!issues.some(i=>i.blocking),completeness:Math.round(required.filter(Boolean).length/required.length*100)};
}

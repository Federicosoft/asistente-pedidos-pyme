import type {CommercialCase,CaseStatus,AuditEvent,SystemsData,Channel,OrderItem} from '../domain/models';
import {uid,now} from '../domain/common';
import {aiService} from './aiService';
import {validateRequest,validateOrderItem,validContact} from './validation';
import {getPrice,getStock,isCurrentPrice,calculateQuotation} from './quotationService';
import {activeResponse,buildMissingInformationResponse,buildQuotationResponse} from './responseService';
export function registerAuditEvent(c:CommercialCase,type:string,operatorId:string,detail:string,data?:unknown,at=now()){const e:AuditEvent={id:uid(),timestamp:at,operatorId,type,detail,data:structuredClone(data??null)};c.auditEvents.push(e);c.updatedAt=at;}
function status(c:CommercialCase,next:CaseStatus,op:string,at:string){if(c.status!==next){const prev=c.status;c.status=next;registerAuditEvent(c,'CASE_STATUS_CHANGED',op,`${prev} → ${next}`,{from:prev,to:next},at);}}
function editable(c:CommercialCase){if(c.status==='CERRADO')throw new Error('El caso está cerrado. Su historial es de solo lectura.');}
function invalidate(c:CommercialCase){c.revision++;c.quotation=undefined;c.checkedRevision=undefined;c.checkedAt=undefined;c.activeResponseId=undefined;for(const i of c.orderItems){i.stock=undefined;i.price=undefined;i.stockStatus=undefined;i.priceStatus=undefined;}}
function revalidate(c:CommercialCase,data:SystemsData,op:string,at:string){c.orderItems.forEach(i=>i.validations=validateOrderItem(i,data.products));c.validation=validateRequest(c,data.products);registerAuditEvent(c,'CASE_REVALIDATED',op,'Información consolidada revalidada',c.validation,at);if(!c.validation.canQuote)registerAuditEvent(c,'MISSING_INFORMATION_DETECTED',op,'Se detectó información faltante o a confirmar',c.validation.issues.filter(i=>i.blocking),at);status(c,c.validation.canQuote?'LISTO PARA COTIZAR':'FALTA INFORMACIÓN',op,at);}
export function createCase(input:{id:string;channel:Channel;content:string;subject?:string;customer?:string;company?:string;email?:string;phone?:string;requiredDate?:string;deliveryLocation?:string;scenario?:string},data:SystemsData,op:string,at=now()):CommercialCase{
 const msgId=uid();const detected=aiService.extractRequestData(input.content);
 const c:CommercialCase={id:input.id,createdAt:at,updatedAt:at,initialChannel:input.channel,replyChannel:input.channel==='EMAIL'?'EMAIL':'WHATSAPP',customer:input.customer||'',company:input.company||'',email:input.email||'',phone:input.phone||'',requiredDate:input.requiredDate||'',deliveryLocation:input.deliveryLocation||'',currency:'ARS',observations:'',...detected,status:'NUEVO',assignedOperator:op,orderItems:[],conversation:[{id:msgId,caseId:input.id,direction:'INBOUND',channel:input.channel,timestamp:at,content:input.content,subject:input.subject,operatorId:op,messageType:'INITIAL_REQUEST'}],validation:{issues:[],canQuote:false,completeness:0},quotationHistory:[],responses:[],auditEvents:[],revision:0,ambiguities:[],sources:{},remediations:[],scenario:input.scenario||'Nueva consulta'};
 registerAuditEvent(c,'REQUEST_RECEIVED',op,`Solicitud recibida por ${input.channel}`,input,at);status(c,'EN ANÁLISIS',op,at);
 c.orderItems=aiService.extractProducts(input.content,data.products,msgId);Object.keys(detected).forEach(k=>c.sources[k]=msgId);
 registerAuditEvent(c,'DATA_EXTRACTED',op,'Productos y datos extraídos mediante simulación', {fields:detected,items:c.orderItems},at);revalidate(c,data,op,at);return c;
}
export function openCase(original:CommercialCase,op:string,at=now()){const c=structuredClone(original);registerAuditEvent(c,'REQUEST_OPENED',op,'Solicitud abierta',undefined,at);return c;}
export function updateCase(original:CommercialCase,fields:Partial<Pick<CommercialCase,'customer'|'company'|'email'|'phone'|'requiredDate'|'deliveryLocation'|'currency'|'observations'|'replyChannel'|'assignedOperator'>>,items:OrderItem[],resolveAmbiguity:boolean,data:SystemsData,op:string,at=now()){
 const c=structuredClone(original);editable(c);const before={fields:Object.fromEntries(Object.keys(fields).map(k=>[k,c[k as keyof CommercialCase]])),items:c.orderItems};
 Object.assign(c,fields);c.orderItems=structuredClone(items).map(i=>({...i,productName:data.products.find(p=>p.sku===i.sku)?.name||'',candidates:i.sku?[]:i.candidates}));
 if(resolveAmbiguity)c.ambiguities=[];invalidate(c);registerAuditEvent(c,'DATA_MODIFIED',op,'Datos corregidos manualmente',{before,after:{fields,items:c.orderItems},ambiguityResolved:resolveAmbiguity},at);
 for(const k of Object.keys(fields))c.sources[k]=`Operador ${op} · ${at}`;c.orderItems.forEach(i=>{const prior=original.orderItems.find(p=>p.id===i.id);if(!prior||prior.sku!==i.sku||prior.quantity!==i.quantity)i.source=`Operador ${op} · ${at}`;});revalidate(c,data,op,at);return c;
}
export function addCustomerMessage(original:CommercialCase,content:string,channel:Channel,timestamp:string,data:SystemsData,op:string,at=now()){
 const c=structuredClone(original);editable(c);if(!content.trim())throw new Error('Ingresá un mensaje.');
 const last=c.conversation.at(-1)!;if(!Number.isFinite(Date.parse(timestamp))||Date.parse(timestamp)<Date.parse(last.timestamp)||Date.parse(timestamp)>Date.parse(at)+60000)throw new Error('La fecha debe ser posterior al último mensaje y no futura.');
 const id=uid();c.conversation.push({id,caseId:c.id,direction:'INBOUND',channel,timestamp,content,operatorId:op,messageType:'CUSTOMER_REPLY'});registerAuditEvent(c,'CUSTOMER_MESSAGE_RECEIVED',op,'Nueva respuesta del cliente recibida',{id,content,channel,timestamp},at);
 const result=aiService.processCustomerMessage(c,content,data.products,id);invalidate(c);Object.assign(c,result.fields);c.orderItems=result.items; // clear snapshots on incoming items as well
 for(const i of c.orderItems){i.price=undefined;i.stock=undefined;i.priceStatus=undefined;i.stockStatus=undefined;}
 c.ambiguities=[...c.ambiguities,...result.ambiguities];Object.keys(result.fields).forEach(k=>c.sources[k]=id);
 registerAuditEvent(c,'DATA_EXTRACTED',op,'Nueva información extraída',result,at);registerAuditEvent(c,'CASE_INFORMATION_UPDATED',op,'Contexto consolidado conservando mensajes anteriores',{fields:result.fields,items:c.orderItems},at);revalidate(c,data,op,at);return c;
}
export function consultSystems(original:CommercialCase,data:SystemsData,op:string,at=now()){
 const c=structuredClone(original);editable(c);c.validation=validateRequest(c,data.products);if(!c.validation.canQuote)throw new Error('Hay datos obligatorios por resolver.');
 c.activeResponseId=undefined;c.quotation=undefined;status(c,'EN COTIZACIÓN',op,at);
 for(const item of c.orderItems){item.stock=getStock(item.sku,data);item.price=getPrice(item.sku,data);if(!item.stock)throw new Error(`No se encontró stock de ${item.sku}.`);item.stockStatus=item.stock.usable===0?'SIN STOCK':item.stock.usable<Number(item.quantity)?'STOCK PARCIAL':'STOCK COMPLETO';item.priceStatus=isCurrentPrice(item.price,at)?'VIGENTE':'PENDIENTE DE PRECIO';
  const pending=c.remediations.find(r=>r.sku===item.sku&&r.status!=='RESUELTA');
  if(item.priceStatus==='PENDIENTE DE PRECIO'&&!pending)c.remediations.push({id:uid(),sku:item.sku,reason:item.price?.amount?'Precio fuera de vigencia':'Producto sin precio',status:'PENDIENTE'});
  if(item.priceStatus==='VIGENTE'&&pending){pending.status='RESUELTA';pending.resolvedAt=at;registerAuditEvent(c,'PRICE_REMEDIATION_RESOLVED',op,`Precio vigente encontrado: ${item.sku}`,pending,at);}
 }
 c.checkedRevision=c.revision;c.checkedAt=at;c.orderItems.forEach(i=>i.validations=validateOrderItem(i,data.products));c.validation=validateRequest(c,data.products);
 registerAuditEvent(c,'STOCK_CHECKED',op,'Stock central consultado desde Excel',c.orderItems.map(i=>({sku:i.sku,stock:i.stock})),at);registerAuditEvent(c,'PRICE_CHECKED',op,'Lista General consultada desde Excel',c.orderItems.map(i=>({sku:i.sku,price:i.price,status:i.priceStatus})),at);
 if(c.orderItems.some(i=>i.priceStatus==='VIGENTE')){c.quotation=calculateQuotation(c,at);c.quotationHistory.push(structuredClone(c.quotation));registerAuditEvent(c,'QUOTATION_PREPARED',op,'Cotización calculada sobre cantidades solicitadas',c.quotation,at);}return c;
}
export function requestRemediation(original:CommercialCase,op:string,at=now()){
 const c=structuredClone(original);editable(c);const pending=c.remediations.filter(r=>r.status==='PENDIENTE');if(!pending.length)throw new Error('No hay nuevas remediaciones pendientes.');for(const r of pending){r.status='SOLICITADA';r.requestedAt=at;r.requestedBy=op;}
 registerAuditEvent(c,'PRICE_REMEDIATION_REQUESTED',op,'Solicitud interna de actualización de precios registrada (simulada)',pending,at);return c;
}
export function prepareResponse(original:CommercialCase,kind:'missing'|'quotation',op:string,at=now()){
 const c=structuredClone(original);editable(c);if(!validContact(c))throw new Error('Completar un canal válido antes de preparar respuesta.');
 if(kind==='quotation'&&(!c.validation.canQuote||c.checkedRevision!==c.revision||c.quotation?.items.some(i=>!isCurrentPrice(c.orderItems.find(o=>o.id===i.itemId)?.price,at))))throw new Error('Volvé a consultar: los datos o precios no están vigentes.');
 const r=kind==='missing'?buildMissingInformationResponse(c,at):buildQuotationResponse(c,at);c.responses.push(r);c.activeResponseId=r.id;registerAuditEvent(c,'RESPONSE_GENERATED',op,'Respuesta sugerida generada',r,at);registerAuditEvent(c,'OUTBOUND_MESSAGE_PREPARED',op,'Borrador pendiente de revisión',r,at);status(c,'RESPUESTA PREPARADA',op,at);return c;
}
export function editResponse(original:CommercialCase,content:string,subject:string,op:string,at=now()){
 const c=structuredClone(original);editable(c);const r=activeResponse(c);if(!r||r.sentAt)throw new Error('No hay borrador editable.');if(!content.trim())throw new Error('La respuesta no puede estar vacía.');
 const before=structuredClone(r);r.content=content;r.subject=subject;r.approvedBy=undefined;r.approvedAt=undefined;r.copiedAt=undefined;r.copiedBy=undefined;registerAuditEvent(c,'OUTBOUND_MESSAGE_EDITED',op,'Respuesta editada; requiere nueva aprobación',{before,after:r},at);status(c,'RESPUESTA PREPARADA',op,at);return c;
}
export function approveResponse(original:CommercialCase,op:string,at=now()){
 const c=structuredClone(original);editable(c);const r=activeResponse(c);if(!r||r.sentAt||r.revision!==c.revision||!validContact(c))throw new Error('No hay un borrador vigente para aprobar.');r.approvedAt=at;r.approvedBy=op;registerAuditEvent(c,'RESPONSE_APPROVED',op,'Revisión humana aprobada',r,at);status(c,'PENDIENTE DE ENVÍO',op,at);return c;
}
export function markResponseCopied(original:CommercialCase,op:string,at=now()){
 const c=structuredClone(original);editable(c);const r=activeResponse(c);if(!r||!r.approvedAt||r.sentAt||r.revision!==c.revision)throw new Error('Revisar y aprobar antes de copiar.');r.copiedAt=at;r.copiedBy=op;registerAuditEvent(c,'OUTBOUND_MESSAGE_COPIED',op,'Respuesta copiada al portapapeles',r,at);return c;
}
export function confirmResponseSent(original:CommercialCase,op:string,at=now()){
 const c=structuredClone(original);editable(c);const r=activeResponse(c);if(!r||!r.approvedAt||!r.copiedAt||r.sentAt||r.revision!==c.revision||!validContact(c))throw new Error('Copiar una respuesta aprobada y vigente antes de confirmar.');
 if(r.type==='QUOTATION'&&c.quotation?.items.some(i=>!isCurrentPrice(c.orderItems.find(o=>o.id===i.itemId)?.price,at)))throw new Error('Un precio venció. Volvé a consultar y preparar la respuesta.');
 r.sentAt=at;c.conversation.push({id:uid(),caseId:c.id,direction:'OUTBOUND',channel:r.channel,timestamp:at,content:r.content,subject:r.subject,operatorId:op,messageType:r.type,responseId:r.id});registerAuditEvent(c,'OUTBOUND_MESSAGE_CONFIRMED',op,'Envío manual confirmado',r,at);
 if(r.type==='MISSING_INFORMATION_REQUEST'){registerAuditEvent(c,'CUSTOMER_INFORMATION_REQUESTED',op,'Se solicitó información adicional',r.content,at);registerAuditEvent(c,'WAITING_FOR_CUSTOMER',op,'Próximo paso a cargo del cliente',undefined,at);status(c,'ESPERANDO CLIENTE',op,at);}else status(c,'RESPONDIDO',op,at);return c;
}
export function closeCase(original:CommercialCase,reason:string,op:string,at=now()){
 const c=structuredClone(original);editable(c);if(c.status!=='RESPONDIDO')throw new Error('Confirmar la respuesta comercial antes del cierre.');if(!reason.trim())throw new Error('Indicá el motivo de cierre.');registerAuditEvent(c,'CASE_CLOSED',op,'Cierre manual',{reason,pending:c.remediations.filter(r=>r.status!=='RESUELTA')},at);status(c,'CERRADO',op,at);return c;
}

import type {CommercialCase,ResponseDraft} from '../domain/models';
import {money,uid,dateTime} from '../domain/common';
import {validContact} from './validation';
export function activeResponse(c:CommercialCase){return c.responses.find(r=>r.id===c.activeResponseId);}
export function buildMissingInformationResponse(c:CommercialCase,at:string):ResponseDraft{
 const problems=c.validation.issues.filter(i=>i.blocking&&!['INVALID_REPLY_CHANNEL','INDIVIDUAL_QUANTITIES'].includes(i.code));
 if(!problems.length)throw new Error('No hay información bloqueante para solicitar al cliente.');
 const single=c.orderItems.length===1&&c.orderItems[0].quantity===''&&problems.length===1&&problems[0].code==='MISSING_QUANTITY';
 const content=single?`Hola${c.customer?' '+c.customer:''}, gracias por tu consulta. Para poder preparar la cotización necesitamos confirmar qué cantidad de ${c.orderItems[0].original} necesitás.`:`Hola${c.customer?' '+c.customer:''}, gracias por tu consulta.\n\nPara preparar la cotización necesitamos confirmar:\n${problems.map(i=>`• ${i.message}`).join('\n')}\n\nCuando tengamos esa información podremos avanzar.`;
 return {id:uid(),type:'MISSING_INFORMATION_REQUEST',channel:c.replyChannel,subject:`Información adicional · ${c.id}`,content,createdAt:at,revision:c.revision};
}
export function buildQuotationResponse(c:CommercialCase,at:string):ResponseDraft{
 const q=c.quotation;if(!q||q.revision!==c.revision)throw new Error('La cotización no está actualizada.');
 const lines=q.items.map(i=>`${i.sku} · ${i.name}\n${i.quantity} unidades × ${money(i.unitPrice)} ${i.includesVat?'(IVA incluido)':'neto + IVA'} c/u.\nSubtotal neto: ${money(i.net)}.\n${i.available===0?'Actualmente no contamos con stock disponible de este producto. No hay entrega disponible.':i.available<i.quantity?`Solo podemos entregar ${i.available} de las ${i.quantity} unidades solicitadas. Las ${i.missing} restantes quedan sin disponibilidad ni fecha de entrega confirmada.`:`Contamos con las ${i.quantity} unidades solicitadas en stock. Fecha y modalidad de entrega a coordinar.`}`);
 const content=`${c.replyChannel==='EMAIL'?'Buen día':'Hola'}${c.customer?' '+c.customer:''}, gracias por tu consulta.\n\nTe compartimos ${q.partial?'una cotización parcial':'la cotización'} de ${c.company||c.id}:\n\n${lines.join('\n\n')}${q.excluded.length?`\n\nPendiente de precio: ${q.excluded.join(', ')}. Estos productos están excluidos del total; estamos gestionando la actualización de sus precios.`:''}\n\nSubtotal neto: ${money(q.subtotal)}\nIVA 21%: ${money(q.vat)}\nTotal ${q.partial?'parcial ':''}con IVA: ${money(q.total)} ARS.\n\nEl importe contempla las cantidades solicitadas de los productos cotizados. Solo se entrega lo que hay en stock. Las cantidades faltantes no tienen reposición ni fecha prometida. Esta cotización no reserva inventario.\nPrecios consultados el ${dateTime(q.createdAt)}. Vigencia hasta ${q.items.map(i=>i.until).sort()[0]}.\nEntrega y transporte a coordinar; envío no incluido.\n\nQuedamos a disposición para avanzar.`;
 return {id:uid(),type:'QUOTATION',channel:c.replyChannel,subject:`Cotización ${q.partial?'parcial ':''}${c.id}`,content,createdAt:at,revision:c.revision};
}
export function recommendNextAction(c:CommercialCase):{title:string;detail:string}{
 if(c.status==='CERRADO')return {title:'Caso cerrado',detail:'El historial queda disponible para consulta.'};
 if(c.status==='ESPERANDO CLIENTE')return {title:'Esperar respuesta del cliente',detail:'Agregar la nueva respuesta a este mismo caso para completar la información.'};
 if(c.status==='PENDIENTE DE ENVÍO')return {title:'Copiar, enviar y confirmar',detail:'El envío se realiza manualmente fuera de esta aplicación.'};
 if(c.status==='RESPUESTA PREPARADA')return {title:'Revisar y aprobar la respuesta',detail:'Controlar el contenido antes de copiar y enviar.'};
 if(!validContact(c))return {title:'Completar el canal de respuesta',detail:c.replyChannel==='EMAIL'?'Ingresar un email válido.':'Ingresar un teléfono válido para WhatsApp.'};
 if(!c.validation.canQuote)return {title:'Solicitar o corregir información',detail:c.validation.issues.find(i=>i.blocking)?.message||'Revisar la solicitud.'};
 const pending=c.remediations.filter(r=>r.status!=='RESUELTA');
 if(c.status==='RESPONDIDO')return {title:pending.length?'Gestionar precios pendientes':'Realizar seguimiento o cerrar el caso',detail:pending.length?`${pending.map(p=>p.sku).join(', ')}: solicitar remediación y volver a consultar los Excel.`:'La respuesta fue enviada. El cierre es una decisión manual.'};
 if(c.checkedRevision!==c.revision)return {title:'Consultar precio y stock',detail:'La información obligatoria está completa. Consultar los dos Excel.'};
 if(c.orderItems.every(i=>i.priceStatus==='PENDIENTE DE PRECIO'))return {title:'Solicitar remediación de precios',detail:'No hay productos con precio vigente para incluir en una cotización.'};
 return {title:'Preparar respuesta comercial',detail:pending.length?'Cotización parcial: los productos pendientes de precio se excluyen del total.':'Revisar cotización y preparar la respuesta.'};
}

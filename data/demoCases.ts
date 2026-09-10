import type {SystemsData} from '../lib/domain/models';
import {createCase,consultSystems} from '../lib/services/caseService';
export function demoCases(data:SystemsData,base=new Date()){
 const examples=[
  ['WHATSAPP','Juan Pérez','Metalúrgica Delta','Hola, necesitamos cotización por rodamientos SKF 6205.','Cantidad faltante · demo principal'],
  ['WHATSAPP','Ana Suárez','Talleres del Sur','Necesitamos 20 motores MTR-200 y también rodamientos SKF 6205.','Varios productos · completar cantidad'],
  ['EMAIL','Lucía Pardo','Mecánica Ribera','Buen día, necesitamos cotización por:\n100 unidades ABC-100\n50 unidades MTR-200\n30 unidades CR-500.','Varios productos · stocks diferentes'],
  ['PHONE','Carlos Díaz','Industrias Alba','Hola, soy Carlos de Industrias Alba. Necesitamos 30 motores MTR-200 y 50 rodamientos ABC-100.','Teléfono · elegir canal'],
  ['WHATSAPP','Sergio Ramos','Mecanizados Olmo','Necesito 10 unidades ROD-6205.','Stock completo'],
  ['EMAIL','María Castro','Plásticos Horizonte','Cotizar 20 unidades XYZ-999.','SKU inexistente'],
  ['WHATSAPP','Pablo Vega','Talleres Cauce','Necesito 10 rodamientos.','Producto ambiguo'],
  ['EMAIL','Elena Acosta','Servicios Bruma','Solicito 5 unidades VAL-100.','Precio vencido'],
  ['WHATSAPP','Diego Molina','Automatización Ladera','Cotizar 4 unidades SEN-200 y 10 unidades ROD-6205.','Sin precio · cotización parcial'],
  ['WHATSAPP','Carolina Ríos','Transmisiones Vértice','Necesito 50 unidades CR-100.','Stock parcial · 32 de 50'],
  ['EMAIL','Oscar Luna','Industrial Fresno','Solicito 20 unidades CR-500.','Stock cero'],
  ['EMAIL','Marta Robles','Equipos Senda','Solicitamos 20 unidades ABC-100.','Pedido completo · IVA incluido'],
  ['WHATSAPP','Tomás Gil','Fabricaciones Arce','Necesitamos motores MTR-200 y rodamientos SKF 6205.','Dos cantidades faltantes · respuesta ambigua'],
 ] as const;
 const start=new Date(base);start.setHours(8,0,0,0);if(start>base)start.setDate(start.getDate()-1);
 const future=new Date(base.getTime()+9*86400000).toISOString().slice(0,10);
 return examples.map(([channel,customer,company,content,scenario],i)=>{
  const at=new Date(Math.min(base.getTime()-60000,start.getTime()+i*7*60000)).toISOString();
  let c=createCase({id:`REQ-${String(i+1).padStart(3,'0')}`,channel,customer,company,content,subject:channel==='EMAIL'?'Solicitud de cotización':undefined,email:channel==='PHONE'?'':`compras${i+1}@ejemplo.test`,phone:channel==='PHONE'?'':`+54 11 5550 ${String(1000+i)}`,requiredDate:i===11?future:'',deliveryLocation:i===11?'Avellaneda, Buenos Aires':'',scenario},data,['laura','martin','carlos','federico'][i%4],at);
  if(i===7||i===8)c=consultSystems(c,data,c.assignedOperator,at);return c;
 });
}

export const STATUSES = ['NUEVO','EN ANÁLISIS','FALTA INFORMACIÓN','ESPERANDO CLIENTE','LISTO PARA COTIZAR','EN COTIZACIÓN','RESPUESTA PREPARADA','PENDIENTE DE ENVÍO','RESPONDIDO','CERRADO'] as const;
export type CaseStatus = typeof STATUSES[number];
export type Channel = 'WHATSAPP'|'EMAIL'|'PHONE';
export type ReplyChannel = Exclude<Channel,'PHONE'>;
export type MessageType = 'INITIAL_REQUEST'|'CUSTOMER_REPLY'|'MISSING_INFORMATION_REQUEST'|'QUOTATION'|'OTHER';
export interface Operator { id:string; name:string }
export interface ConversationMessage { id:string; caseId:string; direction:'INBOUND'|'OUTBOUND'; channel:Channel; timestamp:string; content:string; subject?:string; operatorId:string; messageType:MessageType; responseId?:string }
export interface AuditEvent { id:string; timestamp:string; operatorId:string; type:string; detail:string; data?:unknown }
export interface Product { sku:string; name:string; category:string; aliases:string[] }
export interface Stock { sku:string; available:number; reserved:number; usable:number; updatedAt:string }
export interface Price { sku:string; amount:number|null; currency:string; includesVat:boolean; from:string; until:string; list:string }
export interface SystemsData { products:Product[]; stock:Stock[]; prices:Price[]; loadedAt:string }
export interface OrderItem { id:string; original:string; sku:string; productName:string; quantity:string; source:string; candidates:string[]; stock?:Stock; price?:Price; stockStatus?:'STOCK COMPLETO'|'STOCK PARCIAL'|'SIN STOCK'; priceStatus?:'VIGENTE'|'PENDIENTE DE PRECIO'; validations:ValidationIssue[] }
export interface ValidationIssue { code:string; level:'error'|'missing'|'confirm'|'warning'; message:string; blocking:boolean; itemId?:string }
export interface ValidationResult { issues:ValidationIssue[]; canQuote:boolean; completeness:number }
export interface QuotationItem { itemId:string; sku:string; name:string; quantity:number; available:number; missing:number; theoretical:number; unitPrice:number; includesVat:boolean; net:number; vat:number; total:number; until:string }
export interface Quotation { id:string; createdAt:string; revision:number; items:QuotationItem[]; excluded:string[]; subtotal:number; vat:number; total:number; partial:boolean }
export interface ResponseDraft { id:string; type:MessageType; channel:ReplyChannel; subject:string; content:string; createdAt:string; revision:number; approvedBy?:string; approvedAt?:string; copiedAt?:string; copiedBy?:string; sentAt?:string }
export interface Remediation { id:string; sku:string; reason:string; status:'PENDIENTE'|'SOLICITADA'|'RESUELTA'; requestedBy?:string; requestedAt?:string; resolvedAt?:string }
export interface CommercialCase { id:string; createdAt:string; updatedAt:string; initialChannel:Channel; replyChannel:ReplyChannel; customer:string; company:string; email:string; phone:string; requiredDate:string; deliveryLocation:string; currency:string; observations:string; status:CaseStatus; assignedOperator:string; orderItems:OrderItem[]; conversation:ConversationMessage[]; validation:ValidationResult; quotation?:Quotation; quotationHistory:Quotation[]; responses:ResponseDraft[]; activeResponseId?:string; auditEvents:AuditEvent[]; revision:number; checkedRevision?:number; checkedAt?:string; ambiguities:string[]; sources:Record<string,string>; remediations:Remediation[]; scenario:string }
export interface AppState { version:1; revision:number; operatorId:string; cases:CommercialCase[] }

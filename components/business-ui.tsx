'use client';
import {MessageCircle,Mail,Phone,CheckCircle2,AlertTriangle,HelpCircle,XCircle} from 'lucide-react';
import type {Channel,CaseStatus,ValidationIssue} from '@/lib/domain/models';
import {channelName} from '@/lib/domain/common';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
export function Choice({label,value,onChange,options}:{label:string;value:string;onChange:(v:string)=>void;options:{value:string;label:string}[]}){return <Select value={value||'__empty'} onValueChange={v=>onChange(v==='__empty'?'':v)}><SelectTrigger aria-label={label}><SelectValue placeholder={label}/></SelectTrigger><SelectContent>{options.map(o=><SelectItem key={o.value||'__empty'} value={o.value||'__empty'}>{o.label}</SelectItem>)}</SelectContent></Select>;}
export function ChannelBadge({channel}:{channel:Channel}){const Icon=channel==='WHATSAPP'?MessageCircle:channel==='EMAIL'?Mail:Phone;return <span className={`channel ${channel.toLowerCase()}`}><Icon size={15}/>{channelName[channel]}</span>;}
export function StatusBadge({status}:{status:CaseStatus}){const color=status==='CERRADO'?'slate':status==='RESPONDIDO'||status==='LISTO PARA COTIZAR'?'green':status==='FALTA INFORMACIÓN'?'amber':status==='ESPERANDO CLIENTE'?'purple':'blue';return <span className={`status ${color}`}><span/>{status.charAt(0)+status.slice(1).toLowerCase()}</span>;}
export function Issue({issue}:{issue:ValidationIssue}){const Icon=issue.level==='error'?XCircle:issue.level==='confirm'?HelpCircle:AlertTriangle;return <div className={`issue ${issue.blocking?'blocking':''}`}><Icon size={17}/><span>{issue.message}</span></div>;}
export function Empty({children}:{children:React.ReactNode}){return <div className="empty"><CheckCircle2 size={30}/><p>{children}</p></div>;}

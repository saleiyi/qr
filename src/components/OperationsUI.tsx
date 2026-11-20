import { useId, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Modal } from './Modal';

export const controlClass='mt-1.5 min-h-[44px] w-full rounded-lg border border-[#DCE4EC] bg-white px-3 py-2 text-sm text-[#17324D] disabled:bg-[#F4F7FA] disabled:text-[#526980]';
export const primaryClass='inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#176B5B] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#125548] disabled:opacity-50';
export const secondaryClass='inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-[#DCE4EC] bg-white px-3 py-2 text-sm font-medium text-[#17324D] hover:bg-[#F4F7FA] disabled:opacity-50';

export function FormField({label,children,hint}:{label:string;children:ReactNode;hint?:string}) {
  return <label className="block min-w-0 text-sm font-medium text-[#17324D]"><span>{label}</span>{children}{hint && <span className="mt-1 block text-xs font-normal leading-relaxed text-[#526980]">{hint}</span>}</label>;
}
export function FormError({message}:{message:string|null|undefined}) {
  return message?<p role="alert" className="rounded-lg border border-[#F4C7C3] bg-[#FEF3F2] px-3 py-2 text-sm text-[#B42318]">{message}</p>:null;
}
export function PanelModal({title,description,children,onClose,wide=false}:{title:string;description?:string;children:ReactNode;onClose:()=>void;wide?:boolean}) {
  const id=useId();
  return <Modal aria-labelledby={id} onClose={onClose} className="fixed inset-0 flex items-center justify-center bg-[#17324D]/45 p-3 sm:p-6">
    <section className={`flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ${wide?'max-w-5xl':'max-w-2xl'}`}>
      <header className="flex items-start justify-between gap-4 border-b border-[#DCE4EC] px-5 py-4"><div><h2 id={id} className="text-lg font-bold text-[#17324D]">{title}</h2>{description && <p className="mt-1 text-sm text-[#526980]">{description}</p>}</div><button type="button" onClick={onClose} aria-label="Fechar painel" className={secondaryClass}><X className="h-4 w-4" /></button></header>
      <div className="overflow-y-auto p-5">{children}</div>
    </section>
  </Modal>;
}

import type { AppStateData, ChecklistTemplate, InspectionPlan, Issue, IssuePriority, UserRole } from '../types/domain';
import { APP_CONFIG } from '../config/appConfig';
import { addDaysISODate } from '../utils/date';
import { generatePlanTasks, transitionWorkOrder, type WorkOrderAction, type WorkOrderChange } from '../utils/operations';
import { validateTemplate } from '../utils/checklist';

type Result = {ok:boolean;error?:string};
export function createOperationsActions(
  state: AppStateData,
  commitState: (state:AppStateData)=>Result,
  role: UserRole,
  notify: (toast:{type:'success'|'error'|'info';title:string;description?:string})=>void,
) {
  const save=(next:AppStateData,title:string):Result=>{
    if (role === 'viewer') return {ok:false,error:'Este perfil permite apenas consulta.'};
    const result=commitState(next);
    if (result.ok) notify({type:'success',title});
    return result;
  };
  const failure=(error:unknown):Result=>({ok:false,error:error instanceof Error?error.message:'Não foi possível salvar.'});
  return {
    savePlan(draft:Omit<InspectionPlan,'id'|'createdAt'>) {
      try {
        if (role !== 'admin') throw new Error('Somente o administrador pode criar planos.');
        if (draft.name.trim().length < 3) throw new Error('Informe um nome com pelo menos 3 caracteres.');
        if (!state.templates.some(t=>t.id === draft.templateId)) throw new Error('Selecione um modelo publicado.');
        if (!state.members.some(m=>m.id === draft.assigneeId && m.status === 'active' && m.role !== 'viewer')) throw new Error('Selecione um responsável ativo.');
        if (draft.assetIds.some(id=>!state.assets.some(a=>a.id === id && a.operationalStatus !== 'inactive'))) throw new Error('Selecione apenas equipamentos ativos.');
        const plan:InspectionPlan={...draft,name:draft.name.trim(),id:`plan-${crypto.randomUUID()}`,createdAt:APP_CONFIG.demoClockISO};
        const tasks=generatePlanTasks(plan,addDaysISODate(plan.startDate,90));
        const result=save({...state,plans:[plan,...state.plans],tasks:[...state.tasks,...tasks]},'Plano criado e tarefas programadas');
        return {...result,plan:result.ok?plan:undefined};
      } catch(error) {return {...failure(error),plan:undefined};}
    },
    createRepairRequest(assetId:string,draft:{title:string;description:string;priority:IssuePriority;reportedBy?:string;photoDataUrl?:string}) {
      const asset=state.assets.find(a=>a.id === assetId);
      if (!asset || asset.operationalStatus === 'inactive') return {ok:false,error:'Este equipamento não está disponível para receber solicitações.',issue:undefined};
      if (draft.title.trim().length < 3 || draft.description.trim().length < 5) return {ok:false,error:'Preencha o título e descreva o problema (mínimo de 5 caracteres).',issue:undefined};
      const now=APP_CONFIG.demoClockISO;
      const issue:Issue={...draft,title:draft.title.trim(),description:draft.description.trim(),reportedBy:draft.reportedBy?.trim(),id:`request-${crypto.randomUUID()}`,assetId,status:'open',assigneeId:'',dueDate:addDaysISODate(now,draft.priority === 'high'?1:3),createdAt:now,updatedAt:now,timeline:[{id:crypto.randomUUID(),at:now,actorId:'',label:'Solicitação registrada',note:draft.reportedBy?.trim()}]};
      const result=save({...state,issues:[issue,...state.issues]},'Solicitação registrada');
      return {...result,issue:result.ok?issue:undefined};
    },
    changeWorkOrder(issueId:string,action:WorkOrderAction,change:WorkOrderChange):Result {
      try {
        if (role === 'viewer') throw new Error('Este perfil permite apenas consulta.');
        const actor=state.members.find(m=>m.id === change.actorId && m.status === 'active' && m.role !== 'viewer');
        if (!actor) throw new Error('Selecione um responsável pela ação.');
        if (['assign','approve','reject'].includes(action) && (role !== 'admin' || actor.role !== 'admin')) throw new Error('A atribuição e a verificação precisam de um administrador.');
        const issue=state.issues.find(i=>i.id === issueId);
        if (!issue) throw new Error('Ordem não encontrada.');
        if (action === 'assign' && !state.members.some(m=>m.id === change.assigneeId && m.status === 'active' && m.role !== 'viewer')) throw new Error('Selecione um técnico ativo.');
        const updated=transitionWorkOrder(issue,action,change,APP_CONFIG.demoClockISO);
        return save({...state,issues:state.issues.map(i=>i.id === issueId?updated:i)},updated.timeline!.at(-1)!.label);
      } catch(error) {return failure(error);}
    },
    saveTemplateDraft(template:ChecklistTemplate):Result {
      if (role !== 'admin') return {ok:false,error:'Somente o administrador pode editar modelos.'};
      if (!template.name.trim()) return {ok:false,error:'Informe o nome do modelo.'};
      const draft=structuredClone({...template,updatedAt:APP_CONFIG.demoClockISO});
      return save({...state,templateDrafts:[draft,...state.templateDrafts.filter(t=>t.id !== draft.id)]},'Rascunho do modelo salvo');
    },
    publishTemplate(template:ChecklistTemplate):Result {
      if (role !== 'admin') return {ok:false,error:'Somente o administrador pode publicar modelos.'};
      const error=validateTemplate(template);
      if (error) return {ok:false,error};
      const version=(state.templates.find(t=>t.id === template.id)?.version ?? (state.templates.some(t=>t.id === template.id)?1:0))+1;
      const published=structuredClone({...template,name:template.name.trim(),version,updatedAt:APP_CONFIG.demoClockISO});
      return save({...state,templates:[published,...state.templates.filter(t=>t.id !== published.id)],templateDrafts:state.templateDrafts.filter(t=>t.id !== published.id)},`Modelo publicado · versão ${version}`);
    },
  };
}
export type OperationsActions=ReturnType<typeof createOperationsActions>;

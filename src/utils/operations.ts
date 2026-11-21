import type {
  AppStateData,
  InspectionPlan,
  InspectionTask,
  Issue,
  IssuePriority,
} from '../types/domain';
import { APP_CONFIG } from '../config/appConfig';
import { addDaysISODate, diffDays } from './date';

export function validDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value
  );
}

export function generatePlanTasks(
  plan: InspectionPlan,
  throughDate: string,
  existing: InspectionTask[] = [],
  fromDate: string = plan.startDate,
): InspectionTask[] {
  if (
    !validDate(plan.startDate) ||
    !validDate(throughDate) ||
    !['daily', 'weekly', 'monthly'].includes(plan.frequency)
  ) {
    throw new Error('Informe datas e frequência válidas para o plano.');
  }
  if (!plan.assetIds.length || new Set(plan.assetIds).size !== plan.assetIds.length)
    throw new Error('Selecione equipamentos diferentes.');
  const anchor = new Date(`${plan.startDate}T12:00:00Z`);
  const stored = new Map(existing.map((task) => [task.id, task]));
  const tasks: InspectionTask[] = [];
  const startStep =
    plan.frequency === 'monthly'
      ? Math.max(
          0,
          (Number(fromDate.slice(0, 4)) - anchor.getUTCFullYear()) * 12 +
            Number(fromDate.slice(5, 7)) -
            1 -
            anchor.getUTCMonth(),
        )
      : Math.max(
          0,
          Math.ceil(diffDays(fromDate, plan.startDate) / (plan.frequency === 'weekly' ? 7 : 1)),
        );
  for (let step = startStep; ; step++) {
    const date = new Date(anchor);
    if (plan.frequency === 'monthly') {
      date.setUTCDate(1);
      date.setUTCMonth(anchor.getUTCMonth() + step);
      const lastDay = new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
      ).getUTCDate();
      date.setUTCDate(Math.min(anchor.getUTCDate(), lastDay));
    } else date.setUTCDate(anchor.getUTCDate() + step * (plan.frequency === 'weekly' ? 7 : 1));
    const dueDate = date.toISOString().slice(0, 10);
    if (dueDate > throughDate) break;
    if (dueDate < fromDate) continue;
    if (tasks.length + plan.assetIds.length > 10000)
      throw new Error('O período gera muitas tarefas. Escolha uma data inicial mais recente.');
    for (const assetId of plan.assetIds) {
      const id = `task:${plan.id}:${assetId}:${dueDate}`;
      tasks.push(
        stored.get(id) ?? {
          id,
          planId: plan.id,
          planName: plan.name,
          assetId,
          templateId: plan.templateId,
          assigneeId: plan.assigneeId,
          dueDate,
          status: 'pending',
        },
      );
    }
  }
  return tasks;
}

export function materializePlanTasks(
  plan: InspectionPlan,
  referenceDate: string,
  existing: InspectionTask[] = [],
): InspectionTask[] {
  const fromDate = addDaysISODate(referenceDate, -30);
  const throughDate = addDaysISODate(referenceDate, 90);
  const tasks = new Map(existing.map((task) => [task.id, task]));
  for (const task of generatePlanTasks(
    plan,
    throughDate,
    existing,
    fromDate > plan.startDate ? fromDate : plan.startDate,
  ))
    tasks.set(task.id, task);
  return [...tasks.values()];
}

/** Add new collections to old browser saves without replacing equipment edits. */
export function normalizeOperationsState(state: AppStateData): AppStateData {
  const normalized = {
    ...state,
    plans: Array.isArray(state.plans) ? state.plans : [],
    tasks: Array.isArray(state.tasks) ? state.tasks : [],
    templateDrafts: Array.isArray(state.templateDrafts) ? state.templateDrafts : [],
  };
  const tasks = new Map(normalized.tasks.map((task) => [task.id, task]));
  const scheduleWarnings: string[] = [];
  for (const plan of normalized.plans) {
    try {
      for (const task of materializePlanTasks(plan, APP_CONFIG.demoClockDate, normalized.tasks))
        tasks.set(task.id, task);
    } catch (error) {
      scheduleWarnings.push(
        `${plan.name}: ${error instanceof Error ? error.message : 'Não foi possível gerar a agenda.'}`,
      );
    }
  }
  return { ...normalized, tasks: [...tasks.values()], scheduleWarnings };
}

export type WorkOrderAction = 'assign' | 'start' | 'submit' | 'approve' | 'reject';
export interface WorkOrderChange {
  actorId: string;
  assigneeId?: string;
  assigneeName?: string;
  dueDate?: string;
  priority?: IssuePriority;
  note?: string;
  photoDataUrl?: string;
  photoName?: string;
}

export function transitionWorkOrder(
  issue: Issue,
  action: WorkOrderAction,
  change: WorkOrderChange,
  now: string,
): Issue {
  if (!change.actorId || issue.status === 'resolved')
    throw new Error('Esta ordem não permite essa alteração.');
  const updated = { ...issue, updatedAt: now };
  let label = '';
  const note = change.note?.trim();
  if (action === 'assign') {
    if (!change.assigneeId || !change.dueDate || !validDate(change.dueDate))
      throw new Error('Selecione o responsável e um prazo válido.');
    updated.assigneeId = change.assigneeId;
    updated.dueDate = change.dueDate;
    updated.priority = change.priority ?? issue.priority;
    label = 'Responsável e prazo definidos';
  } else if (action === 'start') {
    if (issue.status !== 'open' || !issue.assigneeId)
      throw new Error('Atribua a ordem antes de iniciar o atendimento.');
    updated.status = 'in_progress';
    label = 'Atendimento iniciado';
  } else if (action === 'submit') {
    if (issue.status !== 'in_progress' || !note || note.length < 5)
      throw new Error('Descreva o tratamento realizado (mínimo de 5 caracteres).');
    updated.status = 'awaiting_review';
    updated.resolutionNote = note;
    updated.treatmentPhotoDataUrl =
      'photoDataUrl' in change ? change.photoDataUrl : issue.treatmentPhotoDataUrl;
    updated.treatmentPhotoName =
      'photoName' in change ? change.photoName : issue.treatmentPhotoName;
    label = 'Tratamento enviado para verificação';
  } else if (action === 'approve' || action === 'reject') {
    if (issue.status !== 'awaiting_review')
      throw new Error('A ordem precisa estar aguardando verificação.');
    if (action === 'reject' && (!note || note.length < 5))
      throw new Error('Explique o motivo da devolução (mínimo de 5 caracteres).');
    updated.status = action === 'approve' ? 'resolved' : 'in_progress';
    if (action === 'approve') {
      updated.resolvedAt = now;
      updated.resolvedById = change.actorId;
    }
    label =
      action === 'approve' ? 'Tratamento aprovado e ordem concluída' : 'Devolvida para ajuste';
  }
  updated.timeline = [
    ...(issue.timeline ?? []),
    ...(action === 'submit' &&
    issue.treatmentPhotoDataUrl &&
    !issue.timeline?.some((event) => event.photoDataUrl === issue.treatmentPhotoDataUrl)
      ? [
          {
            id: crypto.randomUUID(),
            at: issue.updatedAt,
            actorId: issue.assigneeId,
            label: 'Tratamento anterior preservado',
            note: issue.resolutionNote,
            photoDataUrl: issue.treatmentPhotoDataUrl,
            photoName: issue.treatmentPhotoName,
          },
        ]
      : []),
    {
      id: crypto.randomUUID(),
      at: now,
      actorId: change.actorId,
      label,
      note,
      ...(action === 'submit'
        ? { photoDataUrl: updated.treatmentPhotoDataUrl, photoName: updated.treatmentPhotoName }
        : {}),
      ...(action === 'assign'
        ? {
            assigneeId: updated.assigneeId,
            assigneeName: change.assigneeName,
            dueDate: updated.dueDate,
            priority: updated.priority,
          }
        : {}),
    },
  ];
  return updated;
}

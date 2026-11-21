import type { AppStateData, Asset, Member, Issue } from '../src/types/domain';
import type { PilotCommand, PilotWorkspaceResponse } from '../src/types/pilot';
import {
  validateAssetInput,
  buildInspectionSubmission,
  validateInspectionDraft,
} from '../src/utils/domainLogic';
import { visibleItems, validateTemplate } from '../src/utils/checklist';
import { validDate, materializePlanTasks, transitionWorkOrder } from '../src/utils/operations';
import { addDaysISODate } from '../src/utils/date';
import { denied, invalid, missing, conflict } from './common';
import { Files } from './files';
import { type EntityKind } from './workspace';

export interface Mutation {
  put: Partial<Record<EntityKind, { id: string }[]>>;
  removeDraft?: string;
  member?: Member;
  company?: AppStateData['company'];
  result: Record<string, unknown>;
}
function byId<T extends { id: string }>(list: T[], id: string): T {
  return list.find((x) => x.id === id) ?? missing();
}
function technician(state: AppStateData, id: string) {
  const member = byId(state.members, id);
  if (member.status !== 'active' || member.role === 'viewer')
    invalid('Selecione um responsável ativo.');
  return member;
}
export function authorize(cmd: PilotCommand, live: PilotWorkspaceResponse) {
  const { role, memberId } = live.identity;
  if (role === 'viewer') denied();
  if (cmd.type === 'inspection.submit') {
    if (cmd.input.inspectorId !== memberId) denied();
  } else if (cmd.type === 'issue.change') {
    if (
      cmd.change.actorId !== memberId ||
      (role !== 'admin' && !['start', 'submit'].includes(cmd.action))
    )
      denied();
  } else if (cmd.type === 'request.create') {
    if (cmd.draft.reportedBy && cmd.draft.reportedBy !== live.identity.name) denied();
  } else if (role !== 'admin') denied();
}
export async function applyCommand(
  cmd: PilotCommand,
  live: PilotWorkspaceResponse,
  files: Files,
): Promise<Mutation> {
  const { state, identity, nowISO, today } = live;
  const data: Mutation = { put: {}, result: {} };
  const activeAsset = (id: string) => {
    const asset = byId(state.assets, id);
    if (asset.operationalStatus === 'inactive') invalid('Equipamento inativo.');
    return asset;
  };
  switch (cmd.type) {
    case 'asset.create':
    case 'asset.update':
    case 'asset.import': {
      const existing = cmd.type === 'asset.update' ? byId(state.assets, cmd.assetId) : undefined;
      const drafts =
        cmd.type === 'asset.import'
          ? cmd.drafts
          : cmd.type === 'asset.create'
            ? [cmd.draft]
            : [{ ...existing!, ...cmd.patch }];
      const assets: Asset[] = [];
      for (const draft of drafts) {
        const errors = validateAssetInput(draft, [...state.assets, ...assets], existing?.id);
        if (Object.keys(errors).length) invalid(Object.values(errors)[0]);
        byId(state.sites, draft.siteId);
        byId(state.templates, draft.templateId);
        technician(state, draft.assigneeId);
        const asset: Asset = {
          ...draft,
          id: existing?.id ?? 'asset-' + crypto.randomUUID(),
          name: draft.name.trim(),
          code: draft.code.trim().toUpperCase(),
          photoDataUrl: await files.resolve(draft.photoDataUrl),
          files: existing?.files ?? [],
          createdAt: existing?.createdAt ?? nowISO,
          updatedAt: nowISO,
        };
        if (
          existing?.lastInspectionAt &&
          existing.inspectionCycleDays !== asset.inspectionCycleDays
        )
          asset.nextInspectionDue = addDaysISODate(
            existing.lastInspectionAt,
            asset.inspectionCycleDays,
          );
        assets.push(asset);
      }
      data.put.assets = assets;
      data.result =
        cmd.type === 'asset.import' ? { importedCount: assets.length } : { asset: assets[0] };
      break;
    }
    case 'asset.status': {
      const asset = {
        ...byId(state.assets, cmd.assetId),
        operationalStatus: cmd.status,
        updatedAt: nowISO,
      };
      data.put.assets = [asset];
      data.result = { asset };
      break;
    }
    case 'inspection.submit': {
      const p = cmd.input;
      const task = p.taskId ? byId(state.tasks, p.taskId) : undefined;
      if (task && (task.assetId !== p.assetId || task.assigneeId !== identity.memberId)) denied();
      if (task?.status === 'completed') {
        data.result = {
          record: byId(state.records, task.recordId!),
          createdIssuesCount: 0,
          alreadyCompleted: true,
        };
        break;
      }
      const asset = activeAsset(p.assetId),
        template = byId(state.templates, p.templateId);
      if (
        template.id !== (task?.templateId ?? asset.templateId) ||
        p.templateVersion !== (template.version ?? 1)
      )
        conflict('O modelo foi atualizado. Reabra a inspeção.');
      const answers = structuredClone(p.answers);
      for (const [key, a] of Object.entries(answers)) {
        if (!template.items.some((q) => q.id === key)) invalid('Pergunta desconhecida.');
        if (a.photoDataUrl) a.photoDataUrl = await files.resolve(a.photoDataUrl);
      }
      for (const item of visibleItems(template, answers)) {
        const a = answers[item.id];
        if (item.type === 'date' && a?.value && !validDate(a.value))
          invalid('Informe uma data válida.');
      }
      const errors = validateInspectionDraft(template, answers);
      if (errors.length) invalid(errors[0].message);
      const submission = buildInspectionSubmission({
        asset,
        template,
        answers,
        inspector: technician(state, identity.memberId),
        generalNotes: p.generalNotes,
        submittedAtISO: nowISO,
        idempotencyKey: p.idempotencyKey,
        existingRecords: state.records,
        existingIssues: state.issues,
      });
      if (!submission.result) conflict('Este envio já foi registrado.');
      const { record, updatedAsset, createdIssues } = submission.result;
      record.taskId = task?.id;
      updatedAsset.nextInspectionDue = addDaysISODate(today, asset.inspectionCycleDays);
      for (const issue of createdIssues) issue.dueDate = addDaysISODate(today, 3);
      data.put = { records: [record], assets: [updatedAsset], issues: createdIssues };
      if (task)
        data.put.tasks = [
          { ...task, status: 'completed', recordId: record.id, completedAt: nowISO } as typeof task,
        ];
      data.result = { record, createdIssuesCount: createdIssues.length, alreadyCompleted: false };
      break;
    }
    case 'request.create': {
      activeAsset(cmd.assetId);
      const issue: Issue = {
        ...cmd.draft,
        photoDataUrl: await files.resolve(cmd.draft.photoDataUrl),
        reportedBy: identity.name,
        id: 'request-' + crypto.randomUUID(),
        assetId: cmd.assetId,
        status: 'open',
        assigneeId: '',
        dueDate: addDaysISODate(today, cmd.draft.priority === 'high' ? 1 : 3),
        createdAt: nowISO,
        updatedAt: nowISO,
        timeline: [
          {
            id: crypto.randomUUID(),
            at: nowISO,
            actorId: identity.memberId,
            label: 'Solicitação registrada',
            note: identity.name,
          },
        ],
      };
      data.put.issues = [issue];
      data.result = { issue };
      break;
    }
    case 'issue.change': {
      const issue = byId(state.issues, cmd.issueId);
      if (identity.role !== 'admin' && issue.assigneeId !== identity.memberId) denied();
      const change = {
        ...cmd.change,
        actorId: identity.memberId,
        assigneeName: undefined as string | undefined,
      };
      if (cmd.action === 'assign')
        change.assigneeName = technician(state, change.assigneeId ?? '').name;
      if (change.photoDataUrl) change.photoDataUrl = await files.resolve(change.photoDataUrl);
      try {
        const updated = transitionWorkOrder(issue, cmd.action, change, nowISO);
        data.put.issues = [updated];
        data.result = { issue: updated };
      } catch (e) {
        invalid((e as Error).message);
      }
      break;
    }
    case 'plan.save': {
      const p = cmd.draft;
      byId(state.templates, p.templateId);
      technician(state, p.assigneeId);
      p.assetIds.forEach(activeAsset);
      if (p.startDate > addDaysISODate(today, 90))
        invalid('Escolha uma data inicial dentro de 90 dias.');
      const plan = { ...p, id: 'plan-' + crypto.randomUUID(), createdAt: nowISO };
      try {
        data.put.tasks = materializePlanTasks(plan, today, []);
      } catch (e) {
        invalid((e as Error).message);
      }
      data.put.plans = [plan];
      data.result = { plan };
      break;
    }
    case 'template.draft':
    case 'template.publish': {
      const t = cmd.template;
      const version = state.templates.find((x) => x.id === t.id)?.version ?? 0;
      if ((t.version ?? 0) !== version) conflict('A versão do modelo mudou.');
      const draft = { ...t, version, updatedAt: nowISO };
      if (cmd.type === 'template.publish') {
        const err = validateTemplate(t);
        if (err) invalid(err);
        data.put.templates = [{ ...draft, version: version + 1 } as typeof draft];
        data.removeDraft = t.id;
      } else data.put.templateDrafts = [draft];
      break;
    }
    case 'template.apply': {
      byId(state.templates, cmd.templateId);
      const assets = state.assets
        .filter((a) => cmd.category === 'all' || a.category === cmd.category)
        .map((a) => ({ ...a, templateId: cmd.templateId, updatedAt: nowISO }));
      data.put.assets = assets;
      data.result = { updatedCount: assets.length };
      break;
    }
    case 'company.update':
      data.company = cmd.company;
      break;
    case 'member.update': {
      const member = byId(state.members, cmd.memberId);
      if (member.invitationPending) conflict('Renove o convite para alterar um acesso pendente.');
      const updated = { ...member, ...cmd.patch };
      if (
        (updated.status !== 'active' || updated.role !== 'admin') &&
        !state.members.some(
          (m) => m.id !== updated.id && m.status === 'active' && m.role === 'admin',
        )
      )
        conflict('Mantenha pelo menos um administrador ativo.');
      data.member = updated;
      break;
    }
  }
  return data;
}
